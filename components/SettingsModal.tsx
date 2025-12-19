import React, { useState, useEffect } from 'react';
import { ThemeId, ModelConfig } from '../types';
import { THEMES, PERSONAS } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: ThemeId;
  onThemeSelect: (themeId: ThemeId) => void;
  modelConfig: ModelConfig;
  onModelConfigUpdate: (config: ModelConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  currentThemeId, 
  onThemeSelect,
  modelConfig,
  onModelConfigUpdate
}) => {
  const [tempBudget, setTempBudget] = useState(modelConfig.thinkingBudget);
  const [customInstruction, setCustomInstruction] = useState(modelConfig.systemInstruction || '');
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);

  // Sync state when modal opens or config changes externally
  useEffect(() => {
    if (isOpen) {
        setTempBudget(modelConfig.thinkingBudget);
        setCustomInstruction(modelConfig.systemInstruction || PERSONAS[0].instruction);
        
        // Try to identify active persona by instruction matching
        const matchingPersona = PERSONAS.find(p => p.instruction.trim() === (modelConfig.systemInstruction || '').trim());
        if (matchingPersona) {
            setActivePersonaId(matchingPersona.id);
        } else {
            setActivePersonaId(null);
        }
    }
  }, [isOpen, modelConfig]);

  const handleBudgetChange = (val: number) => {
    setTempBudget(val);
    onModelConfigUpdate({ ...modelConfig, thinkingBudget: val });
  };

  const handlePersonaSelect = (id: string) => {
    const persona = PERSONAS.find(p => p.id === id);
    if (persona) {
        setCustomInstruction(persona.instruction);
        setActivePersonaId(id);
        onModelConfigUpdate({ ...modelConfig, systemInstruction: persona.instruction });
    }
  };

  const handleInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomInstruction(e.target.value);
    setActivePersonaId(null); // Custom overrides persona selection
    onModelConfigUpdate({ ...modelConfig, systemInstruction: e.target.value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>
      
      <div className="relative w-full max-w-4xl bg-midnight-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-display font-semibold text-white tracking-wide">System Configuration</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row">
            
            {/* Sidebar: General Settings */}
            <div className="w-full md:w-1/3 p-6 space-y-8 border-b md:border-b-0 md:border-r border-white/5 bg-white/[0.01]">
                
                {/* Section: Themes */}
                <section>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 font-mono">Interface Theme</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {(Object.values(THEMES) as any[]).map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => onThemeSelect(theme.id)}
                            className={`relative group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                            currentThemeId === theme.id 
                                ? 'bg-brand-primary/10 border-brand-accent/50 ring-1 ring-brand-accent/20' 
                                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                            }`}
                        >
                            <div className="w-5 h-5 rounded-full ring-1 ring-white/10 overflow-hidden flex-shrink-0" 
                                style={{ background: `linear-gradient(135deg, rgb(${theme.colors['--color-brand-primary']}) 0%, rgb(${theme.colors['--color-brand-accent']}) 100%)` }}>
                            </div>
                            <span className={`text-sm font-medium ${currentThemeId === theme.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>{theme.name}</span>
                        </button>
                        ))}
                    </div>
                </section>

                {/* Section: Intelligence */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Thinking Budget</h3>
                        <span className="text-xs font-mono text-brand-glow bg-brand-primary/10 px-2 py-0.5 rounded border border-brand-primary/20">
                            {tempBudget} Tokens
                        </span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
                        <input 
                            type="range" 
                            min="0" 
                            max="16384" 
                            step="1024" 
                            value={tempBudget}
                            onChange={(e) => handleBudgetChange(parseInt(e.target.value))}
                            className="w-full h-2 bg-midnight-950 rounded-lg appearance-none cursor-pointer accent-brand-accent hover:accent-brand-glow"
                        />
                        <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-mono">
                            <span>Off (Speed)</span>
                            <span>16k (Deep)</span>
                        </div>
                    </div>
                </section>

            </div>

            {/* Main: Persona Selection */}
             <div className="w-full md:w-2/3 p-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 font-mono">Select System Persona</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {PERSONAS.map(persona => (
                        <button
                            key={persona.id}
                            onClick={() => handlePersonaSelect(persona.id)}
                            className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 group h-full ${
                                activePersonaId === persona.id
                                ? 'bg-brand-primary/10 border-brand-accent/50 ring-1 ring-brand-accent/20'
                                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`font-display font-semibold ${activePersonaId === persona.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                    {persona.name}
                                </span>
                                {activePersonaId === persona.id && (
                                    <div className="h-2 w-2 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(var(--color-brand-accent))]"></div>
                                )}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-glow/80 mb-2 font-mono">
                                {persona.role}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-400">
                                {persona.description}
                            </p>
                        </button>
                    ))}
                </div>

                <div className="border-t border-white/10 pt-6">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 font-mono">Active System Instruction</h4>
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-primary/20 to-brand-accent/20 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition duration-500"></div>
                        <textarea 
                            value={customInstruction}
                            onChange={handleInstructionChange}
                            className="relative w-full h-32 bg-midnight-950/80 border border-white/10 rounded-xl p-4 text-xs font-mono text-slate-300 focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/50 resize-none leading-relaxed custom-scrollbar"
                            placeholder="Define the AI's behavior, tone, and constraints..."
                        />
                    </div>
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-black/20 text-center border-t border-white/5 flex-shrink-0">
            <button 
                onClick={onClose}
                className="px-8 py-2 bg-white text-midnight-950 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors"
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};