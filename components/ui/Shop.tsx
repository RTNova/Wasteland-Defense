
import React from 'react';
import { ChevronLeft, ShoppingBag, ArrowUp } from 'lucide-react';
import { UPGRADE_CONFIG } from '../../config/constants';
import { PlayerProgress, GlobalUpgrades } from '../../types';

interface ShopProps {
    progress: PlayerProgress;
    onBuyUpgrade: (key: keyof GlobalUpgrades) => void;
    onBack: () => void;
}

export const Shop: React.FC<ShopProps> = ({ progress, onBuyUpgrade, onBack }) => {
  return (
    <main className="max-w-4xl mx-auto p-6 md:p-12 animate-in fade-in slide-in-from-right-8">
        <button 
            onClick={onBack}
            className="flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition"
        >
            <ChevronLeft className="w-5 h-5" /> Back to Map
        </button>

        <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-yellow-500" />
            Armory Upgrades
        </h2>
        <p className="text-neutral-500 mb-8">Spend Tech Points (TP) to permanently enhance your defensive capabilities.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Object.keys(UPGRADE_CONFIG) as Array<keyof typeof UPGRADE_CONFIG>).map((key) => {
                const def = UPGRADE_CONFIG[key];
                const level = progress.upgrades[key];
                const cost = def.cost * (level + 1);
                const canAfford = progress.techPoints >= cost;

                return (
                    <div key={key} className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg relative group overflow-hidden">
                        <div className="absolute top-0 right-0 bg-neutral-800 px-3 py-1 rounded-bl text-xs text-neutral-400">Lvl {level}</div>
                        <h3 className="text-xl font-bold text-white mb-1">{def.name}</h3>
                        <p className="text-sm text-neutral-400 mb-4 min-h-[40px]">{def.desc}</p>
                        
                        <button
                            onClick={() => onBuyUpgrade(key)}
                            disabled={!canAfford}
                            className={`w-full py-3 flex items-center justify-center gap-2 rounded font-bold transition ${
                                canAfford 
                                ? 'bg-yellow-600 hover:bg-yellow-500 text-black' 
                                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                            }`}
                        >
                            <span className="flex items-center gap-1">
                                {canAfford ? <ArrowUp className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />} 
                                Upgrade
                            </span>
                            <span className="bg-black/20 px-2 py-0.5 rounded text-sm">{cost} TP</span>
                        </button>
                    </div>
                )
            })}
        </div>
    </main>
  );
};
