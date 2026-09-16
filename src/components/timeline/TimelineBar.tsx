import React, { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import {
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileEdit,
} from 'lucide-react';

export const TimelineBar: React.FC = () => {
  const {
    simulation,
    currentStepIndex,
    setCurrentStepIndex,
    createNextStep,
    duplicateStepAt,
    deleteStepAt,
    updateStepMetadata,
    isTransitioning,
  } = useSimulationStore();

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);

  if (!simulation) return null;

  const isLight = simulation.settings?.theme === 'light';
  const steps = simulation.steps;
  const activeStep = steps[currentStepIndex];

  const handleStepNameChange = (stepId: string, newName: string) => {
    updateStepMetadata(stepId, newName);
  };

  return (
    <div className={`border-t flex flex-col z-30 select-none ${isLight ? 'bg-white border-gray-200' : 'bg-surface-900 border-slate-800'}`}>
      {/* Step Iteration Description Drawer */}
      {showNotesDrawer && activeStep && (
        <div className={`px-4 md:px-6 py-2.5 border-b flex items-center gap-3 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-surface-950/90 border-slate-800/80'}`}>
          <span className={`text-[11px] font-mono font-bold whitespace-nowrap ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
            Step {currentStepIndex + 1} Note:
          </span>
          <input
            type="text"
            placeholder="e.g. i=0, j=1, push bracket onto stack..."
            value={activeStep.description || ''}
            onChange={(e) => updateStepMetadata(activeStep.id, undefined, e.target.value)}
            className={`flex-1 border rounded-lg px-3 py-1 text-xs focus:border-indigo-500 outline-none font-mono ${
              isLight ? 'bg-white border-gray-300 text-black placeholder-gray-400' : 'bg-slate-900 border-slate-800 text-white placeholder-slate-600'
            }`}
          />
        </div>
      )}

      {/* Main Timeline Row */}
      <div className="h-14 md:h-16 px-2 md:px-4 flex items-center justify-between gap-2 md:gap-4">
        {/* Left: Step navigation arrows */}
        <div className={`flex items-center gap-0.5 md:gap-1 ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>
          <button
            type="button"
            disabled={currentStepIndex === 0 || isTransitioning}
            onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
            className={`p-1 md:p-1.5 rounded-lg disabled:opacity-30 transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-slate-800'}`}
            title="Previous step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`text-[11px] md:text-xs font-mono font-semibold px-0.5 md:px-1 whitespace-nowrap ${isLight ? 'text-gray-700' : 'text-slate-300'}`}>
            {currentStepIndex + 1}/{steps.length}
          </span>
          <button
            type="button"
            disabled={currentStepIndex >= steps.length - 1 || isTransitioning}
            onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
            className={`p-1 md:p-1.5 rounded-lg disabled:opacity-30 transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-slate-800'}`}
            title="Next step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Scrollable Step Cards */}
        <div className="flex-1 flex items-center gap-1.5 md:gap-2 overflow-x-auto py-1 px-1 scrollbar-thin">
          {steps.map((step, idx) => {
            const isActive = idx === currentStepIndex;

            return (
              <div
                key={step.id}
                onClick={() => !isTransitioning && setCurrentStepIndex(idx)}
                className={`relative flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl cursor-pointer transition-all min-w-[110px] md:min-w-[140px] max-w-[180px] group border flex-shrink-0 ${
                  isActive
                    ? isLight
                      ? 'bg-indigo-50 border-indigo-400 text-gray-900'
                      : 'bg-indigo-600/20 border-indigo-500 text-white shadow-glow-indigo'
                    : isLight
                      ? 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {/* Step Badge */}
                <div
                  className={`w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[9px] md:text-[10px] font-mono font-bold ${
                    isActive ? 'bg-indigo-500 text-white' : isLight ? 'bg-gray-200 text-gray-600' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {idx + 1}
                </div>

                {/* Step Title */}
                <div className="flex-1 truncate">
                  {editingStepId === step.id ? (
                    <input
                      type="text"
                      autoFocus
                      className={`w-full bg-transparent text-xs font-semibold outline-none border-b border-indigo-400 ${isLight ? 'text-black' : 'text-white'}`}
                      value={step.name}
                      onChange={(e) => handleStepNameChange(step.id, e.target.value)}
                      onBlur={() => setEditingStepId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') setEditingStepId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingStepId(step.id);
                      }}
                      className="text-[11px] md:text-xs font-semibold truncate block"
                      title="Double click to rename"
                    >
                      {step.name}
                    </span>
                  )}
                </div>

                {/* Quick actions on active step */}
                {isActive && (
                  <div className="hidden sm:flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateStepAt(idx);
                      }}
                      className={`p-1 rounded ${isLight ? 'text-gray-400 hover:text-black hover:bg-gray-100' : 'text-slate-400 hover:text-white hover:bg-slate-800/80'}`}
                      title="Duplicate"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStepAt(idx);
                        }}
                        className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-500/10"
                        title="Delete"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Actions: Notes Toggle & "+ Create Next Step" Button */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            type="button"
            onClick={() => setShowNotesDrawer(!showNotesDrawer)}
            className={`p-1.5 md:p-2 rounded-xl border text-xs font-medium flex items-center gap-1 transition-colors ${
              showNotesDrawer
                ? isLight
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                  : 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                : isLight
                  ? 'bg-white border-gray-300 text-gray-500 hover:text-gray-700'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Step Notes"
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Note</span>
          </button>

          {/* Core Feature: "+ Next Step" */}
          <button
            type="button"
            onClick={createNextStep}
            className="px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-glow-indigo transition-all transform active:scale-95 whitespace-nowrap"
            title="Create next iteration step (Deep clones current step)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">+ Next Step</span>
            <span className="sm:hidden">+ Next</span>
          </button>
        </div>
      </div>
    </div>
  );
};
