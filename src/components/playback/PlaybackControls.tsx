import React from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Gauge,
} from 'lucide-react';

export const PlaybackControls: React.FC = () => {
  const {
    simulation,
    currentStepIndex,
    setCurrentStepIndex,
    isPlaying,
    runFullSimulation,
    stopPlayback,
    playbackSpeed,
    setPlaybackSpeed,
    loopPlayback,
    setLoopPlayback,
    isTransitioning,
    playStepTransition,
  } = useSimulationStore();

  if (!simulation || simulation.steps.length === 0) return null;

  const isLight = simulation.settings?.theme === 'light';
  const totalSteps = simulation.steps.length;

  const handlePlayToggle = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      runFullSimulation();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0 && !isTransitioning) {
      playStepTransition(currentStepIndex, currentStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1 && !isTransitioning) {
      playStepTransition(currentStepIndex, currentStepIndex + 1);
    }
  };

  const speeds = [0.25, 0.5, 1.0, 1.5, 2.0];

  return (
    <div className={`flex items-center gap-1.5 md:gap-3 backdrop-blur border px-2.5 md:px-4 py-1.5 md:py-2 rounded-2xl shadow-xl select-none ${
      isLight ? 'bg-white/95 border-gray-200' : 'bg-surface-900/95 border-slate-800'
    }`}>
      {/* Step Back button */}
      <button
        type="button"
        disabled={currentStepIndex === 0 || isPlaying}
        onClick={handlePrev}
        className={`p-1 md:p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
          isLight ? 'text-gray-500 hover:text-black hover:bg-gray-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title="Previous Step"
      >
        <SkipBack className="w-3.5 h-3.5 md:w-4 md:h-4" />
      </button>

      {/* Main Play / Pause Button */}
      <button
        type="button"
        onClick={handlePlayToggle}
        className={`px-2.5 md:px-3.5 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
          isPlaying
            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-glow-amber'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-glow-indigo'
        }`}
        title="Play Animation (Space)"
      >
        {isPlaying ? (
          <>
            <Pause className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" />
            <span className="hidden sm:inline">Pause</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" />
            <span className="hidden sm:inline">Run</span>
          </>
        )}
      </button>

      {/* Step Forward button */}
      <button
        type="button"
        disabled={currentStepIndex >= totalSteps - 1 || isPlaying}
        onClick={handleNext}
        className={`p-1 md:p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
          isLight ? 'text-gray-500 hover:text-black hover:bg-gray-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title="Next Step"
      >
        <SkipForward className="w-3.5 h-3.5 md:w-4 md:h-4" />
      </button>

      <div className={`hidden sm:block h-4 w-px mx-0.5 ${isLight ? 'bg-gray-200' : 'bg-slate-800'}`} />

      {/* Speed Multiplier Dropdown */}
      <div className={`hidden sm:flex items-center gap-1 text-xs font-mono ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>
        <Gauge className={`w-3.5 h-3.5 ${isLight ? 'text-indigo-500' : 'text-indigo-400'}`} />
        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          className={`border rounded px-1.5 py-0.5 text-xs outline-none cursor-pointer focus:border-indigo-500 ${
            isLight ? 'bg-white border-gray-300 text-gray-700' : 'bg-slate-950 border-slate-800 text-slate-200'
          }`}
        >
          {speeds.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>
      </div>

      {/* Loop Toggle Button */}
      <button
        type="button"
        onClick={() => setLoopPlayback(!loopPlayback)}
        className={`p-1 md:p-1.5 rounded-lg text-xs hidden sm:flex items-center gap-1 transition-colors ${
          loopPlayback
            ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/30'
            : isLight ? 'text-gray-400 hover:text-gray-600' : 'text-slate-500 hover:text-slate-300'
        }`}
        title="Toggle Loop Playback"
      >
        <Repeat className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
