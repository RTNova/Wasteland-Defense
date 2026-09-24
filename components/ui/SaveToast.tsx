import React, { useEffect, useState, useRef } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';

interface SaveToastProps {
  show: boolean;
  message?: string;
  duration?: number; // milliseconds, default 3000ms
  onDismiss?: () => void;
}

export const SaveToast: React.FC<SaveToastProps> = ({ 
  show, 
  message = 'Game Auto-Saved',
  duration = 3000,
  onDismiss
}) => {
  const [visible, setVisible] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (show) {
      setVisible(true);
      setAnimKey(prev => prev + 1);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setVisible(false);
        if (onDismiss) {
          onDismiss();
        }
      }, duration);
    } else {
      setVisible(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [show, message, duration, onDismiss]);

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ease-out transform ${
        visible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
      }`}
    >
      <div className="relative overflow-hidden flex flex-col items-center bg-neutral-900/95 text-neutral-200 border border-emerald-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.8),0_0_15px_rgba(16,185,129,0.2)] rounded-full backdrop-blur-md text-xs font-mono select-none px-4 py-2">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </span>
          <span className="font-semibold text-neutral-100 tracking-wide flex items-center gap-1.5 text-xs sm:text-sm">
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            {message}
          </span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
        </div>

        {/* 3-Second Visual Countdown Indicator Line */}
        {visible && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-950/60 overflow-hidden">
            <div 
              key={animKey}
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300"
              style={{
                animation: `shrinkWidth ${duration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>
      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
