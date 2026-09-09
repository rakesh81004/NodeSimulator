import { create } from 'zustand';
import {
  SimulationData,
  StepModel,
  VisualNode,
  VisualNodeType,
  ArrayVisualNode,
  StringVisualNode,
  VariableVisualNode,
  ValueVisualNode,
  PointerVisualNode,
  TextVisualNode,
  ArrowVisualNode,
  HighlightVisualNode,
  StackVisualNode,
  RangeVisualNode,
} from '../types/simulation';
import { deepClone } from '../utils/deepClone';
import { generateId } from '../utils/idGenerator';
import { lastCanvasMouse } from '../utils/cursorTracker';
import { api } from '../persistence/api';
import { localRecovery } from '../persistence/localRecovery';
import { computeStepDiff } from '../animation/diffEngine';
import { StepDiffPlan } from '../types/diff';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface SimulationState {
  simulation: SimulationData | null;
  currentStepIndex: number;
  selectedObjectId: string | null;
  // Multi-selection group (e.g. from a marquee drag-select). When non-empty,
  // this is the authoritative "selected" set; selectedObjectId still tracks
  // the primary/last-clicked node for the Properties panel and quick actions.
  selectedObjectIds: string[];
  // Figma-style armed tool: when set, the next canvas click-drag draws a new
  // node of this type at that geometry instead of marquee-selecting. Cleared
  // after one shape is placed (or Escape).
  activeTool: VisualNodeType | null;
  copiedObjects: VisualNode[] | null;
  
  // Canvas viewport
  zoom: number;
  pan: { x: number; y: number };
  
  // Playback & Animation
  isPlaying: boolean;
  playbackSpeed: number; // 0.25, 0.5, 1.0, 1.5, 2.0
  activeDiffPlan: StepDiffPlan | null;
  isTransitioning: boolean;
  transitionProgress: number;
  loopPlayback: boolean;
  
  // Undo/Redo System
  history: SimulationData[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  _dragResetCounter: number;
  
  // Save & Sync state
  autosaveStatus: AutosaveStatus;
  lastSavedAt: string | null;
  saveError: string | null;

  // Actions: Simulation Lifecycle
  setSimulation: (sim: SimulationData) => void;
  loadSimulation: (id: string) => Promise<boolean>;
  saveSimulation: () => Promise<boolean>;
  triggerAutosave: () => void;
  updateSettings: (settings: Partial<SimulationData['settings']>) => void;
  setSimulationTitle: (name: string, description?: string) => void;
  regenerateSteps: (steps: StepModel[]) => void;

  // Actions: Step Management
  setCurrentStepIndex: (index: number) => void;
  createNextStep: () => void; // Core Deep-Clone Feature!
  insertStepAt: (index: number) => void;
  duplicateStepAt: (index: number) => void;
  deleteStepAt: (index: number) => void;
  reorderSteps: (fromIndex: number, toIndex: number) => void;
  updateStepMetadata: (stepId: string, name?: string, description?: string, durationMs?: number) => void;

  // Actions: Visual Node Manipulation
  setSelectedObjectId: (id: string | null) => void;
  setSelectedObjectIds: (ids: string[]) => void;
  toggleSelectedObjectId: (id: string) => void;
  setActiveTool: (tool: VisualNodeType | null) => void;
  addObject: (type: VisualNodeType, customPos?: { x: number; y: number }, customSize?: { width: number; height: number }) => VisualNode;
  updateObject: (id: string, updates: Partial<VisualNode> | { data: any; style?: any }, skipHistory?: boolean) => void;
  deleteObject: (id: string) => void;
  deleteSelectedObjects: () => void;
  duplicateObject: (id: string) => void;
  duplicateSelectedObjects: () => void;
  copyObject: (id: string) => void;
  copySelectedObjects: () => void;
  pasteObject: () => void;
  moveObjectBy: (id: string, dx: number, dy: number) => void;
  moveSelectedObjectsBy: (dx: number, dy: number) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  // Actions: Canvas & Playback
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  resetView: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setLoopPlayback: (loop: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setTransitionProgress: (progress: number) => void;
  setIsTransitioning: (transitioning: boolean) => void;
  setActiveDiffPlan: (plan: StepDiffPlan | null) => void;
  playStepTransition: (fromIdx: number, toIdx: number) => Promise<void>;
  runFullSimulation: () => Promise<void>;
  stopPlayback: () => void;
  resetDragState: () => void;
  
  // Undo/Redo Actions
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
}

let autosaveTimer: any = null;

export const useSimulationStore = create<SimulationState>((set, get) => ({
  simulation: null,
  currentStepIndex: 0,
  selectedObjectId: null,
  selectedObjectIds: [],
  activeTool: null,
  copiedObjects: null,
  zoom: 1.0,
  pan: { x: 0, y: 0 },
  isPlaying: false,
  playbackSpeed: 1.0,
  activeDiffPlan: null,
  isTransitioning: false,
  transitionProgress: 0,
  loopPlayback: false,
  autosaveStatus: 'idle',
  lastSavedAt: null,
  saveError: null,
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
  _dragResetCounter: 0,

  setSimulation: (sim) => {
    set({
      simulation: sim,
      currentStepIndex: 0,
      selectedObjectId: null,
      activeDiffPlan: null,
      isPlaying: false,
      isTransitioning: false,
      autosaveStatus: 'saved',
      lastSavedAt: new Date().toLocaleTimeString(),
      history: [deepClone(sim)], // Initialize history with initial state
      historyIndex: 0,
      canUndo: false,
      canRedo: false,
    });
    localRecovery.saveDraft(sim);
  },

  loadSimulation: async (id: string) => {
    set({ autosaveStatus: 'saving' });
    try {
      const { simulation } = await api.getSimulation(id);
      get().setSimulation(simulation);
      return true;
    } catch (err: any) {
      // Check offline recovery fallback
      const cached = localRecovery.getDraft(id);
      if (cached) {
        console.warn('[Store] Loaded simulation from local recovery cache', id);
        get().setSimulation(cached.data);
        set({ autosaveStatus: 'offline', saveError: 'Loaded offline cached version.' });
        return true;
      }
      set({ autosaveStatus: 'error', saveError: err.message || 'Failed to load simulation' });
      return false;
    }
  },

  saveToHistory: () => {
    const { simulation, history, historyIndex } = get();
    if (!simulation) return;

    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    
    // Add current state to history
    newHistory.push(deepClone(simulation));
    
    // Limit history size to prevent memory issues
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canUndo: newHistory.length > 1,
      canRedo: false,
    });
  },

  undo: () => {
    const { history, historyIndex, currentStepIndex } = get();
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    const previousState = history[newIndex];
    const safeStepIdx = Math.max(0, Math.min(currentStepIndex, previousState.steps.length - 1));

    set({
      simulation: deepClone(previousState),
      currentStepIndex: safeStepIdx,
      selectedObjectId: null,
      selectedObjectIds: [],
      activeDiffPlan: null,
      isTransitioning: false,
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: true,
      autosaveStatus: 'saved',
      lastSavedAt: new Date().toLocaleTimeString(),
      _dragResetCounter: (get()._dragResetCounter || 0) + 1,
    });

    localRecovery.saveDraft(previousState);
  },

  redo: () => {
    const { history, historyIndex, currentStepIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const nextState = history[newIndex];
    const safeStepIdx = Math.max(0, Math.min(currentStepIndex, nextState.steps.length - 1));

    set({
      simulation: deepClone(nextState),
      currentStepIndex: safeStepIdx,
      selectedObjectId: null,
      selectedObjectIds: [],
      activeDiffPlan: null,
      isTransitioning: false,
      historyIndex: newIndex,
      canUndo: true,
      canRedo: newIndex < history.length - 1,
      autosaveStatus: 'saved',
      lastSavedAt: new Date().toLocaleTimeString(),
      _dragResetCounter: (get()._dragResetCounter || 0) + 1,
    });

    localRecovery.saveDraft(nextState);
  },

  resetDragState: () => {
    // This is a no-op function that Canvas components can call
    // The actual drag state is managed locally in the Canvas component
    // This function exists to provide a clean interface for drag state reset
    console.log('[Store] Drag state reset requested');
  },

  saveSimulation: async () => {
    const { simulation } = get();
    if (!simulation) return false;

    set({ autosaveStatus: 'saving', saveError: null });
    try {
      const { simulation: saved } = await api.updateSimulation(simulation.id, simulation);
      localRecovery.saveDraft(saved);
      set({
        simulation: saved,
        autosaveStatus: 'saved',
        lastSavedAt: new Date().toLocaleTimeString(),
        saveError: null,
      });
      return true;
    } catch (err: any) {
      localRecovery.saveDraft(simulation);
      set({
        autosaveStatus: 'error',
        saveError: err.message || 'Failed to save to server. Saved locally.',
      });
      return false;
    }
  },

  triggerAutosave: () => {
    const { simulation } = get();
    if (!simulation) return;

    localRecovery.saveDraft(simulation);
    set({ autosaveStatus: 'saving' });

    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
    }

    autosaveTimer = setTimeout(async () => {
      await get().saveSimulation();
    }, 1000); // 1s debounce
  },

  updateSettings: (settings) => {
    const { simulation } = get();
    if (!simulation) return;
    const next = {
      ...simulation,
      settings: { ...simulation.settings, ...settings },
    };
    set({ simulation: next });
    get().triggerAutosave();
  },

  setSimulationTitle: (name, description) => {
    const { simulation } = get();
    if (!simulation) return;
    const next = {
      ...simulation,
      name: name.trim() || simulation.name,
      description: description !== undefined ? description : simulation.description,
    };
    set({ simulation: next });
    get().triggerAutosave();
  },

  regenerateSteps: (steps) => {
    const { simulation } = get();
    if (!simulation || steps.length === 0) return;
    const next: SimulationData = { ...simulation, steps };
    set({
      simulation: next,
      currentStepIndex: 0,
      selectedObjectId: null,
      activeDiffPlan: null,
      isPlaying: false,
      isTransitioning: false,
      history: [deepClone(next)],
      historyIndex: 0,
      canUndo: false,
      canRedo: false,
    });
    localRecovery.saveDraft(next);
    get().triggerAutosave();
  },

  setCurrentStepIndex: (index) => {
    const { simulation } = get();
    if (!simulation || index < 0 || index >= simulation.steps.length) return;
    set({
      currentStepIndex: index,
      selectedObjectId: null,
      activeDiffPlan: null,
      isTransitioning: false,
    });
  },

  // ==========================================
  // CORE FEATURE: DUPLICATE PREVIOUS STEP
  // ==========================================
  createNextStep: () => {
    const { simulation, currentStepIndex } = get();
    if (!simulation) return;

    // Save to history before creating new step
    get().saveToHistory();

    const currentStep = simulation.steps[currentStepIndex];
    const newStepIndex = currentStepIndex + 1;

    // Deep clone all visual nodes to preserve identical object IDs for diffing!
    // This ensures positions, styles, and all properties are preserved
    const clonedObjects = deepClone(currentStep.objects);
    
    const newStepId = generateId('step');

    const newStep: StepModel = {
      id: newStepId,
      name: `Step ${newStepIndex + 1}`,
      description: currentStep.description ? `Continuation of Step ${currentStepIndex + 1}` : '',
      durationMs: currentStep.durationMs || 800,
      objects: clonedObjects,
    };

    const newSteps = [...simulation.steps];
    newSteps.splice(newStepIndex, 0, newStep);

    const updatedSimulation: SimulationData = {
      ...simulation,
      steps: newSteps,
    };

    set({
      simulation: updatedSimulation,
      currentStepIndex: newStepIndex,
      selectedObjectId: null,
      activeDiffPlan: null,
      isTransitioning: false,
    });

    get().triggerAutosave();
  },

  insertStepAt: (index) => {
    const { simulation } = get();
    if (!simulation) return;

    // When inserting a step, try to preserve positions from adjacent steps
    let objectsToCopy: VisualNode[] = [];
    
    // Prefer previous step if available
    if (index > 0 && simulation.steps[index - 1]) {
      objectsToCopy = deepClone(simulation.steps[index - 1].objects);
    } 
    // Otherwise use next step if available
    else if (index < simulation.steps.length && simulation.steps[index]) {
      objectsToCopy = deepClone(simulation.steps[index].objects);
    }

    const newStep: StepModel = {
      id: generateId('step'),
      name: `Step ${index + 1}`,
      description: '',
      durationMs: 800,
      objects: objectsToCopy, // Preserve positions from adjacent step
    };

    const newSteps = [...simulation.steps];
    newSteps.splice(index, 0, newStep);

    set({
      simulation: { ...simulation, steps: newSteps },
      currentStepIndex: index,
      selectedObjectId: null,
    });
    get().triggerAutosave();
  },

  duplicateStepAt: (index) => {
    const { simulation } = get();
    if (!simulation || index < 0 || index >= simulation.steps.length) return;

    const stepToCopy = simulation.steps[index];
    const clonedStep: StepModel = {
      id: generateId('step'),
      name: `${stepToCopy.name} (Copy)`,
      description: stepToCopy.description,
      durationMs: stepToCopy.durationMs,
      objects: deepClone(stepToCopy.objects), // Deep clone preserves positions
    };

    const newSteps = [...simulation.steps];
    newSteps.splice(index + 1, 0, clonedStep);

    set({
      simulation: { ...simulation, steps: newSteps },
      currentStepIndex: index + 1,
      selectedObjectId: null,
    });
    get().triggerAutosave();
  },

  deleteStepAt: (index) => {
    const { simulation, currentStepIndex } = get();
    if (!simulation || simulation.steps.length <= 1) return; // Keep at least 1 step

    const newSteps = simulation.steps.filter((_, i) => i !== index);
    const nextIndex = Math.min(currentStepIndex, newSteps.length - 1);

    set({
      simulation: { ...simulation, steps: newSteps },
      currentStepIndex: nextIndex,
      selectedObjectId: null,
    });
    get().triggerAutosave();
  },

  reorderSteps: (fromIndex, toIndex) => {
    const { simulation, currentStepIndex } = get();
    if (!simulation || fromIndex === toIndex) return;

    const newSteps = [...simulation.steps];
    const [moved] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, moved);

    let nextCurrent = currentStepIndex;
    if (currentStepIndex === fromIndex) {
      nextCurrent = toIndex;
    } else if (fromIndex < currentStepIndex && toIndex >= currentStepIndex) {
      nextCurrent = currentStepIndex - 1;
    } else if (fromIndex > currentStepIndex && toIndex <= currentStepIndex) {
      nextCurrent = currentStepIndex + 1;
    }

    set({
      simulation: { ...simulation, steps: newSteps },
      currentStepIndex: nextCurrent,
    });
    get().triggerAutosave();
  },

  updateStepMetadata: (stepId, name, description, durationMs) => {
    const { simulation } = get();
    if (!simulation) return;

    const newSteps = simulation.steps.map((step) => {
      if (step.id !== stepId) return step;
      return {
        ...step,
        name: name !== undefined ? name : step.name,
        description: description !== undefined ? description : step.description,
        durationMs: durationMs !== undefined ? durationMs : step.durationMs,
      };
    });

    set({ simulation: { ...simulation, steps: newSteps } });
    get().triggerAutosave();
  },

  // ==========================================
  // VISUAL OBJECTS MANIPULATION
  // ==========================================
  setSelectedObjectId: (id) => set({ selectedObjectId: id, selectedObjectIds: [] }),

  setSelectedObjectIds: (ids) => set({ selectedObjectIds: ids, selectedObjectId: ids.length === 1 ? ids[0] : null }),

  toggleSelectedObjectId: (id) => {
    const { selectedObjectIds, selectedObjectId } = get();
    // Seed the group from whatever was singly-selected before the first shift-click.
    const base = selectedObjectIds.length > 0 ? selectedObjectIds : (selectedObjectId ? [selectedObjectId] : []);
    const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    set({ selectedObjectIds: next, selectedObjectId: next.length === 1 ? next[0] : null });
  },

  setActiveTool: (tool) => set({ activeTool: tool }),

  addObject: (type, customPos, customSize) => {
    const { simulation, currentStepIndex } = get();
    if (!simulation) throw new Error('No active simulation');

    // Save to history before adding object
    get().saveToHistory();

    const id = generateId(type);
    
    // Calculate position - use custom position if provided, otherwise use default
    let posX = customPos ? customPos.x : 300 + (Math.random() * 40 - 20);
    let posY = customPos ? customPos.y : 220 + (Math.random() * 40 - 20);
    
    // If no custom position and there are previous steps, try to position near existing objects
    if (!customPos && currentStepIndex > 0) {
      const previousStep = simulation.steps[currentStepIndex - 1];
      if (previousStep && previousStep.objects.length > 0) {
        // Find objects of the same type in previous step
        const sameTypeObjects = previousStep.objects.filter(obj => obj.type === type);
        if (sameTypeObjects.length > 0) {
          // Position near the last object of the same type
          const lastSameType = sameTypeObjects[sameTypeObjects.length - 1];
          posX = lastSameType.x + 50; // Offset to the right
          posY = lastSameType.y + 50; // Offset down
        } else {
          // Position near the last object of any type
          const lastObject = previousStep.objects[previousStep.objects.length - 1];
          posX = lastObject.x + 50;
          posY = lastObject.y + 50;
        }
      }
    }

    let newNode: VisualNode;

    switch (type) {
      case 'array': {
        const arrayNode: ArrayVisualNode = {
          id,
          type: 'array',
          x: posX,
          y: posY,
          width: 320,
          height: 80,
          zIndex: 5,
          style: {
            backgroundColor: '#1e293b',
            borderColor: '#38bdf8',
            borderWidth: 2,
            borderRadius: 12,
            color: '#f8fafc',
            fontSize: 18,
          },
          data: {
            name: 'arr',
            showIndexes: true,
            orientation: 'horizontal',
            cellSize: 64,
            elements: [
              { id: `c_${id}_0`, value: 10, highlight: 'none' },
              { id: `c_${id}_1`, value: 20, highlight: 'none' },
              { id: `c_${id}_2`, value: 30, highlight: 'none' },
              { id: `c_${id}_3`, value: 40, highlight: 'none' },
            ],
          },
        };
        newNode = arrayNode;
        break;
      }

      case 'string': {
        const stringNode: StringVisualNode = {
          id,
          type: 'string',
          x: posX,
          y: posY,
          width: 300,
          height: 70,
          zIndex: 5,
          style: {
            backgroundColor: '#1e1b4b',
            borderColor: '#818cf8',
            borderWidth: 2,
            borderRadius: 10,
            color: '#e0e7ff',
            fontSize: 18,
          },
          data: {
            name: 's',
            showIndexes: true,
            cellSize: 55,
            characters: [
              { id: `ch_${id}_0`, value: 'H', highlight: 'none' },
              { id: `ch_${id}_1`, value: 'E', highlight: 'none' },
              { id: `ch_${id}_2`, value: 'L', highlight: 'none' },
              { id: `ch_${id}_3`, value: 'L', highlight: 'none' },
              { id: `ch_${id}_4`, value: 'O', highlight: 'none' },
            ],
          },
        };
        newNode = stringNode;
        break;
      }

      case 'variable': {
        const varNode: VariableVisualNode = {
          id,
          type: 'variable',
          x: posX,
          y: posY,
          width: 150,
          height: 56,
          zIndex: 10,
          style: {
            backgroundColor: '#0f172a',
            borderColor: '#38bdf8',
            borderWidth: 1.5,
            borderRadius: 8,
            color: '#38bdf8',
            fontSize: 16,
          },
          data: {
            name: 'sum',
            value: 0,
            dataType: 'number',
            animationStyle: 'strikethrough',
          },
        };
        newNode = varNode;
        break;
      }

      case 'value': {
        const valueNode: ValueVisualNode = {
          id,
          type: 'value',
          x: posX,
          y: posY,
          width: 100,
          height: 56,
          zIndex: 10,
          style: {
            backgroundColor: '#007aff',
            borderColor: '#000000',
            borderWidth: 2,
            borderRadius: 12,
            color: '#ffffff',
            fontSize: 16,
          },
          data: {
            value: 0,
            dataType: 'number',
            strikethrough: false,
          },
        };
        newNode = valueNode;
        break;
      }

      case 'pointer': {
        // Starts as a free, unattached node -- the user opts in to anchoring
        // it to an array/string index via the Properties panel.
        const pointerNode: PointerVisualNode = {
          id,
          type: 'pointer',
          x: posX,
          y: posY,
          width: 40,
          height: 60,
          zIndex: 15,
          style: {
            color: '#38bdf8',
          },
          data: {
            label: 'i',
            direction: 'down',
            color: '#38bdf8',
            targetNodeId: undefined,
            targetIndex: undefined,
          },
        };
        newNode = pointerNode;
        break;
      }

      case 'text': {
        const textNode: TextVisualNode = {
          id,
          type: 'text',
          x: posX,
          y: posY,
          width: 260,
          height: 48,
          zIndex: 3,
          style: {
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            borderColor: '#334155',
            borderWidth: 1,
            borderRadius: 8,
            color: '#94a3b8',
            fontSize: 14,
          },
          data: {
            text: 'Current Iteration Step Note',
            fontSize: 14,
            fontWeight: 'normal',
            isCallout: false,
          },
        };
        newNode = textNode;
        break;
      }

      case 'arrow': {
        const arrowNode: ArrowVisualNode = {
          id,
          type: 'arrow',
          x: posX,
          y: posY,
          width: 140,
          height: 40,
          zIndex: 4,
          style: {},
          data: {
            label: '',
            startX: posX,
            startY: posY,
            endX: posX + 140,
            endY: posY,
            curved: false,
            arrowHead: 'end',
            color: '#38bdf8',
          },
        };
        newNode = arrowNode;
        break;
      }

      case 'highlight':
      case 'box': {
        const boxNode: HighlightVisualNode = {
          id,
          type: 'highlight',
          x: posX,
          y: posY,
          width: 180,
          height: 120,
          zIndex: 1,
          style: {
            backgroundColor: '#64748b',
            borderColor: '#94a3b8',
            borderWidth: 2,
            borderRadius: 6,
            opacity: 1,
          },
          data: {
            label: '',
            variant: 'filled',
            color: '#94a3b8',
            fillColor: '#64748b',
          },
        };
        newNode = boxNode;
        break;
      }

      case 'stack': {
        const stackNode: StackVisualNode = {
          id,
          type: 'stack',
          x: posX,
          y: posY,
          width: 180,
          height: 220,
          zIndex: 6,
          style: {
            backgroundColor: '#0f172a',
            borderColor: '#6366f1',
            borderWidth: 2,
            borderRadius: 16,
          },
          data: {
            name: 'Stack',
            capacity: 8,
            elements: [
              { id: `stk_${id}_0`, value: 10, highlight: 'none' },
              { id: `stk_${id}_1`, value: 20, highlight: 'none' },
            ],
            lastAction: 'none',
          },
        };
        newNode = stackNode;
        break;
      }

      case 'range': {
        // Starts as a free, unattached node -- the user opts in to anchoring
        // it to an array/string via the Properties panel's "Attach Target".
        const rangeNode: RangeVisualNode = {
          id,
          type: 'range',
          x: posX,
          y: posY,
          width: 200,
          height: 56,
          zIndex: 14,
          style: {
            color: '#8b5cf6',
          },
          data: {
            label: 'Window',
            startLabel: 'L',
            endLabel: 'R',
            targetNodeId: undefined,
            startIndex: 0,
            endIndex: 2,
            variant: 'bracket',
            color: '#8b5cf6',
            showIndices: true,
            showLength: true,
          },
        };
        newNode = rangeNode;
        break;
      }

      default:
        throw new Error(`Unsupported visual node type: ${type}`);
    }

    // A shape drawn by click-dragging the tool (rather than a plain toolbar
    // click) carries its own geometry instead of the type's usual default.
    if (customSize) {
      newNode.width = Math.max(20, Math.round(customSize.width));
      newNode.height = Math.max(20, Math.round(customSize.height));
    }

    // Carry the new object forward into every later step too, so it doesn't
    // vanish once you move past the step it was created on. Each step gets
    // its own deep-cloned copy (same id) so later steps can still be edited
    // independently going forward.
    const newSteps = simulation.steps.map((step, idx) => {
      if (idx < currentStepIndex) return step;
      return {
        ...step,
        objects: [...step.objects, idx === currentStepIndex ? newNode : deepClone(newNode)],
      };
    });

    set({
      simulation: { ...simulation, steps: newSteps },
      selectedObjectId: newNode.id,
    });

    get().triggerAutosave();
    return newNode;
  },

  updateObject: (id, updates, skipHistory = false) => {
    const { simulation, currentStepIndex } = get();
    if (!simulation) return;

    // Save to history before making changes (unless skipped)
    if (!skipHistory) {
      get().saveToHistory();
    }

    const currentStep = simulation.steps[currentStepIndex];
    const newObjects = currentStep.objects.map((obj) => {
      if (obj.id !== id) return obj;
      return {
        ...obj,
        ...updates,
        data: {
          ...(obj.data || {}),
          ...((updates as any).data || {}),
        },
        style: {
          ...(obj.style || {}),
          ...((updates as any).style || {}),
        },
      } as VisualNode;
    });

    const newSteps = [...simulation.steps];
    newSteps[currentStepIndex] = {
      ...currentStep,
      objects: newObjects,
    };

    set({ simulation: { ...simulation, steps: newSteps } });
    get().triggerAutosave();
  },

  deleteObject: (id) => {
    const { simulation, currentStepIndex, selectedObjectId, selectedObjectIds } = get();
    if (!simulation) return;

    // Save to history before deleting object
    get().saveToHistory();

    const currentStep = simulation.steps[currentStepIndex];
    const newObjects = currentStep.objects.filter((obj) => obj.id !== id);

    const newSteps = [...simulation.steps];
    newSteps[currentStepIndex] = {
      ...currentStep,
      objects: newObjects,
    };

    set({
      simulation: { ...simulation, steps: newSteps },
      selectedObjectId: selectedObjectId === id ? null : selectedObjectId,
      selectedObjectIds: selectedObjectIds.filter((x) => x !== id),
    });

    get().triggerAutosave();
  },

  deleteSelectedObjects: () => {
    const { simulation, currentStepIndex, selectedObjectIds, selectedObjectId } = get();
    if (!simulation) return;
    const ids = selectedObjectIds.length > 0 ? selectedObjectIds : (selectedObjectId ? [selectedObjectId] : []);
    if (ids.length === 0) return;

    get().saveToHistory();

    const currentStep = simulation.steps[currentStepIndex];
    const newObjects = currentStep.objects.filter((obj) => !ids.includes(obj.id));

    const newSteps = [...simulation.steps];
    newSteps[currentStepIndex] = { ...currentStep, objects: newObjects };

    set({
      simulation: { ...simulation, steps: newSteps },
      selectedObjectId: null,
      selectedObjectIds: [],
    });

    get().triggerAutosave();
  },

  duplicateObject: (id) => {
    const { simulation, currentStepIndex } = get();
    if (!simulation) return;

    const currentStep = simulation.steps[currentStepIndex];
    const target = currentStep.objects.find((obj) => obj.id === id);
    if (!target) return;

    get().saveToHistory();

    const cloned = deepClone(target);
    cloned.id = generateId(target.type);
    cloned.x += 30;
    cloned.y += 30;

    const updatedStep = {
      ...currentStep,
      objects: [...currentStep.objects, cloned],
    };

    const newSteps = [...simulation.steps];
    newSteps[currentStepIndex] = updatedStep;

    set({
      simulation: { ...simulation, steps: newSteps },
      selectedObjectId: cloned.id,
      selectedObjectIds: [],
    });

    get().triggerAutosave();
  },

  duplicateSelectedObjects: () => {
    const { simulation, currentStepIndex, selectedObjectIds, selectedObjectId } = get();
    if (!simulation) return;
    const ids = selectedObjectIds.length > 0 ? selectedObjectIds : (selectedObjectId ? [selectedObjectId] : []);
    if (ids.length === 0) return;

    const currentStep = simulation.steps[currentStepIndex];
    const targets = currentStep.objects.filter((o) => ids.includes(o.id));
    if (targets.length === 0) return;

    get().saveToHistory();

    // Remap any pointer/range references that pointed at another node in
    // the SAME selected group, so the duplicated group stays linked to
    // itself rather than back to the originals.
    const idMap: Record<string, string> = {};
    const cloned = targets.map((orig) => {
      const clone = deepClone(orig);
      const newId = generateId(orig.type);
      idMap[orig.id] = newId;
      clone.id = newId;
      clone.x += 30;
      clone.y += 30;
      return clone;
    });
    cloned.forEach((node) => {
      const data = (node as any).data;
      if (data?.targetNodeId && idMap[data.targetNodeId]) {
        data.targetNodeId = idMap[data.targetNodeId];
      }
    });

    const updatedStep = { ...currentStep, objects: [...currentStep.objects, ...cloned] };
    const newSteps = [...simulation.steps];
    newSteps[currentStepIndex] = updatedStep;

    set({
      simulation: { ...simulation, steps: newSteps },
      selectedObjectId: cloned.length === 1 ? cloned[0].id : null,
      selectedObjectIds: cloned.map((n) => n.id),
    });

    get().triggerAutosave();
  },

  copyObject: (id) => {
    const { simulation, currentStepIndex } = get();
    if (!simulation) return;
    const target = simulation.steps[currentStepIndex].objects.find((o) => o.id === id);
    if (target) {
      set({ copiedObjects: [deepClone(target)] });
    }
  },

  copySelectedObjects: () => {
    const { simulation, currentStepIndex, selectedObjectIds, selectedObjectId } = get();
    if (!simulation) return;
    const ids = selectedObjectIds.length > 0 ? selectedObjectIds : (selectedObjectId ? [selectedObjectId] : []);
    if (ids.length === 0) return;

    const currentStep = simulation.steps[currentStepIndex];
    const targets = currentStep.objects.filter((o) => ids.includes(o.id));
    if (targets.length > 0) {
      set({ copiedObjects: deepClone(targets) });
    }
  },

  pasteObject: () => {
    const { copiedObjects, simulation, currentStepIndex } = get();
    if (!copiedObjects || copiedObjects.length === 0 || !simulation) return;

    // Paste is a mutation like any other -- without this, Ctrl+Z had nothing
    // to revert to and silently no-op'd right after a paste.
    get().saveToHistory();

    const currentStep = simulation.steps[currentStepIndex];

    // Re-anchor the copied group's bounding-box center under the current
    // mouse position (tracked passively by Canvas as it moves over the
    // canvas), preserving each node's position relative to the others.
    // Falls back to the old fixed offset if the cursor was never over the
    // canvas yet (e.g. paste fired before any mousemove).
    const minX = Math.min(...copiedObjects.map((o) => o.x));
    const minY = Math.min(...copiedObjects.map((o) => o.y));
    const maxX = Math.max(...copiedObjects.map((o) => o.x + o.width));
    const maxY = Math.max(...copiedObjects.map((o) => o.y + o.height));
    const groupCenterX = (minX + maxX) / 2;
    const groupCenterY = (minY + maxY) / 2;

    const hasCursor = lastCanvasMouse.x !== null && lastCanvasMouse.y !== null;
    const offsetX = hasCursor ? (lastCanvasMouse.x as number) - groupCenterX : 24;
    const offsetY = hasCursor ? (lastCanvasMouse.y as number) - groupCenterY : 24;

    // Remap internal cross-references (pointer/range targetNodeId) to the
    // NEW ids when the referenced node was part of the SAME copied group,
    // so a copied pointer+array pair stays linked to each other post-paste.
    const idMap: Record<string, string> = {};
    const pasted = copiedObjects.map((orig) => {
      const clone = deepClone(orig);
      const newId = generateId(orig.type);
      idMap[orig.id] = newId;
      clone.id = newId;
      clone.x += offsetX;
      clone.y += offsetY;
      return clone;
    });
    pasted.forEach((node) => {
      const data = (node as any).data;
      if (data?.targetNodeId && idMap[data.targetNodeId]) {
        data.targetNodeId = idMap[data.targetNodeId];
      }
    });

    const updatedStep = {
      ...currentStep,
      objects: [...currentStep.objects, ...pasted],
    };

    const newSteps = [...simulation.steps];
    newSteps[currentStepIndex] = updatedStep;

    set({
      simulation: { ...simulation, steps: newSteps },
      selectedObjectId: pasted.length === 1 ? pasted[0].id : null,
      selectedObjectIds: pasted.map((n) => n.id),
    });

    get().triggerAutosave();
  },

  moveObjectBy: (id, dx, dy) => {
    const { simulation, currentStepIndex } = get();
    if (!simulation) return;

    // Save to history before moving object
    get().saveToHistory();

    const currentStep = simulation.steps[currentStepIndex];
    const newObjects = currentStep.objects.map((obj) => {
      if (obj.id !== id) return obj;
      return { ...obj, x: obj.x + dx, y: obj.y + dy };
    });

    const newSteps = [...simulation.steps];
    newSteps[currentStepIndex] = { ...currentStep, objects: newObjects };

    set({ simulation: { ...simulation, steps: newSteps } });
    get().triggerAutosave();
  },

  moveSelectedObjectsBy: (dx, dy) => {
    const { simulation, currentStepIndex, selectedObjectIds, selectedObjectId } = get();
    if (!simulation) return;
    const ids = selectedObjectIds.length > 0 ? selectedObjectIds : (selectedObjectId ? [selectedObjectId] : []);
    if (ids.length === 0) return;

    get().saveToHistory();

    const currentStep = simulation.steps[currentStepIndex];
    const newObjects = currentStep.objects.map((obj) =>
      ids.includes(obj.id) ? { ...obj, x: obj.x + dx, y: obj.y + dy } : obj
    );

    const newSteps = [...simulation.steps];
    newSteps[currentStepIndex] = { ...currentStep, objects: newObjects };

    set({ simulation: { ...simulation, steps: newSteps } });
    get().triggerAutosave();
  },

  bringToFront: (id) => {
    const { simulation, currentStepIndex } = get();
    if (!simulation) return;
    const currentStep = simulation.steps[currentStepIndex];
    const maxZ = Math.max(...currentStep.objects.map((o) => o.zIndex || 0), 10);
    get().updateObject(id, { zIndex: maxZ + 1 } as any);
  },

  sendToBack: (id) => {
    const { simulation, currentStepIndex } = get();
    if (!simulation) return;
    get().updateObject(id, { zIndex: 1 } as any);
  },

  // ==========================================
  // CANVAS VIEWPORT
  // ==========================================
  setZoom: (zoom) => set({ zoom: Math.max(0.3, Math.min(2.5, zoom)) }),
  setPan: (pan) => set({ pan }),
  resetView: () => set({ zoom: 1.0, pan: { x: 0, y: 0 } }),

  // ==========================================
  // PLAYBACK & DIFF ANIMATIONS
  // ==========================================
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setLoopPlayback: (loop) => set({ loopPlayback: loop }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setTransitionProgress: (progress) => set({ transitionProgress: progress }),
  setIsTransitioning: (transitioning) => set({ isTransitioning: transitioning }),
  setActiveDiffPlan: (plan) => set({ activeDiffPlan: plan }),

  playStepTransition: async (fromIdx, toIdx) => {
    const { simulation, playbackSpeed } = get();
    if (!simulation || fromIdx === toIdx) return;
    if (fromIdx < 0 || toIdx >= simulation.steps.length) return;

    const fromStep = simulation.steps[fromIdx];
    const toStep = simulation.steps[toIdx];
    const diffPlan = computeStepDiff(fromStep, toStep, fromIdx, toIdx);

    const baseDuration = toStep.durationMs || 800;
    const effectiveDuration = Math.max(200, baseDuration / playbackSpeed);

    set({
      activeDiffPlan: diffPlan,
      isTransitioning: true,
      transitionProgress: 0,
    });

    const startTime = performance.now();

    return new Promise<void>((resolve) => {
      function animate(time: number) {
        const elapsed = time - startTime;
        const progress = Math.min(1.0, elapsed / effectiveDuration);

        set({ transitionProgress: progress });

        if (progress < 1.0) {
          requestAnimationFrame(animate);
        } else {
          set({
            currentStepIndex: toIdx,
            isTransitioning: false,
            activeDiffPlan: null,
            transitionProgress: 1.0,
          });
          resolve();
        }
      }
      requestAnimationFrame(animate);
    });
  },

  runFullSimulation: async () => {
    const { simulation, currentStepIndex } = get();
    if (!simulation || simulation.steps.length <= 1) return;

    set({ isPlaying: true });

    let startIndex = currentStepIndex >= simulation.steps.length - 1 ? 0 : currentStepIndex;
    if (currentStepIndex >= simulation.steps.length - 1) {
      set({ currentStepIndex: 0 });
    }

    for (let i = startIndex; i < simulation.steps.length - 1; i++) {
      if (!get().isPlaying) break;
      await get().playStepTransition(i, i + 1);
      // Brief pause between steps
      if (get().isPlaying && i < simulation.steps.length - 2) {
        await new Promise((r) => setTimeout(r, 400 / get().playbackSpeed));
      }
    }

    if (get().loopPlayback && get().isPlaying) {
      await new Promise((r) => setTimeout(r, 600 / get().playbackSpeed));
      if (get().isPlaying) {
        set({ currentStepIndex: 0 });
        get().runFullSimulation();
        return;
      }
    }

    set({ isPlaying: false });
  },

  stopPlayback: () => {
    set({
      isPlaying: false,
      isTransitioning: false,
      activeDiffPlan: null,
    });
  },
}));
