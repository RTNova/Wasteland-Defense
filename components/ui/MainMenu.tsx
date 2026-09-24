import React from 'react';
import { BookOpen, Map as MapIcon, ShoppingBag, Terminal, Infinity as InfinityIcon } from 'lucide-react';

type ViewState = 'MENU' | 'MAP_SELECT' | 'SHOP' | 'BESTIARY';

interface MainMenuProps {
    onNavigate: (view: ViewState, mode?: 'STANDARD' | 'ENDLESS') => void;
    isDevMode: boolean;
    onToggleDevMode: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onNavigate, isDevMode, onToggleDevMode }) => {
  return (
    <main className="max-w-md mx-auto p-6 h-full flex flex-col justify-center animate-in fade-in zoom-in duration-500">
        
        <div className="grid gap-4">
            
            {/* Play Button (Standard) */}
            <button 
                onClick={() => onNavigate('MAP_SELECT', 'STANDARD')}
                className="group relative h-28 bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl border-4 border-blue-700 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-105 transition-transform overflow-hidden flex items-center px-8"
            >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                <div className="bg-blue-950/50 p-3 rounded-full border-2 border-blue-400 mr-6 group-hover:rotate-12 transition-transform">
                    <MapIcon className="w-8 h-8 text-blue-200" />
                </div>
                <div className="text-left">
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-wider stroke-black drop-shadow-lg">Campaign</h2>
                    <p className="text-blue-200 text-xs font-bold">Standard Missions</p>
                </div>
            </button>

            {/* Endless Mode Button */}
            <button 
                onClick={() => onNavigate('MAP_SELECT', 'ENDLESS')}
                className="group relative h-28 bg-gradient-to-r from-indigo-900 to-purple-900 rounded-xl border-4 border-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:scale-105 transition-transform overflow-hidden flex items-center px-8"
            >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                <div className="bg-indigo-950/50 p-3 rounded-full border-2 border-indigo-400 mr-6 group-hover:rotate-180 transition-transform duration-700">
                    <InfinityIcon className="w-8 h-8 text-indigo-200" />
                </div>
                <div className="text-left">
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-wider stroke-black drop-shadow-lg">Endless Ops</h2>
                    <p className="text-indigo-200 text-xs font-bold">Infinite Scaling</p>
                </div>
            </button>

            <div className="grid grid-cols-2 gap-4 mt-2">
                {/* Bestiary Button */}
                <button 
                    onClick={() => onNavigate('BESTIARY')}
                    className="group relative h-32 bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border-2 border-slate-600 shadow-lg hover:-translate-y-1 transition-transform overflow-hidden flex flex-col items-center justify-center gap-3"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="relative">
                        <BookOpen className="w-10 h-10 text-slate-300 drop-shadow-glow" />
                    </div>
                    <div className="text-center relative z-10">
                        <h3 className="text-lg font-bold text-white uppercase">Bestiary</h3>
                        <p className="text-[10px] text-slate-400">Intel Database</p>
                    </div>
                </button>

                {/* Shop Button */}
                <button 
                    onClick={() => onNavigate('SHOP')}
                    className="group relative h-32 bg-gradient-to-b from-yellow-900 to-yellow-950 rounded-xl border-2 border-yellow-700 shadow-lg hover:-translate-y-1 transition-transform overflow-hidden flex flex-col items-center justify-center gap-3"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
                    <div className="relative">
                        <ShoppingBag className="w-10 h-10 text-yellow-300 drop-shadow-glow" />
                    </div>
                    <div className="text-center relative z-10">
                        <h3 className="text-lg font-bold text-white uppercase">Armory</h3>
                        <p className="text-[10px] text-yellow-400">Upgrades</p>
                    </div>
                </button>
            </div>
        </div>

        <div className="mt-8 text-center flex flex-col items-center gap-4">
             <div className="inline-block px-4 py-2 bg-neutral-900 rounded-full border border-neutral-800 text-neutral-500 text-xs">
                 COMMANDER STATUS: ONLINE
             </div>

             <button 
                onClick={onToggleDevMode}
                className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold border transition-all ${
                    isDevMode 
                    ? 'bg-green-900/20 border-green-500 text-green-500' 
                    : 'bg-neutral-900/50 border-neutral-800 text-neutral-600 hover:text-neutral-400'
                }`}
             >
                 <Terminal className="w-3 h-3" />
                 DEV MODE: {isDevMode ? 'ON' : 'OFF'}
             </button>
        </div>
    </main>
  );
};