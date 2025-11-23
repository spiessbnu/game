import OpenAI from 'openai';
import { GameState, ModelResponse } from '../types';
import { SYSTEM_PROMPT } from '../constants';

let openai: OpenAI | null = null;
let cachedApiKey: string | null = null;

export function setApiKey(apiKey: string): void {
  if (apiKey && apiKey !== cachedApiKey) {
    openai = new OpenAI({ apiKey });
    cachedApiKey = apiKey;
  }
}

function sanitizeGameState(state: GameState): GameState {
  return {
    ...state,
    timeline: state.timeline.map((entry) => ({
      ...entry,
      meta: { ...entry.meta, html: undefined },
    })),
  };
}

function repairJson(malformedJson: string): string {
  try {
    return JSON.stringify(JSON.parse(malformedJson));
  } catch {
    let json = malformedJson
      .replace(/,(\s*[\]}])/g, '$1')
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?,?\s*:/g, '"$2":')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    try {
      return JSON.stringify(JSON.parse(json));
    } catch {
      return malformedJson;
    }
  }
}

export async function sendMessageToOpenAI(
  gameState: GameState,
  userInput: string
): Promise<ModelResponse> {
  const sanitizedState = sanitizeGameState(gameState);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: JSON.stringify({ gameState: sanitizedState, userInput }),
    },
  ];

  if (!openai) {
    return {
      reply:
        'Sistema não configurado. Por favor, defina a chave API no início da aplicação.',
      newState: gameState,
      error: null,
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content || '';
    const [firstLine, ...rest] = content.split('\n');
    const reply = firstLine.trim();
    let json = rest.join('\n').trim();
    try {
      return {
        reply,
        newState: JSON.parse(json),
        error: null,
      };
    } catch {
      json = repairJson(json);
      try {
        return {
          reply,
          newState: JSON.parse(json),
          error: null,
        };
      } catch (err) {
        console.error('Error parsing JSON:', err);
        return {
          reply,
          newState: gameState,
          error: err as Error,
        };
      }
    }
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    return {
      reply: 'Ocorreu um erro ao enviar a mensagem para a OpenAI.',
      newState: gameState,
      error,
    };
  }
}
