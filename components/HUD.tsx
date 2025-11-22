import React from 'react';
import { Zap, Clock, RotateCcw } from 'lucide-react';

interface HUDProps {
  time: number;
  entropy: number;
  onRestart?: () => void;
}

const HUD: React.FC<HUDProps> = ({ time, entropy, onRestart }) => {
  
  // Format decimal minutes to MM:SS
  const minutes = Math.floor(time);
  const seconds = Math.floor((time - minutes) * 60);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  // Calculate urgency color based on 10 min limit
  const timeColor = time > 8 ? 'text-red-500 animate-pulse' : time > 5 ? 'text-amber-400' : 'text-cyan-400';

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900/90 border-r border-gray-800 w-48 flex-shrink-0 h-full backdrop-blur-md">
      
      {/* Title / Brand */}
      <div className="mb-4 border-b border-gray-800 pb-4">
        <h1 className="text-xs font-bold text-gray-500 tracking-[0.2em] uppercase">ChronoRail</h1>
        <div className="text-[10px] text-gray-600">Entropy Protocol v2.1</div>
      </div>

      {/* Timer Module */}
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 shadow-inner relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-900 to-transparent opacity-50"></div>
        <div className="flex items-center gap-2 mb-2 text-gray-400 text-[10px] uppercase tracking-widest font-mono">
          <Clock size={12} /> Global Time
        </div>
        <div className={`text-3xl font-mono font-bold tracking-tighter ${timeColor} transition-colors duration-500`}>
          {formattedTime}
        </div>
        <div className="mt-3 h-1 w-full bg-gray-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-current transition-all duration-1000 ease-linear" 
              style={{ width: `${Math.min((time / 10) * 100, 100)}%` }}
            />
        </div>
      </div>

      {/* Entropy Module */}
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 shadow-inner group relative">
        <div className="flex items-center gap-2 mb-2 text-amber-500 text-[10px] uppercase tracking-widest font-mono">
          <Zap size={12} className="group-hover:animate-bounce" /> Entropy
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-mono font-bold text-amber-400">{entropy}</span>
          <span className="text-[10px] text-gray-600 mb-1.5">PTS</span>
        </div>
        
        {/* Visual noise for entropy */}
        <div className="absolute bottom-2 right-2 flex gap-0.5 opacity-20">
            {[...Array(5)].map((_, i) => (
                <div key={i} className={`w-0.5 h-${Math.floor(Math.random() * 4) + 2} bg-amber-500`}></div>
            ))}
        </div>
      </div>
      
      <div className="mt-auto space-y-4">
         <div className="text-[9px] text-gray-700 font-mono leading-relaxed">
          WARNING: Temporal divergence detected. Maintain causality within tolerance parameters.
        </div>

        {onRestart && (
          <button 
            onClick={() => {
              if(window.confirm("RESET TIMELINE? Current progress will be lost.")) {
                onRestart();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-800 hover:bg-red-900/50 border border-gray-700 hover:border-red-800 text-gray-400 hover:text-red-400 text-xs font-mono rounded transition-colors"
          >
            <RotateCcw size={12} /> RESTART LOOP
          </button>
        )}
      </div>
    </div>
  );
};

export default HUD;