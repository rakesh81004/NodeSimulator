import React, { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { useTheme } from '../../utils/themeConfig';
import { computeStepDiff } from '../../animation/diffEngine';
import { ObjectModificationDiff } from '../../types/diff';
import { Sparkles, ArrowRight, Play, CheckCircle2 } from 'lucide-react';

export const StepTransformationCard: React.FC = () => {
  const {
    simulation,
    currentStepIndex,
    setCurrentStepIndex,
    isTransitioning,
    playStepTransition,
  } = useSimulationStore();
  const { themeColor } = useTheme();

  if (!simulation || simulation.steps.length <= 1) return null;

  const currentStep = simulation.steps[currentStepIndex];
  const nextStep = currentStepIndex < simulation.steps.length - 1 ? simulation.steps[currentStepIndex + 1] : null;

  // Calculate diff plan between current step and next step
  const diffPlan = nextStep
    ? computeStepDiff(currentStep, nextStep, currentStepIndex, currentStepIndex + 1)
    : null;

  if (!nextStep || !diffPlan) {
    return (
      <div className="bg-surface-900/90 border-t-2 border-slate-600 px-4 py-2 flex items-center justify-between text-xs text-slate-400 font-mono select-none">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Final Step Reached. Algorithm dry run complete!</span>
        </div>
      </div>
    );
  }

  // Extract human-readable diff changes
  const changesList: string[] = [];

  diffPlan.modifiedObjects.forEach((mod: ObjectModificationDiff) => {
    if (mod.type === 'pointer' && mod.pointerMoved) {
      changesList.push(`Pointer "${(mod.to as any).data?.label || 'ptr'}" moves to index ${mod.pointerMoved.newIndex ?? '?'}`);
    } else if (mod.type === 'range' && mod.rangeChanged) {
      const r = (mod.to as any).data;
      changesList.push(`Window "${r.label || 'range'}" shifts to [${r.startIndex}..${r.endIndex}]`);
    } else if (mod.type === 'variable' && mod.valueChanged) {
      changesList.push(`Variable "${(mod.to as any).data?.name}" updates from ${mod.valueChanged.oldValue} → ${mod.valueChanged.newValue}`);
    } else if (mod.type === 'array' || mod.type === 'string') {
      const swapped = mod.arrayChanged?.swappedIndices;
      if (swapped) {
        changesList.push(`Swap elements at indices [${swapped[0]} ↔ ${swapped[1]}]`);
      } else {
        changesList.push(`${mod.type === 'array' ? 'Array' : 'String'} elements updated`);
      }
    } else if (mod.type === 'stack') {
      const stackChanged = mod.stackChanged;
      if (stackChanged) {
        if (stackChanged.newAction === 'push') {
          const el = (mod.to as any).data?.elements?.slice(-1)[0];
          changesList.push(`Stack: Push "${el?.value || 'item'}"`);
        } else if (stackChanged.newAction === 'pop') {
          changesList.push(`Stack: Pop off top element`);
        } else if (stackChanged.newAction === 'peek') {
          const el = (mod.to as any).data?.elements?.slice(-1)[0];
          changesList.push(`Stack: Peek top element "${el?.value || 'item'}"`);
        }
      }
    }
  });

  if (diffPlan.addedObjects.length > 0) {
    changesList.push(`${diffPlan.addedObjects.length} new node(s) appear`);
  }

  if (changesList.length === 0) {
    changesList.push('State transition and highlight progression');
  }

  return (
    <div className="bg-surface-900/95 border-t-2 border-slate-600 px-3 md:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs select-none backdrop-blur-md z-20">
      {/* Left: Transformation Flow Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-mono font-bold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Next Step Transformation:</span>
        </div>

        {/* Step K -> Step K+1 */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
            Step {currentStepIndex + 1}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
          <span className="px-2 py-0.5 rounded-lg bg-sky-950 text-sky-300 border border-sky-600/50 font-bold">
            Step {currentStepIndex + 2}
          </span>
        </div>

        {/* Specific Diff Changes Badges */}
        <div className="hidden lg:flex items-center gap-1.5">
          {changesList.slice(0, 3).map((change, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-md bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] font-mono"
            >
              • {change}
            </span>
          ))}
        </div>
      </div>

      {/* Right: Quick Action Preview / Next Step */}
      <div className="flex items-center gap-2 self-end md:self-auto">
        <button
          type="button"
          disabled={isTransitioning}
          onClick={() => playStepTransition(currentStepIndex, currentStepIndex + 1)}
          className="px-3 py-1.5 rounded-xl text-white font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap cursor-pointer shadow-md"
          style={{
            background: `linear-gradient(to right, ${themeColor}, ${themeColor}99)`,
          }}
          title="Animate to Next Step"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Fade into Step {currentStepIndex + 2}</span>
        </button>
      </div>
    </div>
  );
};
