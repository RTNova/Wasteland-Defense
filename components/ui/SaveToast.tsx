import React from 'react';
import { Save, CheckCircle2 } from 'lucide-react';

interface SaveToastProps {
  show: boolean;
  message?: string;
}

export const SaveToast: React.FC<SaveToastProps> = ({ 
  show, 
  message = 'Game Saved' 
}) => {
  return (
    <div
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ease-out transform ${
        show
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/90 text-neutral-200 border border-neutral-700/80 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md text-xs font-mono select-none">
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="w-3 h-3" />
        </span>
        <span className="font-semibold text-neutral-200 tracking-wide flex items-center gap-1.5">
          <Save className="w-3 h-3 text-neutral-400" />
          {message}
        </span>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    </div>
  );
};
