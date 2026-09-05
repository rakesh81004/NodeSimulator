import React, { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { useTheme } from '../../utils/themeConfig';
import { PlaybackControls } from '../playback/PlaybackControls';
import { ThemePicker } from './ThemePicker';
import {
  ArrowLeft,
  CheckCircle2,
  Cloud,
  AlertCircle,
  Download,
  HelpCircle,
  Save,
  Code2,
  Sliders,
  Layers,
} from 'lucide-react';

interface Props {
  onBackToDashboard: () => void;
  onOpenShortcuts: () => void;
  onOpenCodeImport: () => void;
  onTogglePropertiesMobile?: () => void;
  onToggleStackTimeline?: () => void;
  showStackTimeline?: boolean;
}

export const EditorHeader: React.FC<Props> = ({
  onBackToDashboard,
  onOpenShortcuts,
  onOpenCodeImport,
  onTogglePropertiesMobile,
  onToggleStackTimeline,
  showStackTimeline = false,
}) => {
  const {
    simulation,
    setSimulationTitle,
    autosaveStatus,
    lastSavedAt,
    saveSimulation,
    selectedObjectId,
  } = useSimulationStore();
  const { themeColor } = useTheme();

  const [isEditingTitle, setIsEditingTitle] = useState(false);

  if (!simulation) return null;

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(simulation, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `${simulation.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_v${simulation.schemaVersion}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <header className="h-14 bg-surface-900 border-b border-slate-800 px-2 md:px-4 flex items-center justify-between gap-2 md:gap-4 select-none z-30">
      {/* Left: Back button + Title */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="p-1.5 md:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                autoFocus
                className="bg-slate-950 border border-indigo-500 rounded px-2 py-0.5 text-xs md:text-sm font-bold text-white outline-none font-sans"
                value={simulation.name}
                onChange={(e) => setSimulationTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setIsEditingTitle(false);
                }}
              />
            ) : (
              <h1
                onDoubleClick={() => setIsEditingTitle(true)}
                className="text-xs md:text-sm font-bold text-slate-100 hover:text-indigo-300 cursor-pointer transition-colors truncate max-w-[120px] sm:max-w-[200px]"
                title="Double click to edit simulation title"
              >
                {simulation.name}
              </h1>
            )}
            <span className="hidden sm:inline text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              v{simulation.schemaVersion}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 mt-0.5">
            {autosaveStatus === 'saving' && (
              <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                <Cloud className="w-3 h-3 animate-pulse" /> Saving...
              </span>
            )}
            {autosaveStatus === 'saved' && (
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Saved {lastSavedAt ? `at ${lastSavedAt}` : '✓'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Playback Controls */}
      <div className="flex items-center justify-center">
        <PlaybackControls />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 md:gap-2 justify-end">
        {/* Import Code Quick Action Button */}
        <button
          type="button"
          onClick={onOpenCodeImport}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          style={{
            backgroundColor: `${themeColor}33`,
            borderColor: `${themeColor}66`,
            color: `${themeColor}cc`,
          }}
          title="Import Java DSA Code to generate dry run"
        >
          <Code2 className="w-3.5 h-3.5" style={{ color: themeColor }} />
          <span className="hidden md:inline">Import Code</span>
        </button>

        {/* Stack Timeline Toggle Button */}
        {onToggleStackTimeline && (
          <button
            type="button"
            onClick={onToggleStackTimeline}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm ${
              showStackTimeline 
                ? 'bg-purple-600/20 border-purple-500/50 text-purple-300' 
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-300'
            }`}
            title="Toggle Stack Timeline Visualization"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Stack Timeline</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => saveSimulation()}
          className="p-1.5 md:px-2.5 md:py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
          title="Save"
        >
          <Save className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline">Save</span>
        </button>

        <button
          type="button"
          onClick={handleExportJson}
          className="p-1.5 md:px-2.5 md:py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors hidden sm:flex"
          title="Export JSON"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden lg:inline">Export</span>
        </button>

        {/* Mobile toggle for properties panel */}
        {selectedObjectId && onTogglePropertiesMobile && (
          <button
            type="button"
            onClick={onTogglePropertiesMobile}
            className="p-1.5 rounded-lg text-indigo-400 bg-indigo-500/20 border border-indigo-500/40 lg:hidden"
            title="Inspect Selected Properties"
          >
            <Sliders className="w-4 h-4" />
          </button>
        )}

        <ThemePicker />
        
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden md:block"
          title="Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
