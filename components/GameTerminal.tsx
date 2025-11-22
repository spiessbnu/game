import React, { useRef, useEffect, useState } from 'react';
import { Send, ChevronRight, Terminal } from 'lucide-react';

interface HistoryEntry {
    type: 'ai' | 'user';
    text: string;
    themeColor?: string;
  }

interface GameTerminalProps {
  narrativeHistory: HistoryEntry[];
  onSend: (text: string) => void;
  loading: boolean;
  gameOver?: boolean;
}

const GameTerminal: React.FC<GameTerminalProps> = ({ narrativeHistory, onSend, loading, gameOver = false }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [narrativeHistory, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading && !gameOver) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 relative">
      {/* CRT Scanline Effect Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%] opacity-20"></div>

      {/* History Area */}
      <div className="flex-1 overflow-y-auto p-6 font-mono text-sm md:text-base space-y-6 scrollbar-thin relative z-10" ref={scrollRef}>
        {narrativeHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-50">
                <Terminal size={48} className="mb-4" />
                <p>INITIALIZING CHRONORAIL SYSTEM...</p>
            </div>
        )}
        
        {narrativeHistory.map((entry, idx) => {
            const borderColor = entry.themeColor || '#374151';
            
            return (
                <div 
                    key={idx} 
                    className={`flex ${entry.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div 
                    className={`max-w-[80%] p-4 rounded-lg border-l-4 ${
                        entry.type === 'user' 
                        ? 'bg-gray-900 text-gray-300' 
                        : 'bg-gray-900/50 text-gray-100'
                    }`}
                    style={{ borderLeftColor: borderColor }}
                    >
                    {entry.type === 'ai' ? (
                        <div className="whitespace-pre-wrap leading-relaxed">{entry.text}</div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <ChevronRight size={16} className="text-gray-500" />
                            {entry.text}
                        </div>
                    )}
                    </div>
                </div>
            );
        })}
        
        {loading && (
          <div className="flex justify-start">
             <div className="max-w-[80%] p-4 rounded-lg bg-gray-900/50 border border-cyan-900/30 flex items-center gap-2">
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 bg-gray-900 border-t border-gray-800 z-10 flex gap-2">
        <div className="relative flex-1">
            <ChevronRight className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={gameOver ? "SIMULATION TERMINATED" : "Intervene in the timeline..."}
            className="w-full bg-gray-950 text-gray-200 border border-gray-700 rounded pl-10 pr-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono transition-all disabled:opacity-50 disabled:bg-gray-900"
            disabled={loading || gameOver}
            autoFocus
            />
        </div>
        <button
          type="submit"
          disabled={loading || !input.trim() || gameOver}
          className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 rounded transition-colors flex items-center justify-center border border-gray-700"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default GameTerminal;
