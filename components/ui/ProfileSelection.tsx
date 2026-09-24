import React, { useState } from 'react';
import { User, Plus, Trash2, PlayCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Profile } from '../../types/index';
import { soundManager } from '../../config/soundManager';

interface ProfileSelectionProps {
    profiles: Profile[];
    onCreateProfile: (name: string) => void;
    onSelectProfile: (id: string) => void;
    onDeleteProfile: (id: string) => void;
}

export const ProfileSelection: React.FC<ProfileSelectionProps> = ({ profiles, onCreateProfile, onSelectProfile, onDeleteProfile }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim()) {
            soundManager.playClick();
            onCreateProfile(newName.trim());
            setNewName('');
            setIsCreating(false);
        }
    };

    const handleConfirmDelete = () => {
        if (!profileToDelete) return;
        soundManager.playClick();
        onDeleteProfile(profileToDelete.id);
        setProfileToDelete(null);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-full p-6 animate-in fade-in zoom-in duration-500">
             <h1 className="text-4xl font-title text-white mb-8 tracking-widest text-shadow">
                SELECT COMMANDER
            </h1>

            <div className="grid gap-4 w-full max-w-md">
                {profiles.map(profile => (
                    <div key={profile.id} className="group relative bg-neutral-900 border border-neutral-700 hover:border-blue-500 rounded-lg p-4 transition-all hover:bg-neutral-800">
                        <div 
                            className="flex items-center justify-between cursor-pointer pr-10"
                            onClick={() => {
                                soundManager.playClick();
                                onSelectProfile(profile.id);
                            }}
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-neutral-800 p-3 rounded-full border border-neutral-600 group-hover:border-blue-400">
                                    <User className="w-6 h-6 text-neutral-300 group-hover:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-blue-300">{profile.name}</h3>
                                    <p className="text-xs text-neutral-500">
                                        Last Active: {new Date(profile.lastPlayed).toLocaleDateString()}
                                    </p>
                                    <div className="flex gap-3 mt-1 text-xs text-neutral-400 font-mono">
                                        <span>TP: {profile.progress.techPoints}</span>
                                        <span>Maps: {profile.progress.completedMaps.length}</span>
                                        <span className="text-amber-400">🏆 {profile.progress.unlockedAchievements?.length || 0}</span>
                                    </div>
                                </div>
                            </div>
                            <PlayCircle className="w-8 h-8 text-neutral-600 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                soundManager.playClick();
                                setProfileToDelete(profile);
                            }}
                            className="absolute top-3 right-3 p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-950/60 border border-transparent hover:border-red-800/80 transition-all z-10"
                            title={`Delete profile ${profile.name}`}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                {profiles.length < 3 && !isCreating && (
                    <button 
                        onClick={() => {
                            soundManager.playClick();
                            setIsCreating(true);
                        }}
                        className="h-24 border-2 border-dashed border-neutral-700 rounded-lg flex flex-col items-center justify-center text-neutral-500 hover:text-white hover:border-neutral-500 transition-colors gap-2"
                    >
                        <Plus className="w-6 h-6" />
                        <span className="font-bold text-sm">NEW PROFILE</span>
                    </button>
                )}

                {isCreating && (
                    <form onSubmit={handleCreate} className="bg-neutral-900 border border-blue-900 p-4 rounded-lg animate-in fade-in">
                        <label className="block text-xs font-bold text-blue-400 mb-2 uppercase">Commander Name</label>
                        <input 
                            autoFocus
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            maxLength={12}
                            className="w-full bg-black border border-neutral-700 rounded p-2 text-white mb-3 focus:border-blue-500 focus:outline-none uppercase font-mono"
                            placeholder="ENTER NAME..."
                        />
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded text-xs">CREATE</button>
                            <button 
                                type="button" 
                                onClick={() => {
                                    soundManager.playClick();
                                    setIsCreating(false);
                                }} 
                                className="px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-2 rounded text-xs"
                            >
                                CANCEL
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Custom In-App Deletion Confirmation Modal */}
            {profileToDelete && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-neutral-900 border-2 border-red-600/80 rounded-xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-red-500 mb-4">
                            <div className="p-2.5 bg-red-950/80 border border-red-800 rounded-lg">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold font-title tracking-wider text-white">DELETE COMMANDER</h3>
                                <p className="text-xs text-red-400 font-mono">Irreversible Action</p>
                            </div>
                        </div>

                        <p className="text-sm text-neutral-300 mb-3">
                            Are you sure you want to permanently delete commander <strong className="text-white bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700 font-mono">{profileToDelete.name}</strong>?
                        </p>

                        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 mb-5 text-xs text-neutral-400 font-mono space-y-1.5">
                            <div className="flex justify-between">
                                <span>Banked Tech Points:</span>
                                <span className="text-yellow-400 font-bold">{profileToDelete.progress.techPoints} TP</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Campaign Maps:</span>
                                <span className="text-blue-400 font-bold">{profileToDelete.progress.completedMaps.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Unlocked Badges:</span>
                                <span className="text-amber-400 font-bold">{profileToDelete.progress.unlockedAchievements?.length || 0}</span>
                            </div>
                        </div>

                        <div className="p-2.5 bg-red-950/30 border border-red-900/40 rounded text-[11px] text-red-300 font-mono flex items-center gap-2 mb-6">
                            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                            <span>All combat stats, records, and talent tree upgrades will be wiped.</span>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    soundManager.playClick();
                                    setProfileToDelete(null);
                                }}
                                className="flex-1 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-lg text-xs uppercase tracking-wider transition border border-neutral-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-red-900/50 transition flex items-center justify-center gap-2 border border-red-500"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Confirm Delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};