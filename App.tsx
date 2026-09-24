
import { useState, useEffect } from 'react';
import { GameCanvas } from './components/game/GameCanvas';
import { UPGRADE_CONFIG } from './config/constants';
import { GameMap, PlayerProgress, GlobalUpgrades, Profile } from './types/index';
import { Zap } from 'lucide-react';
import { Shop } from './components/ui/Shop';
import { MainMenu } from './components/ui/MainMenu';
import { MapSelection } from './components/ui/MapSelection';
import { Bestiary } from './components/ui/Bestiary';
import { ProfileSelection } from './components/ui/ProfileSelection';
import { SoundSettingsPanel } from './components/ui/SoundSettingsPanel';
import { soundManager, SoundSettings } from './config/soundManager';

const INITIAL_PROGRESS: PlayerProgress = {
  techPoints: 0,
  upgrades: {
    damageLevel: 0,
    rangeLevel: 0,
    discountLevel: 0,
    cashLevel: 0
  },
  completedMaps: []
};

type ViewState = 'PROFILES' | 'MENU' | 'MAP_SELECT' | 'SHOP' | 'BESTIARY';
type GameMode = 'STANDARD' | 'ENDLESS';

function App() {
  // --- STATE ---
  const [activeMap, setActiveMap] = useState<GameMap | null>(null);
  const [view, setView] = useState<ViewState>('PROFILES');
  const [gameMode, setGameMode] = useState<GameMode>('STANDARD');
  
  // Profile System State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [progress, setProgress] = useState<PlayerProgress>(INITIAL_PROGRESS);
  
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(() => soundManager.getSettings());

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
        setProfiles(JSON.parse(savedProfiles));
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

  // Sync current progress to the active profile object
  useEffect(() => {
      if (currentProfileId && !loading) {
          setProfiles(prev => prev.map(p => 
              p.id === currentProfileId 
              ? { ...p, progress, lastPlayed: Date.now() } 
              : p
          ));
      }
  }, [progress]);

  // --- PROFILE ACTIONS ---

  const handleCreateProfile = (name: string) => {
      const newProfile: Profile = {
          id: Date.now().toString(),
          name,
          lastPlayed: Date.now(),
          progress: INITIAL_PROGRESS
      };
      setProfiles(prev => [...prev, newProfile]);
      setCurrentProfileId(newProfile.id);
      setProgress(newProfile.progress);
      setView('MENU');
  };

  const handleSelectProfile = (id: string) => {
      const profile = profiles.find(p => p.id === id);
      if (profile) {
          setCurrentProfileId(id);
          setProgress(profile.progress);
          setView('MENU');
      }
  };

  const handleDeleteProfile = (id: string) => {
      setProfiles(prev => prev.filter(p => p.id !== id));
      if (currentProfileId === id) {
          setCurrentProfileId(null);
          setView('PROFILES');
      }
  };

  // --- GAME ACTIONS ---

  const handleNavigate = (targetView: ViewState, mode?: GameMode) => {
      if (mode) setGameMode(mode);
      setView(targetView);
  };

  const handleWin = (reward: number) => {
    // Standard Map Completion Reward
    if (reward > 0) {
        setProgress(prev => ({
          ...prev,
          techPoints: prev.techPoints + reward,
          completedMaps: (gameMode === 'STANDARD' && activeMap) 
            ? [...new Set([...prev.completedMaps, activeMap.id])] 
            : prev.completedMaps
        }));
    }
    setActiveMap(null);
  };

  const handleGlobalPointsAdd = (amount: number) => {
      // Used for Endless Mode mid-game rewards
      setProgress(prev => ({
          ...prev,
          techPoints: prev.techPoints + amount
      }));
  };

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
    }
  };

  // --- RENDER ---

  if (activeMap) {
    return (
        <GameCanvas 
            map={activeMap} 
            upgrades={progress.upgrades}
            currentTechPoints={progress.techPoints}
            onExit={() => setActiveMap(null)} 
            onWin={handleWin}
            onAddGlobalPoints={handleGlobalPointsAdd}
            isDevMode={isDevMode}
            initialIsEndless={gameMode === 'ENDLESS'}
        />
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
        <div className="absolute top-4 right-4 flex items-center gap-3 z-20">
            <SoundSettingsPanel 
                settings={soundSettings}
                onUpdateSettings={handleUpdateSoundSettings}
                variant="compact"
            />
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
            />
        )}

        {view === 'MAP_SELECT' && (
            <MapSelection 
                progress={progress}
                onSelectMap={setActiveMap}
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
      </div>
    </div>
  );
}

export default App;
