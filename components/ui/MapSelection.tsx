import React from 'react';
import { ArrowRight, ChevronLeft, Infinity as InfinityIcon } from 'lucide-react';
import { MAPS } from '../../config/constants';
import { GameMap, PlayerProgress } from '../../types/index';

interface MapSelectionProps {
    progress: PlayerProgress;
    onSelectMap: (map: GameMap) => void;
    onBack: () => void;
    mode?: 'STANDARD' | 'ENDLESS';
}

export const MapSelection: React.FC<MapSelectionProps> = ({ progress, onSelectMap, onBack, mode = 'STANDARD' }) => {
  return (
    <main className="max-w-6xl mx-auto p-6 md:p-8 animate-in slide-in-from-right-8">
        <button 
            onClick={onBack}
            className="flex items-center gap-2 text-neutral-400 hover:text-white mb-6 transition"
        >
            <ChevronLeft className="w-5 h-5" /> Back to Command
        </button>

        <div className="flex items-baseline gap-4 mb-8">
             <h2 className="text-3xl font-title text-white">
                {mode === 'ENDLESS' ? 'ENDLESS OPERATIONS' : 'DEPLOYMENT ZONES'}
             </h2>
             {mode === 'ENDLESS' && (
                 <span className="text-indigo-400 text-sm font-bold flex items-center gap-1">
                     <InfinityIcon className="w-4 h-4" /> Infinite Waves
                 </span>
             )}
        </div>

        {/* Map Selector */}
        <div className="flex flex-col md:block">
            <div className="md:hidden flex items-center gap-2 text-neutral-500 text-xs mb-2">
                <ArrowRight className="w-4 h-4" /> 
                <span>Swipe to see more maps</span>
            </div>
            
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 md:pb-0 md:grid md:grid-cols-3 md:overflow-visible no-scrollbar">
                {MAPS.map((map) => {
                    const isCompleted = progress.completedMaps.includes(map.id);
                    return (
                        <button
                        key={map.id}
                        onClick={() => onSelectMap(map)}
                        className={`snap-center shrink-0 w-[85vw] md:w-auto group relative h-64 bg-neutral-900 rounded-lg overflow-hidden border-2 transition-all duration-300 text-left ${
                            mode === 'ENDLESS' 
                            ? 'border-indigo-900 hover:border-indigo-500' 
                            : 'border-neutral-800 hover:border-red-600'
                        }`}
                        >
                        {/* Map Preview Visualization (Abstract) */}
                        <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity" style={{ backgroundColor: map.background }}>
                            <svg width="100%" height="100%" viewBox="0 0 800 600" className="w-full h-full">
                                <path 
                                    d={`M ${map.path.map(p => `${p.x},${p.y}`).join(' L ')}`} 
                                    fill="none" 
                                    stroke="#000" 
                                    strokeWidth="80" 
                                    strokeOpacity="0.5"
                                />
                                <path 
                                    d={`M ${map.path.map(p => `${p.x},${p.y}`).join(' L ')}`} 
                                    fill="none" 
                                    stroke="#fff" 
                                    strokeWidth="5" 
                                    strokeOpacity="0.2"
                                    strokeDasharray="20,20"
                                />
                            </svg>
                        </div>

                        {isCompleted && mode === 'STANDARD' && (
                            <div className="absolute top-4 right-4 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded shadow z-10">
                                CLEARED
                            </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                            <h3 className={`text-2xl font-bold text-white transition-colors ${
                                mode === 'ENDLESS' ? 'group-hover:text-indigo-400' : 'group-hover:text-red-500'
                            }`}>
                                {map.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    map.difficulty === 'EASY' ? 'bg-green-900 text-green-300' :
                                    map.difficulty === 'MEDIUM' ? 'bg-yellow-900 text-yellow-300' :
                                    map.difficulty === 'HARD' ? 'bg-red-900 text-red-300' : 
                                    'bg-purple-900 text-purple-300'
                                }`}>
                                    {map.difficulty}
                                </span>
                                <span className="text-neutral-400 text-sm">
                                    {mode === 'ENDLESS' ? '∞ Waves' : `${map.waves} Waves`}
                                </span>
                            </div>
                        </div>
                        </button>
                    );
                })}
            </div>
        </div>
    </main>
  );
};