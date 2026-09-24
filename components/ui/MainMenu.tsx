import React, { useState } from 'react';
import { BookOpen, Map as MapIcon, ShoppingBag, Terminal, Infinity as InfinityIcon, Trophy, User, Users, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { soundManager, SoundSettings } from '../../config/soundManager';
import { SoundSettingsPanel } from './SoundSettingsPanel';

type ViewState = 'MENU' | 'MAP_SELECT' | 'SHOP' | 'BESTIARY' | 'ACHIEVEMENTS' | 'PROFILES';

interface MainMenuProps {
    onNavigate: (view: ViewState, mode?: 'STANDARD' | 'ENDLESS') => void;
    isDevMode: boolean;
    onToggleDevMode: () => void;
    soundSettings?: SoundSettings;
    onUpdateSoundSettings?: (settings: Partial<SoundSettings>) => void;
    unlockedAchievementsCount?: number;
    totalAchievementsCount?: number;
    currentProfileName?: string;
    onSwitchProfile?: () => void;
    onDeleteCurrentProfile?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ 
  onNavigate, 
  isDevMode, 
  onToggleDevMode,
  soundSettings: externalSoundSettings,
  onUpdateSoundSettings: externalOnUpdateSoundSettings,
  unlockedAchievementsCount = 0,
  totalAchievementsCount = 12,
  currentProfileName,
  onSwitchProfile,
  onDeleteCurrentProfile
}) => {
  const [internalSoundSettings, setInternalSoundSettings] = useState<SoundSettings>(() => soundManager.getSettings());
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
        
        {/* Active Commander Profile Header */}
        {currentProfileName && (
          <div className="bg-neutral-900/90 border border-neutral-700/80 rounded-xl p-3 flex items-center justify-between shadow-xl mb-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-950/80 border border-blue-500/60 flex items-center justify-center text-blue-400 shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">COMMANDER</div>
                <div className="text-sm font-bold text-white tracking-wide truncate max-w-[120px] sm:max-w-[160px]">{currentProfileName}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onSwitchProfile && (
                <button
                  onClick={() => {
                    soundManager.playClick();
                    onSwitchProfile();
                  }}
                  className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded border border-neutral-700 text-xs font-bold transition flex items-center gap-1.5"
                  title="Switch to another commander profile"
                >
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Switch</span>
                </button>
              )}
              {onDeleteCurrentProfile && (
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setShowDeleteModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 rounded border border-red-800/60 text-xs font-bold transition flex items-center gap-1.5"
                  title="Delete this commander profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Profile</span>
                </button>
              )}
            </div>
          </div>
        )}

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

        {/* Delete Profile Confirmation Modal on Main Menu */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-neutral-900 border-2 border-red-600/80 rounded-xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <div className="p-2.5 bg-red-950/80 border border-red-800 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-title tracking-wider text-white">DELETE PROFILE?</h3>
                  <p className="text-xs text-red-400 font-mono">Irreversible Action</p>
                </div>
              </div>

              <p className="text-sm text-neutral-300 mb-3">
                Are you sure you want to permanently delete profile <strong className="text-white bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700 font-mono">{currentProfileName}</strong>?
              </p>

              <div className="p-2.5 bg-red-950/30 border border-red-900/40 rounded text-xs text-red-300 font-mono flex items-center gap-2 mb-6">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                <span>All mission records, talent points, and upgrades will be deleted. You will be returned to the Commander Selection screen.</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setShowDeleteModal(false);
                  }}
                  className="flex-1 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-lg text-xs uppercase tracking-wider transition border border-neutral-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setShowDeleteModal(false);
                    if (onDeleteCurrentProfile) onDeleteCurrentProfile();
                  }}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-red-900/50 transition flex items-center justify-center gap-2 border border-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
    </main>
  );
};