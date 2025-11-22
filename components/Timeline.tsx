import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Scene, JumpCost } from '../types';
import { GitCommit, X, RotateCcw, Play } from 'lucide-react';

interface TimelineProps {
  scenes: Scene[];
  currentSceneId: string;
  jumpCosts: JumpCost[];
  onJump: (sceneId: string, cost: number) => void;
  entropyPoints: number;
  currentTime: number;
}

const Timeline: React.FC<TimelineProps> = ({ scenes, currentSceneId, jumpCosts, onJump, entropyPoints, currentTime }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  const { processedScenes, totalWidth } = useMemo(() => {
    const timeScale = 120; // Espaçamento horizontal
    
    const sortedScenes = [...scenes].sort((a, b) => a.timestamp_min - b.timestamp_min);

    const nodes = sortedScenes.map((scene, index) => ({
      ...scene,
      x: scene.timestamp_min * timeScale + 80,
      y: 90 // Altura centralizada
    }));

    const maxX = nodes.length > 0 ? nodes[nodes.length - 1].x : 0;
    
    return {
      processedScenes: nodes,
      totalWidth: Math.max(maxX + 200, window.innerWidth)
    };
  }, [scenes]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        left: containerRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [processedScenes.length, currentSceneId]);

  // Calcula custo para a cena selecionada
  const getJumpCost = (scene: Scene) => {
    let localCost = Math.ceil((currentTime - scene.timestamp_min) * 0.5);
    if (localCost < 0) localCost = 0;
    return localCost;
  };

  return (
    <div className="w-full h-56 bg-gray-950 border-b border-gray-800 flex flex-col relative shadow-lg transition-all z-30">
      <div className="absolute top-2 left-4 text-xs text-gray-500 font-mono tracking-widest uppercase flex items-center gap-2 z-20">
        <GitCommit size={14} /> Chrono-Linear Feed
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin relative bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] flex items-center"
      >
        <svg 
          width={totalWidth} 
          height="224" 
          className="absolute top-0 left-0 pointer-events-none"
        >
          {/* Eixo Principal */}
          <line x1={40} y1={90} x2={totalWidth} y2={90} stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />

          {/* Linhas de Grade (Tempo) */}
          {[...Array(20)].map((_, i) => (
             <g key={`grid-${i}`}>
               <line 
                 x1={i * 120 + 80} 
                 y1={0} 
                 x2={i * 120 + 80} 
                 y2={224} 
                 stroke="#1f2937" 
                 strokeWidth="1" 
                 strokeDasharray="4 4"
                 opacity="0.3"
               />
               <text x={i * 120 + 85} y={210} fill="#374151" fontSize="10" fontFamily="monospace">{i}m</text>
             </g>
          ))}

          {/* Conexões entre nós */}
          {processedScenes.map((scene, i) => {
            if (i === 0) return null;
            const prev = processedScenes[i-1];
            return (
               <line
                 key={`link-${scene.id}`}
                 x1={prev.x}
                 y1={prev.y}
                 x2={scene.x}
                 y2={scene.y}
                 stroke={scene.theme_color || '#22d3ee'}
                 strokeWidth="2"
                 opacity="0.8"
               />
            );
          })}
        </svg>

        {/* Nós Interativos */}
        {processedScenes.map((scene) => {
          const isCurrent = scene.id === currentSceneId;
          const isPast = scene.timestamp_min < currentTime;
          
          return (
            <div 
              key={scene.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-10"
              style={{ left: scene.x, top: scene.y }}
            >
               {/* Botão do Nó */}
               <button
                  onClick={() => setSelectedScene(scene)}
                  className={`
                    rounded-full border-2 transition-all duration-300 flex items-center justify-center relative
                    ${isCurrent ? 'w-6 h-6 bg-gray-950 shadow-[0_0_15px_currentColor] scale-110 z-20' : 'w-4 h-4 bg-gray-900 hover:scale-150 hover:z-20'}
                    ${isPast ? 'cursor-pointer hover:brightness-125 ring-0 hover:ring-2 hover:ring-cyan-500/50' : isCurrent ? 'cursor-default' : 'opacity-50'}
                  `}
                  style={{ 
                    borderColor: scene.theme_color || '#22d3ee',
                    backgroundColor: isCurrent ? '#000' : '#111'
                  }}
               >
                 {isCurrent && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
               </button>

               {/* Label de Tempo (Abaixo do nó) */}
               <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-gray-600 whitespace-nowrap pointer-events-none">
                 {scene.timestamp_min.toFixed(1)}m
               </div>
            </div>
          );
        })}
        
        {/* Future Ghost Line */}
        <div className="absolute top-[90px] left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-900/20 to-transparent pointer-events-none"></div>
      </div>

      {/* SCENE INSPECTOR MODAL (POP-UP) */}
      {selectedScene && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-cyan-500/30 rounded-lg shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
                <button 
                    onClick={() => setSelectedScene(null)}
                    className="absolute top-3 right-3 text-gray-500 hover:text-white"
                >
                    <X size={20} />
                </button>

                <div className="mb-4 flex items-center gap-3 border-b border-gray-800 pb-3">
                    <div className="bg-cyan-900/20 p-2 rounded-full text-cyan-400">
                        <GitCommit size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-cyan-400 tracking-wider uppercase">Node Inspection</h3>
                        <div className="text-xs text-gray-500 font-mono">Timestamp: {selectedScene.timestamp_min.toFixed(1)}m</div>
                    </div>
                </div>

                <div className="bg-gray-950 p-4 rounded border-l-2 border-gray-700 mb-6">
                    <p className="text-sm text-gray-300 italic leading-relaxed">
                        "{selectedScene.descricao_estado_mundo || selectedScene.acoes_do_jogador}"
                    </p>
                </div>

                <div className="flex gap-3">
                    {selectedScene.timestamp_min < currentTime ? (
                        <button 
                            onClick={() => {
                                const cost = getJumpCost(selectedScene);
                                if (entropyPoints >= cost) {
                                    onJump(selectedScene.id, cost);
                                    setSelectedScene(null);
                                } else {
                                    alert("Insufficient Entropy Points");
                                }
                            }}
                            disabled={entropyPoints < getJumpCost(selectedScene)}
                            className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 disabled:text-gray-600 text-white text-xs font-bold py-3 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                        >
                            <RotateCcw size={16} />
                            <span>REVERT REALITY (-{getJumpCost(selectedScene)} PTS)</span>
                        </button>
                    ) : (
                        <div className="flex-1 bg-gray-800 text-gray-500 text-xs font-bold py-3 px-4 rounded flex items-center justify-center gap-2 cursor-not-allowed">
                            <span>CURRENT REALITY</span>
                        </div>
                    )}

                    <button 
                        onClick={() => setSelectedScene(null)}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold py-3 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                    >
                        <Play size={16} />
                        <span>CONTINUE TIMELINE</span>
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;