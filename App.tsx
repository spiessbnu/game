import React, { useState, useEffect, useCallback } from 'react';
import { INITIAL_GAME_STATE } from './constants';
import { GameState, JumpCost, Scene } from './types';
import { sendMessageToOpenAI, setApiKey } from './services/openaiService';
import Timeline from './components/Timeline';
import HUD from './components/HUD';
import GameTerminal from './components/GameTerminal';
import { CheckCircle, Skull } from 'lucide-react';

// Tipo auxiliar para histórico de mensagens, suportando codificação por cor.
interface HistoryEntry {
  type: 'ai' | 'user';
  text: string;
  themeColor?: string;
}

// Status geral do jogo: em andamento, vitória ou derrota.
type GameStatus = 'playing' | 'won' | 'lost';

const App: React.FC = () => {
  // Estado principal do jogo e históricos visuais.
  const [gameState, setGameState] = useState<GameState>(JSON.parse(JSON.stringify(INITIAL_GAME_STATE)));
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [jumpCosts, setJumpCosts] = useState<JumpCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [finalNarrative, setFinalNarrative] = useState<string>('');

  // Ao montar o componente, solicita a chave da API ao usuário. Se fornecida,
  // inicializa o cliente da OpenAI; caso contrário, o jogo roda em modo de
  // simulação. Essa ação ocorre apenas uma vez.
  useEffect(() => {
    const key = window.prompt('Insira sua chave da OpenAI (gpt-4o-mini) para iniciar:');
    if (key) {
      setApiKey(key.trim());
    }
  }, []);

  // Obtém a cor associada à cena atual.
  const getCurrentColor = (state: GameState) => {
    const currentScene = state.cenas[state.cenas.length - 1];
    return currentScene?.theme_color || '#22d3ee';
  };

  // Mescla cenas antigas e novas mantendo somente a cena mais recente da IA.
  const mergeScenes = (currentScenes: Scene[], aiScenes: Scene[]): Scene[] => {
    if (!aiScenes || aiScenes.length === 0) return currentScenes;
    const newLatestScene = aiScenes[aiScenes.length - 1];
    const preservedPast = currentScenes.filter(scene => scene.timestamp_min < newLatestScene.timestamp_min);
    return [...preservedPast, newLatestScene];
  };

  // Monitora condições de vitória ou derrota a cada atualização de estado.
  useEffect(() => {
    if (gameState.flags_globais.bomba_desarmada) {
      setGameStatus('won');
    } else if (gameState.tempo_atual_min >= 10.0) {
      setGameStatus('lost');
    } else {
      setGameStatus('playing');
    }
  }, [gameState]);

  // Inicializa o jogo chamando o modelo para a narrativa de introdução.
  const initGame = useCallback(async (isRestart = false) => {
    if (initialized && !isRestart) return;
    setLoading(true);
    setGameStatus('playing');
    setFinalNarrative('');
    const stateToUse = isRestart ? JSON.parse(JSON.stringify(INITIAL_GAME_STATE)) : gameState;
    if (isRestart) {
      setGameState(stateToUse);
      setHistory([]);
      setJumpCosts([]);
    }
    try {
      // Primeira chamada para definir a cena inicial
      const response = await sendMessageToOpenAI(stateToUse, 'Start Game', 'acoes');
      setGameState(response.estado.game_state_atualizado);
      const color = response.estado.game_state_atualizado.cenas[0]?.theme_color || '#22d3ee';
      setHistory([{ type: 'ai', text: response.narrativa, themeColor: color }]);
      setJumpCosts(response.estado.custos_salto_temporal);
      setInitialized(true);
    } catch (error) {
      setHistory([{ type: 'ai', text: 'SYSTEM FAILURE: Unable to connect to Timeline Engine (OpenAI API). Check your API Key configuration.' }]);
    } finally {
      setLoading(false);
    }
  }, [gameState, initialized]);

  // Chama a inicialização quando o componente monta.
  useEffect(() => {
    initGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Envia entrada do usuário para a IA durante o modo normal de jogo.
  const handleUserInput = async (text: string) => {
    if (gameStatus !== 'playing') return;
    setLoading(true);
    const currentColor = getCurrentColor(gameState);
    setHistory(prev => [...prev, { type: 'user', text, themeColor: currentColor }]);
    try {
      const response = await sendMessageToOpenAI(gameState, text, 'acoes');
      const aiState = response.estado.game_state_atualizado;
      const mergedScenes = mergeScenes(gameState.cenas, aiState.cenas);
      setGameState({ ...aiState, cenas: mergedScenes });
      setJumpCosts(response.estado.custos_salto_temporal);
      const lastScene = mergedScenes[mergedScenes.length - 1];
      const newColor = lastScene?.theme_color || '#22d3ee';
      setHistory(prev => [...prev, { type: 'ai', text: response.narrativa, themeColor: newColor }]);
      // Captura narrativa final para tela de encerramento
      if (aiState.flags_globais.bomba_desarmada || aiState.tempo_atual_min >= 10.0) {
        setFinalNarrative(response.narrativa);
      }
    } catch (error) {
      console.error(error);
      setHistory(prev => [...prev, { type: 'ai', text: 'Error: Temporal transmission interrupted.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Lida com saltos temporais, descontando custo de entropia e atualizando o estado.
  const handleTimeJump = async (targetSceneId: string, cost: number) => {
    if (gameState.pontos_entropia < cost) return;
    setLoading(true);
    setHistory(prev => [
      ...prev,
      {
        type: 'user',
        text: `<< TEMPORAL JUMP >> Rewriting reality from Node [${targetSceneId.substring(0, 6)}...]`,
        themeColor: '#fbbf24'
      }
    ]);
    try {
      const targetScene = gameState.cenas.find(s => s.id === targetSceneId);
      const jumpState = {
        ...gameState,
        cena_atual_id: targetSceneId,
        tempo_atual_min: targetScene ? targetScene.timestamp_min : 0
      };
      const response = await sendMessageToOpenAI(jumpState, 'voltar_para_cena', 'salto_temporal', targetSceneId);
      const aiState = response.estado.game_state_atualizado;
      // Garante que a mecânica de entropia seja aplicada caso a IA não desconte corretamente.
      if (aiState.pontos_entropia === gameState.pontos_entropia) {
        aiState.pontos_entropia = Math.max(0, gameState.pontos_entropia - cost);
      }
      const mergedScenes = mergeScenes(gameState.cenas, aiState.cenas);
      setGameState({ ...aiState, cenas: mergedScenes });
      setJumpCosts(response.estado.custos_salto_temporal);
      if (aiState.tempo_atual_min < 10.0) {
        setGameStatus('playing');
        setFinalNarrative('');
      }
      const lastScene = mergedScenes[mergedScenes.length - 1];
      const newColor = lastScene?.theme_color || '#22d3ee';
      setHistory(prev => [
        ...prev,
        {
          type: 'ai',
          text: `[TIMELINE ALTERED]\n${response.narrativa}`,
          themeColor: newColor
        }
      ]);
    } catch (error) {
      setHistory(prev => [...prev, { type: 'ai', text: 'Error: Jump failed.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Reinicia o jogo com estado limpo.
  const handleRestart = () => {
    initGame(true);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-950 text-gray-200 font-sans overflow-hidden selection:bg-cyan-500 selection:text-black relative">
      {/* SOBREPOSIÇÕES DE FIM DE JOGO */}
      {gameStatus === 'won' && (
        <div className="absolute inset-0 z-50 bg-green-900/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-gray-900 border-2 border-green-500 p-8 rounded-lg shadow-[0_0_50px_rgba(34,197,94,0.3)] max-w-2xl w-full text-center animate-in fade-in zoom-in duration-300 overflow-y-auto max-h-full">
            <CheckCircle className="mx-auto mb-4 text-green-500 w-16 h-16" />
            <h2 className="text-3xl font-bold text-green-400 mb-2 tracking-widest uppercase">Mission Accomplished</h2>
            <div className="bg-gray-800/50 p-4 rounded border-l-4 border-green-500 text-left mb-6 font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {finalNarrative || 'The timeline has been successfully stabilized.'}
            </div>
            <p className="text-gray-400 mb-6 font-mono">Casualty count: 0. Timeline coherence: 100%.</p>
            <button onClick={handleRestart} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded transition-colors w-full font-mono uppercase">
              New Assignment
            </button>
          </div>
        </div>
      )}
      {gameStatus === 'lost' && (
        <div className="absolute inset-0 z-50 bg-red-950/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-gray-900 border-2 border-red-600 p-8 rounded-lg shadow-[0_0_50px_rgba(220,38,38,0.4)] max-w-2xl w-full text-center animate-in fade-in zoom-in duration-300 overflow-y-auto max-h-full">
            <Skull className="mx-auto mb-4 text-red-600 w-16 h-16 animate-pulse" />
            <h2 className="text-3xl font-bold text-red-500 mb-2 tracking-widest uppercase">Critical Failure</h2>
            <div className="bg-gray-800/50 p-4 rounded border-l-4 border-red-600 text-left mb-6 font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {finalNarrative || 'Explosion detected at 10:00. Signal lost.'}
            </div>
            <p className="text-gray-400 mb-6 font-mono">Agent K status: TERMINATED.</p>
            <div className="flex flex-col gap-3">
              {gameState.pontos_entropia > 0 && <div className="text-xs text-amber-500 font-mono mb-1">TEMPORAL ENERGY AVAILABLE: {gameState.pontos_entropia} PTS</div>}
              <button onClick={handleRestart} className="bg-red-900/50 hover:bg-red-800 border border-red-700 text-red-200 font-bold py-3 px-6 rounded transition-colors w-full font-mono uppercase">
                Reset Simulation
              </button>
              {gameState.pontos_entropia > 0 && <p className="text-[10px] text-gray-500 mt-2">(Tip: Use the Timeline above to rewind if you have entropy points)</p>}
            </div>
          </div>
        </div>
      )}
      {/* VISUALIZADOR DE LINHA DO TEMPO */}
      <div className="flex-shrink-0 z-20">
        <Timeline scenes={gameState.cenas} currentSceneId={gameState.cena_atual_id} jumpCosts={jumpCosts} entropyPoints={gameState.pontos_entropia} currentTime={gameState.tempo_atual_min} onJump={handleTimeJump} />
      </div>
      {/* HUD */}
      <div className="flex-shrink-0">
        <HUD
          entropyPoints={gameState.pontos_entropia}
          time={gameState.tempo_atual_min}
          onJump={handleTimeJump}
          jumpCosts={jumpCosts}
          currentSceneId={gameState.cena_atual_id}
        />
      </div>
      {/* TERMINAL DE COMANDO */}
      <div className="flex-1">
        <GameTerminal narrativeHistory={history} onSend={handleUserInput} loading={loading} gameOver={gameStatus !== 'playing'} />
      </div>
    </div>
  );
};

export default App;
