import { GoogleGenAI } from "@google/genai";
import { GameState, AIResponse, GameMode, Scene } from "../types";
import { SYSTEM_PROMPT } from "../constants";

// Initialize Gemini Client
// NOTE: Relying on process.env.API_KEY as per instructions.
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

export const sendMessageToGemini = async (
  gameState: GameState,
  userInput: string,
  mode: GameMode = 'acoes',
  targetSceneId?: string
): Promise<AIResponse> => {
  
  if (!apiKey) {
    return createMockResponse(gameState);
  }

  try {
    const model = "gemini-2.5-flash"; 
    
    const payload = {
      game_state: gameState,
      entrada_jogador: userInput,
      modo: mode,
      ...(targetSceneId && { cena_destino_id: targetSceneId })
    };

    const response = await ai.models.generateContent({
      model: model,
      contents: JSON.stringify(payload),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7, 
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");

    return parseResponse(text);

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

function sanitizeGameState(state: any): GameState {
  if (!state) return state;

  // Helper to ensure value is a string (fixes React Error #31 if LLM returns object)
  const ensureString = (val: any): string => {
    if (typeof val === 'string') return val;
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      // If LLM returns an object (e.g. choices map), convert keys to string
      return Object.keys(val).join(', ');
    }
    return String(val);
  };

  // Sanitize Scenes
  if (Array.isArray(state.cenas)) {
    state.cenas = state.cenas.map((scene: any) => ({
      ...scene,
      id: String(scene.id),
      acoes_do_jogador: ensureString(scene.acoes_do_jogador),
      descricao_estado_mundo: ensureString(scene.descricao_estado_mundo),
      branch_label: ensureString(scene.branch_label),
      log_eventos: Array.isArray(scene.log_eventos) ? scene.log_eventos.map(ensureString) : [],
      theme_color: scene.theme_color || '#22d3ee'
    }));
  }

  return state as GameState;
}

// Tries to fix common JSON errors from LLMs
function attemptJSONRepair(jsonString: string): string {
  let repaired = jsonString;
  
  // Fix: Objects inside arrays missing keys (common Gemini issue)
  // ex: { "some_id", "timestamp"... } -> { "cena_id": "some_id", "timestamp"... }
  // This specific regex targets the jump costs array pattern if malformed
  repaired = repaired.replace(
    /\{\s*"([a-zA-Z0-9_]+)"\s*,\s*"timestamp_min"/g, 
    '{ "cena_id": "$1", "timestamp_min"'
  );

  return repaired;
}

function parseResponse(rawText: string): AIResponse {
  let narrative = "";
  let jsonString = "";

  // 1. Extract Narrative
  // Look for [NARRATIVA] tag
  const narrativeMatch = rawText.match(/\[NARRATIVA\]([\s\S]*?)(?=\[ESTADO\]|```|$)/i);
  if (narrativeMatch) {
    narrative = narrativeMatch[1].trim();
  } else {
    // Fallback: Assume everything before the first code block or open brace is narrative
    const splitIdx = rawText.search(/```|{/);
    if (splitIdx !== -1) {
      narrative = rawText.substring(0, splitIdx).trim();
    } else {
      // Very edge case: text only?
      narrative = rawText;
    }
  }

  // 2. Extract JSON State
  // Try finding a code block first
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    jsonString = codeBlockMatch[1];
  } else {
    // Fallback: Try to find the outermost curly braces
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonString = rawText.substring(firstBrace, lastBrace + 1);
    }
  }

  if (!jsonString) {
    console.error("Parse Failure - Raw Text:", rawText);
    throw new Error("Failed to parse game state from LLM response: No JSON found.");
  }

  try {
    const jsonState = JSON.parse(jsonString);
    
    // Sanitize the state to prevent UI crashes
    if (jsonState.game_state_atualizado) {
      jsonState.game_state_atualizado = sanitizeGameState(jsonState.game_state_atualizado);
    }
    
    return {
      narrativa: narrative || "...",
      estado: jsonState
    };
  } catch (e) {
    console.warn("Initial JSON parse failed, attempting repair...", e);
    
    try {
      const repairedJSON = attemptJSONRepair(jsonString);
      const jsonState = JSON.parse(repairedJSON);
      
      if (jsonState.game_state_atualizado) {
        jsonState.game_state_atualizado = sanitizeGameState(jsonState.game_state_atualizado);
      }
      return {
        narrativa: narrative || "...",
        estado: jsonState
      };
    } catch (finalError) {
      console.error("JSON Parse Error:", finalError);
      console.error("Bad JSON String:", jsonString);
      throw new Error("Failed to parse game state from LLM response: Invalid JSON syntax.");
    }
  }
}

function createMockResponse(currentState: GameState): AIResponse {
  const newTime = currentState.tempo_atual_min + 1;
  return {
    narrativa: "ALERTA DE SISTEMA: API_KEY não encontrada. O motor narrativo está rodando em modo de simulação limitado.\n\n(Simulação): Agente K, o túnel fica para trás. As luzes do vagão 4 se estabilizam. A Sra. Marta (1A) tosse levemente. O Sr. Cavendish (2B) limpa o suor da testa com um lenço de seda.",
    estado: {
      game_state_atualizado: {
        ...currentState,
        tempo_atual_min: newTime,
        cena_atual_id: `mock_scene_${Date.now()}`,
        cenas: [
          ...currentState.cenas,
          {
            id: `mock_scene_${Date.now()}`,
            parent_id: currentState.cena_atual_id,
            timestamp_min: newTime,
            branch_label: "simulacao",
            branch_id: "main",
            theme_color: "#6b7280",
            descricao_estado_mundo: "Modo de simulação offline.",
            log_eventos: ["Erro de conexão com IA"],
            acoes_do_jogador: "debug",
            flags: currentState.flags_globais
          }
        ],
        metanarrativa: currentState.metanarrativa
      },
      custos_salto_temporal: []
    }
  };
}
