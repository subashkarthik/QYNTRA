import React, { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('INITIALIZING SYSTEM...');
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timeline = [
      { time: 100, progress: 0, text: 'INITIALIZING SYSTEM...' },
      { time: 800, progress: 25, text: 'LOADING NEURAL NETWORKS...' },
      { time: 1600, progress: 60, text: 'CALIBRATING INTELLIGENCE...' },
      { time: 2400, progress: 90, text: 'FINALIZING SETUP...' },
      { time: 3000, progress: 100, text: 'READY.' },
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];

    timeline.forEach(step => {
      timers.push(setTimeout(() => {
        setProgress(step.progress);
        setLoadingText(step.text);
      }, step.time));
    });

    timers.push(setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 800);
    }, 3500));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden transition-all duration-700 ease-in-out ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
        
        {/* Minimal Grid Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(#00d9ff 1px, transparent 1px),
              linear-gradient(90deg, #00d9ff 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            maskImage: 'radial-gradient(circle at center, black 20%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 20%, transparent 70%)'
          }}></div>
        </div>

        {/* Subtle Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,217,255,0.1)_0%,_transparent_70%)]"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
             {/* Logo Container - Minimal */}
             <div className="relative mb-12">
                 {/* Subtle glow behind logo */}
                 <div className="absolute inset-0 bg-[#00d9ff]/20 blur-[40px] rounded-full"></div>
                 
                 {/* Logo */}
                 <div className="relative">
                    <Logo className="w-32 h-32" animated={true} />
                 </div>
             </div>

             {/* QYNTRA Text */}
             <h1 className="text-6xl font-display font-bold text-white tracking-[0.3em] mb-2 drop-shadow-[0_0_30px_rgba(0,217,255,0.5)]">
                QYNTRA
             </h1>
             
             {/* Subtitle */}
             <p className="text-sm font-mono text-[#00d9ff]/60 tracking-[0.2em] mb-16 uppercase">
                Intelligent Architect
             </p>

             {/* Progress Bar - Minimal */}
             <div className="w-80 h-[1px] bg-white/10 rounded-full overflow-hidden relative mb-4">
                <div 
                    className="absolute top-0 left-0 h-full bg-[#00d9ff] shadow-[0_0_10px_rgba(0,217,255,0.8)] transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
             </div>

             {/* Loading Text */}
             <div className="font-mono text-[10px] tracking-[0.3em] text-[#00d9ff]/50 uppercase flex items-center gap-3">
                <span>{loadingText}</span>
                <span className="text-white/80 font-bold">{progress}%</span>
             </div>
        </div>
    </div>
  );
};