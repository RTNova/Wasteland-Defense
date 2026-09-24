
import { useState, useEffect, useRef, useCallback } from 'react';
import { GameCanvas } from './components/game/GameCanvas';
import { UPGRADE_CONFIG } from './config/constants';
import { GameMap, PlayerProgress, GlobalUpgrades, Profile, DifficultyLevel } from './types/index';
import { Zap, User } from 'lucide-react';
import { Shop } from './components/ui/Shop';
import { MainMenu } from './components/ui/MainMenu';
import { MapSelection } from './components/ui/MapSelection';
import { Bestiary } from './components/ui/Bestiary';
import { ProfileSelection } from './components/ui/ProfileSelection';
import { SoundSettingsPanel } from './components/ui/SoundSettingsPanel';
import { SaveToast } from './components/ui/SaveToast';
import { Achievements } from './components/ui/Achievements';
import { AchievementUnlockedToast } from './components/ui/AchievementUnlockedToast';
import { soundManager, SoundSettings } from './config/soundManager';
import { ACHIEVEMENTS, Achievement, INITIAL_PROGRESS_STATS } from './config/achievements';

const INITIAL_PROGRESS: PlayerProgress = {
  techPoints: 0,
  upgrades: {
    damageLevel: 0,
    rangeLevel: 0,
    discountLevel: 0,
    cashLevel: 0
  },
  completedMaps: [],
  unlockedAchievements: [],
  stats: { ...INITIAL_PROGRESS_STATS }
};

type ViewState = 'PROFILES' | 'MENU' | 'MAP_SELECT' | 'SHOP' | 'BESTIARY' | 'ACHIEVEMENTS';
type GameMode = 'STANDARD' | 'ENDLESS';

