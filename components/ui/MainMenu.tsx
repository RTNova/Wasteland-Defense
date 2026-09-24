import React, { useState } from 'react';
import { BookOpen, Map as MapIcon, ShoppingBag, Terminal, Infinity as InfinityIcon, Trophy } from 'lucide-react';
import { soundManager, SoundSettings } from '../../config/soundManager';
import { SoundSettingsPanel } from './SoundSettingsPanel';

type ViewState = 'MENU' | 'MAP_SELECT' | 'SHOP' | 'BESTIARY' | 'ACHIEVEMENTS';

interface MainMenuProps {
    onNavigate: (view: ViewState, mode?: 'STANDARD' | 'ENDLESS') => void;
    isDevMode: boolean;
    onToggleDevMode: () => void;
    soundSettings?: SoundSettings;
    onUpdateSoundSettings?: (settings: Partial<SoundSettings>) => void;
    unlockedAchievementsCount?: number;
    totalAchievementsCount?: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({ 
  onNavigate, 
  isDevMode, 
  onToggleDevMode,
  soundSettings: externalSoundSettings,
  onUpdateSoundSettings: externalOnUpdateSoundSettings,
  unlockedAchievementsCount = 0,
  totalAchievementsCount = 12
}) => {
  const [internalSoundSettings, setInternalSoundSettings] = useState<SoundSettings>(() => soundManager.getSettings());

  const currentSettings = externalSoundSettings || internalSoundSettings;

  const handleSoundUpdate = (updated: Partial<SoundSettings>) => {
    const saved = soundManager.saveSettings(updated);
    setInternalSoundSettings(saved);
    if (externalOnUpdateSoundSettings) {
      externalOnUpdateSoundSettings(updated);
    }
    soundManager.playClick();
  };

  const handleNavClick = (view: ViewState, mode?: 'STANDARD' | 'ENDLESS') => {
    soundManager.playClick();
    onNavigate(view, mode);
  };
  return (
    <main className="max-w-md mx-auto p-6 h-full flex flex-col justify-center animate-in fade-in zoom-in duration-500">
        
        <div className="grid gap-4">
            
            {/* Play Button (Standard) */}
            <button 
                onClick={() => handleNavClick('MAP_SELECT', 'STANDARD')}
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
                onClick={() => handleNavClick('MAP_SELECT', 'ENDLESS')}
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

            <div className="grid grid-cols-3 gap-3 mt-2">
                {/* Bestiary Button */}
                <button 
                    onClick={() => handleNavClick('BESTIARY')}
                    className="group relative h-28 bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border-2 border-slate-600 shadow-lg hover:-translate-y-1 transition-transform overflow-hidden flex flex-col items-center justify-center gap-2 p-2"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="relative">
                        <BookOpen className="w-7 h-7 text-slate-300 drop-shadow-glow" />
                    </div>
                    <div className="text-center relative z-10">
                        <h3 className="text-sm font-bold text-white uppercase">Bestiary</h3>
                        <p className="text-[9px] text-slate-400">Intel</p>
                    </div>
                </button>

                {/* Achievements Button */}
                <button 
                    onClick={() => handleNavClick('ACHIEVEMENTS')}
                    className="group relative h-28 bg-gradient-to-b from-amber-900 to-amber-950 rounded-xl border-2 border-amber-600 shadow-lg hover:-translate-y-1 transition-transform overflow-hidden flex flex-col items-center justify-center gap-2 p-2"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="relative">
                        <Trophy className="w-7 h-7 text-amber-400 drop-shadow-glow" />
                    </div>
                    <div className="text-center relative z-10">
                        <h3 className="text-sm font-bold text-white uppercase">Badges</h3>
                        <p className="text-[9px] text-amber-300 font-mono">{unlockedAchievementsCount}/{totalAchievementsCount}</p>
                    </div>
                </button>

                {/* Shop Button */}
                <button 
                    onClick={() => handleNavClick('SHOP')}
                    className="group relative h-28 bg-gradient-to-b from-yellow-900 to-yellow-950 rounded-xl border-2 border-yellow-700 shadow-lg hover:-translate-y-1 transition-transform overflow-hidden flex flex-col items-center justify-center gap-2 p-2"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
                    <div className="relative">
                        <ShoppingBag className="w-7 h-7 text-yellow-300 drop-shadow-glow" />
                    </div>
                    <div className="text-center relative z-10">
                        <h3 className="text-sm font-bold text-white uppercase">Armory</h3>
                        <p className="text-[9px] text-yellow-400">Upgrades</p>
                    </div>
                </button>
            </div>
        </div>

        {/* Global Sound Settings Panel */}
        <div className="mt-6">
             <SoundSettingsPanel 
                 settings={currentSettings}
                 onUpdateSettings={handleSoundUpdate}
                 variant="card"
             />
        </div>

        <div className="mt-6 text-center flex flex-col items-center gap-3">
             <div className="inline-block px-4 py-1.5 bg-neutral-900 rounded-full border border-neutral-800 text-neutral-500 text-xs">
                 COMMANDER STATUS: ONLINE
             </div>

             <button 
                onClick={() => {
                    soundManager.playClick();
                    onToggleDevMode();
                }}
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