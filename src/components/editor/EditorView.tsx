import React, { useEffect, useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { EditorHeader } from './EditorHeader';
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { PropertiesPanel } from './PropertiesPanel';
import { TimelineBar } from '../timeline/TimelineBar';
import { StepTransformationCard } from './StepTransformationCard';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { CodeImportModal } from '../dashboard/CodeImportModal';
import { StackTimelineView } from './StackTimelineView';
import { Layers } from 'lucide-react';

interface Props {
  onBackToDashboard: () => void;
}

export const EditorView: React.FC<Props> = ({ onBackToDashboard }) => {
  const {
    simulation,
    selectedObjectId,
    selectedObjectIds,
    deleteSelectedObjects,
    duplicateSelectedObjects,
    copySelectedObjects,
    pasteObject,
    moveSelectedObjectsBy,
    isPlaying,
    runFullSimulation,
    stopPlayback,
    loadSimulation,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useSimulationStore();

  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isCodeImportOpen, setIsCodeImportOpen] = useState(false);
  const [isPropertiesOpenMobile, setIsPropertiesOpenMobile] = useState(false);
  const [showStackTimeline, setShowStackTimeline] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          stopPlayback();
        } else {
          runFullSimulation();
        }
        return;
      }

      const hasSelection = Boolean(selectedObjectId) || selectedObjectIds.length > 0;

      if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelection) {
        e.preventDefault();
        deleteSelectedObjects();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && hasSelection) {
        e.preventDefault();
        duplicateSelectedObjects();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && hasSelection) {
        e.preventDefault();
        copySelectedObjects();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteObject();
        return;
      }

      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (hasSelection && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 2;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        moveSelectedObjectsBy(dx, dy);
        // Position changes should also save to history
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedObjectId,
    selectedObjectIds,
    isPlaying,
    deleteSelectedObjects,
    duplicateSelectedObjects,
    copySelectedObjects,
    pasteObject,
    moveSelectedObjectsBy,
    runFullSimulation,
    stopPlayback,
    undo,
    redo,
  ]);

  if (!simulation) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-950 text-slate-400 font-mono">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-950 overflow-hidden select-none">
      {/* Top Header */}
      <EditorHeader
        onBackToDashboard={onBackToDashboard}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenCodeImport={() => setIsCodeImportOpen(true)}
        onTogglePropertiesMobile={() => setIsPropertiesOpenMobile(!isPropertiesOpenMobile)}
        onToggleStackTimeline={() => setShowStackTimeline(!showStackTimeline)}
        showStackTimeline={showStackTimeline}
      />

      {/* Main Studio Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbar */}
        <Toolbar />

        {/* Center Interactive Canvas */}
        <Canvas />

        {/* Right Properties Panel */}
        <PropertiesPanel onCloseMobile={() => setIsPropertiesOpenMobile(false)} />
      </div>

      {/* Step Transformation & Comparison Bar */}
      <StepTransformationCard />

      {/* Stack Timeline Visualization (toggleable) */}
      {showStackTimeline && <StackTimelineView maxStates={5} showAnimation={true} />}

      {/* Bottom Step Timeline */}
      <TimelineBar />

      {/* Code Import Modal */}
      <CodeImportModal
        isOpen={isCodeImportOpen}
        onClose={() => setIsCodeImportOpen(false)}
        onSuccess={(id) => {
          loadSimulation(id);
        }}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
};