function App() {
  // --- STATE ---
  const [activeMap, setActiveMap] = useState<GameMap | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('MEDIUM');
  const [view, setView] = useState<ViewState>('PROFILES');
  const [gameMode, setGameMode] = useState<GameMode>('STANDARD');
  
  // Profile System State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [progress, setProgress] = useState<PlayerProgress>(INITIAL_PROGRESS);
  
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(() => soundManager.getSettings());
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [saveToastMessage, setSaveToastMessage] = useState('Game Auto-Saved');
  const [unlockedAchievementToast, setUnlockedAchievementToast] = useState<Achievement | null>(null);
  const saveToastTimeoutRef = useRef<any>(null);
  const achievementToastTimeoutRef = useRef<any>(null);
  const initialLoadDoneRef = useRef(false);

  const triggerSaveNotification = useCallback((message: string = 'Game Auto-Saved') => {
    setSaveToastMessage(message);
    setShowSaveToast(true);
    if (saveToastTimeoutRef.current) {
      clearTimeout(saveToastTimeoutRef.current);
    }
    saveToastTimeoutRef.current = setTimeout(() => {
      setShowSaveToast(false);
    }, 3000); // exactly 3 seconds!
  }, []);

  const handleAutoSaveRound = useCallback((roundNumber: number) => {
    if (!currentProfileId) return;
    setProfiles(prev => {
      const updated = prev.map(p => 
        p.id === currentProfileId 
          ? { ...p, progress, lastPlayed: Date.now() } 
          : p
      );
      try {
        localStorage.setItem('wasteland_defense_profiles', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to auto-save profile', e);
      }
      return updated;
    });
    triggerSaveNotification(`Round ${roundNumber} Complete • Game Auto-Saved`);
  }, [currentProfileId, progress, triggerSaveNotification]);

  const handleManualSave = useCallback(() => {
    if (!currentProfileId) return;
    setProfiles(prev => {
      const updated = prev.map(p => 
        p.id === currentProfileId 
          ? { ...p, progress, lastPlayed: Date.now() } 
          : p
      );
      try {
        localStorage.setItem('wasteland_defense_profiles', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save profile', e);
      }
      return updated;
    });
    triggerSaveNotification('Game Saved • All Progress Backed Up');
  }, [currentProfileId, progress, triggerSaveNotification]);

  // Check achievements against current stats and progress
  const checkAchievements = useCallback((currentProgress: PlayerProgress) => {
    const unlocked = new Set(currentProgress.unlockedAchievements || []);
    const stats = currentProgress.stats || INITIAL_PROGRESS_STATS;
    let newlyUnlocked: Achievement[] = [];
    let bonusTP = 0;

    for (const achievement of ACHIEVEMENTS) {
      if (!unlocked.has(achievement.id)) {
        const val = achievement.getValue(stats, currentProgress);
        if (val >= achievement.targetValue) {
          unlocked.add(achievement.id);
          newlyUnlocked.push(achievement);
          bonusTP += achievement.rewardTP;
        }
      }
    }

    if (newlyUnlocked.length > 0) {
      const latest = newlyUnlocked[0];
      setUnlockedAchievementToast(latest);
      soundManager.playAchievementUnlocked();

      if (achievementToastTimeoutRef.current) {
        clearTimeout(achievementToastTimeoutRef.current);
      }
      achievementToastTimeoutRef.current = setTimeout(() => {
        setUnlockedAchievementToast(null);
      }, 4000);

      setProgress(prev => ({
        ...prev,
        techPoints: prev.techPoints + bonusTP,
        unlockedAchievements: Array.from(unlocked)
      }));
    }
  }, []);

  // --- EFFECTS ---
  
  // Ambient Music Management
  useEffect(() => {
    soundManager.loadSettings();
    setSoundSettings(soundManager.getSettings());
    // Auto-start ambient dark synth on first user interaction or mount
    const handleFirstInteraction = () => {
      soundManager.startAmbientMusic();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const handleUpdateSoundSettings = (updated: Partial<SoundSettings>) => {
    const saved = soundManager.saveSettings(updated);
    setSoundSettings(saved);
  };
  
  // Load Profiles on Start
  useEffect(() => {
    const savedProfiles = localStorage.getItem('wasteland_defense_profiles');
    if (savedProfiles) {
      try {
        const parsed: Profile[] = JSON.parse(savedProfiles);
        // Ensure legacy profiles have unlockedAchievements array and stats object
        const sanitized = parsed.map(p => ({
          ...p,
          progress: {
            ...p.progress,
            unlockedAchievements: p.progress.unlockedAchievements || [],
            stats: {
              ...INITIAL_PROGRESS_STATS,
              ...(p.progress.stats || {})
            }
          }
        }));
        setProfiles(sanitized);
      } catch (e) {
        console.error("Failed to load profiles", e);
        setProfiles([]);
      }
    }
    setLoading(false);
  }, []);

  // Save Profiles whenever they change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('wasteland_defense_profiles', JSON.stringify(profiles));
    }
  }, [profiles, loading]);

  // Sync current progress to the active profile object & evaluate achievements
  useEffect(() => {
      if (currentProfileId && !loading) {
          // Check for unlocked achievements
          checkAchievements(progress);

          setProfiles(prev => prev.map(p => 
              p.id === currentProfileId 
              ? { ...p, progress, lastPlayed: Date.now() } 
              : p
          ));
      }
  }, [progress, currentProfileId, loading, checkAchievements]);

  // --- PROFILE ACTIONS ---

  const handleCreateProfile = (name: string) => {
      const newProfile: Profile = {
          id: Date.now().toString(),
          name,
          lastPlayed: Date.now(),
          progress: INITIAL_PROGRESS
      };
      setProfiles(prev => {
          const updated = [...prev, newProfile];
          try {
              localStorage.setItem('wasteland_defense_profiles', JSON.stringify(updated));
          } catch (e) {
              console.error('Failed to save new profile', e);
          }
          return updated;
      });
      setCurrentProfileId(newProfile.id);
      setProgress(newProfile.progress);
      setView('MENU');
      triggerSaveNotification(`Commander ${name} Initialized`);
  };

  const handleSelectProfile = (id: string) => {
      const profile = profiles.find(p => p.id === id);
      if (profile) {
          initialLoadDoneRef.current = false;
          setCurrentProfileId(id);
          setProgress(profile.progress);
          setView('MENU');
      }
  };

  const handleDeleteProfile = (id: string) => {
      setProfiles(prev => {
          const updated = prev.filter(p => p.id !== id);
          try {
              localStorage.setItem('wasteland_defense_profiles', JSON.stringify(updated));
          } catch (e) {
              console.error('Failed to delete profile from localStorage', e);
          }
          return updated;
      });
      if (currentProfileId === id) {
          setCurrentProfileId(null);
          setProgress(INITIAL_PROGRESS);
          setView('PROFILES');
      }
      triggerSaveNotification('Profile Deleted Successfully');
  };

  // --- GAME ACTIONS ---

  const handleNavigate = (targetView: ViewState, mode?: GameMode) => {
      if (mode) setGameMode(mode);
      setView(targetView);
  };

  const handleWin = (reward: number, difficulty: DifficultyLevel = selectedDifficulty) => {
    // Standard Map Completion Reward & Difficulty Progress
    setProgress(prev => {
      const isStandard = gameMode === 'STANDARD';
      const updatedCompletedMaps = (isStandard && activeMap) 
        ? [...new Set([...prev.completedMaps, activeMap.id])] 
        : prev.completedMaps;

      const diffKey = activeMap ? `${activeMap.id}_${difficulty}` : '';
      const existingDiffs = prev.completedDifficulties || [];
      const updatedDifficulties = (isStandard && diffKey && !existingDiffs.includes(diffKey))
        ? [...existingDiffs, diffKey]
        : existingDiffs;

      const next = {
        ...prev,
        techPoints: prev.techPoints + (reward > 0 ? reward : 0),
        completedMaps: updatedCompletedMaps,
        completedDifficulties: updatedDifficulties,
        stats: {
          ...(prev.stats || INITIAL_PROGRESS_STATS),
          totalTechPointsEarned: ((prev.stats?.totalTechPointsEarned) || 0) + (reward > 0 ? reward : 0)
        }
      };
      checkAchievements(next);
      return next;
    });
    triggerSaveNotification('Mission Complete • Victory Saved');
    setActiveMap(null);
  };

  const handleGlobalPointsAdd = (amount: number) => {
      // Used for Endless Mode mid-game rewards
      setProgress(prev => ({
          ...prev,
          techPoints: prev.techPoints + amount,
          stats: {
            ...(prev.stats || INITIAL_PROGRESS_STATS),
            totalTechPointsEarned: ((prev.stats?.totalTechPointsEarned) || 0) + amount
          }
      }));
  };

  const handleReportCombatStats = useCallback((delta: { 
    mutantsKilled?: number; 
    bossesKilled?: number; 
    wavesCleared?: number; 
    endlessWaveRecord?: number; 
    towersBuilt?: number; 
    techPointsEarned?: number;
  }) => {
    setProgress(prev => {
      const currentStats = prev.stats || INITIAL_PROGRESS_STATS;
      return {
        ...prev,
        stats: {
          mutantsKilled: currentStats.mutantsKilled + (delta.mutantsKilled || 0),
          bossesKilled: currentStats.bossesKilled + (delta.bossesKilled || 0),
          wavesCleared: currentStats.wavesCleared + (delta.wavesCleared || 0),
          endlessWaveRecord: Math.max(currentStats.endlessWaveRecord || 0, delta.endlessWaveRecord || 0),
          towersBuilt: currentStats.towersBuilt + (delta.towersBuilt || 0),
          totalTechPointsEarned: currentStats.totalTechPointsEarned + (delta.techPointsEarned || 0)
        }
      };
    });
  }, []);

  const buyUpgrade = (key: keyof GlobalUpgrades) => {
    const config = UPGRADE_CONFIG[key as keyof typeof UPGRADE_CONFIG];
    if (!config) return;

    // Basic cost scaling: Base Cost * (Level + 1)
    const currentLevel = progress.upgrades[key];
    const cost = config.cost * (currentLevel + 1);

    if (progress.techPoints >= cost) {
      setProgress(prev => ({
        ...prev,
        techPoints: prev.techPoints - cost,
        upgrades: {
          ...prev.upgrades,
          [key]: prev.upgrades[key] + 1
        }
      }));
      triggerSaveNotification('Upgrade Installed • Progress Saved');
    }
  };

  // --- RENDER ---

  const activeProfile = profiles.find(p => p.id === currentProfileId) || null;

  if (activeMap) {
    return (
      <>
        <GameCanvas 
            map={activeMap} 
            upgrades={progress.upgrades}
            currentTechPoints={progress.techPoints}
            difficulty={selectedDifficulty}
            onExit={() => setActiveMap(null)} 
            onWin={handleWin}
            onAddGlobalPoints={handleGlobalPointsAdd}
            onReportCombatStats={handleReportCombatStats}
            onAutoSaveRound={handleAutoSaveRound}
            onManualSave={handleManualSave}
            isDevMode={isDevMode}
            initialIsEndless={gameMode === 'ENDLESS'}
        />
        <SaveToast 
          show={showSaveToast} 
          message={saveToastMessage}
          duration={3000}
          onDismiss={() => setShowSaveToast(false)}
        />
        <AchievementUnlockedToast achievement={unlockedAchievementToast} />
      </>
    );
  }

  if (loading) return <div className="h-screen bg-black text-white flex items-center justify-center">Initializing System...</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-mono selection:bg-red-900 selection:text-white overflow-x-hidden flex flex-col">
      
      {/* Header */}
      <header className="bg-neutral-900 border-b border-neutral-800 p-6 text-center relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900 via-black to-black"></div>
        <h1 className="relative z-10 text-3xl md:text-5xl font-title tracking-tighter text-neutral-200 pointer-events-none select-none">
          WASTELAND <span className="text-red-600">DEFENSE</span>
        </h1>
        
        {/* Header Sound Controls & Currency Display */}
        <div className="absolute top-4 right-4 flex items-center gap-2.5 z-20">
            <SoundSettingsPanel 
                settings={soundSettings}
                onUpdateSettings={handleUpdateSoundSettings}
                variant="compact"
            />
            {activeProfile && (
                <button
                    onClick={() => {
                      soundManager.playClick();
                      setView('PROFILES');
                    }}
                    className="hidden sm:flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-full border border-neutral-700 text-xs font-bold text-neutral-300 hover:text-white transition"
                    title="Switch Commander"
                >
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span className="truncate max-w-[100px]">{activeProfile.name}</span>
                </button>
            )}
            {currentProfileId && (
                <div className="flex items-center gap-2 bg-neutral-800 px-4 py-2 rounded-full border border-yellow-900/50 shadow-lg">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-500 font-bold text-lg">{progress.techPoints}</span>
                </div>
            )}
        </div>
      </header>

      <div className="flex-1 relative">
        {view === 'PROFILES' && (
            <ProfileSelection 
                profiles={profiles}
                onCreateProfile={handleCreateProfile}
                onSelectProfile={handleSelectProfile}
                onDeleteProfile={handleDeleteProfile}
            />
        )}

        {view === 'MENU' && (
            <MainMenu 
                onNavigate={(v, m) => handleNavigate(v as ViewState, m)}
                isDevMode={isDevMode}
                onToggleDevMode={() => setIsDevMode(!isDevMode)}
                soundSettings={soundSettings}
                onUpdateSoundSettings={handleUpdateSoundSettings}
                unlockedAchievementsCount={progress.unlockedAchievements?.length || 0}
                totalAchievementsCount={ACHIEVEMENTS.length}
                currentProfileName={activeProfile?.name}
                onSwitchProfile={() => setView('PROFILES')}
                onDeleteCurrentProfile={() => {
                  if (currentProfileId) {
                    handleDeleteProfile(currentProfileId);
                  }
                }}
            />
        )}

        {view === 'MAP_SELECT' && (
            <MapSelection 
                progress={progress}
                onSelectMap={(map, difficulty) => {
                    setSelectedDifficulty(difficulty);
                    setActiveMap(map);
                }}
                onBack={() => setView('MENU')}
                mode={gameMode}
            />
        )}

        {view === 'SHOP' && (
            <Shop 
                progress={progress} 
                onBuyUpgrade={buyUpgrade} 
                onBack={() => setView('MENU')} 
            />
        )}

        {view === 'BESTIARY' && (
            <Bestiary
                onBack={() => setView('MENU')}
            />
        )}

        {view === 'ACHIEVEMENTS' && (
            <Achievements
                progress={progress}
                onBack={() => setView('MENU')}
            />
        )}
      </div>

      {/* Subtle Game Saved Toast */}
      <SaveToast 
        show={showSaveToast} 
        message={saveToastMessage}
        duration={3000}
        onDismiss={() => setShowSaveToast(false)}
      />
      {/* Achievement Unlocked Toast Notification */}
      <AchievementUnlockedToast achievement={unlockedAchievementToast} />
    </div>
  );
}

export default App;
