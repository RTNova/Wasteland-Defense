import React, { useState } from 'react';
import { User, Plus, Trash2, PlayCircle } from 'lucide-react';
import { Profile } from '../../types/index';

interface ProfileSelectionProps {
    profiles: Profile[];
    onCreateProfile: (name: string) => void;
    onSelectProfile: (id: string) => void;
    onDeleteProfile: (id: string) => void;
}

export const ProfileSelection: React.FC<ProfileSelectionProps> = ({ profiles, onCreateProfile, onSelectProfile, onDeleteProfile }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim()) {
            onCreateProfile(newName.trim());
            setNewName('');
            setIsCreating(false);
        }
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
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => onSelectProfile(profile.id)}
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
                                if(confirm('Delete this profile data permanently?')) onDeleteProfile(profile.id);
                            }}
                            className="absolute top-2 right-2 p-2 text-neutral-700 hover:text-red-500 transition-colors z-10"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                {profiles.length < 3 && !isCreating && (
                    <button 
                        onClick={() => setIsCreating(true)}
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
                            <button type="button" onClick={() => setIsCreating(false)} className="px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-2 rounded text-xs">CANCEL</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};