import React, { useEffect, useState, useRef } from 'react';
import { liveService } from '../services/liveService';
import { Logo } from './Logo';

interface LiveSessionOverlayProps {
  onClose: () => void;
}

export const LiveSessionOverlay: React.FC<LiveSessionOverlayProps> = ({ onClose }) => {
  const [status, setStatus] = useState('connecting'); // connecting, connected, disconnected
  const [volume, setVolume] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    // Subscribe to service events
    liveService.onStatusChange = (s) => setStatus(s);
    liveService.onVolumeChange = (v) => setVolume(v);

    // Initialize Connection
    liveService.connect().catch(() => setStatus('error'));

    return () => {
      liveService.disconnect();
    };
  }, []);

  // Visualizer Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    
    const draw = () => {
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        // Dynamic center circle
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Use the current volume to modulate radius
        // Smooth out volume with simple lerp could be better, but direct mapping is reactive
        const radius = 50 + (volume * 100); 

        // Draw multiple glowing rings
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius + (i * 20 * Math.sin(time + i)), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(6, 182, 212, ${0.5 - (i * 0.15)})`; // Brand Accent
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw active wave
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
            const y = centerY + Math.sin((x * 0.01) + time * 2) * (volume * 50);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)'; // Brand Secondary
        ctx.lineWidth = 4;
        ctx.stroke();

        time += 0.05;
        animationRef.current = requestAnimationFrame(draw);
    };

    // Resize canvas
    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        window.removeEventListener('resize', resize);
    };
  }, [volume]);

  return (
    <div className="fixed inset-0 z-50 bg-midnight-950 flex flex-col items-center justify-center animate-in fade-in duration-500">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-30" />
      
      {/* Central Hub */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative">
            {/* Status Ring */}
            <div className={`w-32 h-32 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${status === 'connected' ? 'border-brand-accent shadow-[0_0_50px_rgba(6,182,212,0.3)]' : 'border-slate-700'}`}>
                <Logo className={`w-12 h-12 transition-transform ${status === 'connected' ? 'scale-110' : 'scale-100 opacity-50'}`} animated={status === 'connected'} />
            </div>
            {/* Pulse Ring */}
            {status === 'connected' && (
                <div className="absolute inset-0 rounded-full border border-brand-accent animate-ping opacity-20"></div>
            )}
        </div>

        <div className="text-center space-y-2">
            <h2 className="text-2xl font-display font-bold text-white tracking-widest uppercase">
                {status === 'connecting' && 'Establishing Uplink...'}
                {status === 'connected' && 'Live Neural Link Active'}
                {status === 'error' && 'Connection Failed'}
            </h2>
            <p className="text-slate-400 font-mono text-xs">
                {status === 'connected' ? 'Listening // Speaking' : 'Initializing secure websocket channel...'}
            </p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-12 z-10 flex gap-4">
        <button 
            onClick={onClose}
            className="group flex items-center gap-3 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 rounded-full text-red-400 hover:text-red-300 transition-all"
        >
            <div className="p-1 rounded bg-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" x2="12" y1="2" y2="12"/></svg>
            </div>
            <span className="text-sm font-bold tracking-wide uppercase">Terminate</span>
        </button>
      </div>
    </div>
  );
};