import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { VisualNode, PointerVisualNode, StackVisualNode, ArrayVisualNode, StringVisualNode, RangeVisualNode } from '../../types/simulation';
import { calculatePointerPosition, calculateRangePosition, getArrayCellCenter, snapToGrid } from '../../utils/canvasGeometry';
import { lastCanvasMouse } from '../../utils/cursorTracker';
import { ArrayNodeView } from './nodes/ArrayNodeView';
import { StringNodeView } from './nodes/StringNodeView';
import { VariableNodeView } from './nodes/VariableNodeView';
import { ValueNodeView } from './nodes/ValueNodeView';
import { PointerNodeView } from './nodes/PointerNodeView';
import { TextNodeView } from './nodes/TextNodeView';
import { ArrowNodeView } from './nodes/ArrowNodeView';
import { HighlightNodeView } from './nodes/HighlightNodeView';
import { StackNodeView } from './nodes/StackNodeView';
import { RangeNodeView } from './nodes/RangeNodeView';
import { Info, Sparkles, Lock } from 'lucide-react';

export const Canvas: React.FC = () => {
  const {
    simulation,
    currentStepIndex,
    selectedObjectId,
    setSelectedObjectId,
    selectedObjectIds,
    setSelectedObjectIds,
    toggleSelectedObjectId,
    updateObject,
    updateSettings,
    zoom,
    pan,
    setPan,
    setZoom,
    fitViewCounter,
    isTransitioning,
    activeDiffPlan,
    transitionProgress,
    saveToHistory,
    canUndo,
    historyIndex,
    _dragResetCounter,
    activeTool,
    setActiveTool,
    addObject,
  } = useSimulationStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ mouseX: 0, mouseY: 0, width: 0, height: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [overviewDraft, setOverviewDraft] = useState('');
  const [initialDragPosition, setInitialDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [lastStepIndex, setLastStepIndex] = useState(currentStepIndex);
  const [lastSelectedId, setLastSelectedId] = useState(selectedObjectId);

  // Figma-style shape drawing: while a drawable tool is armed (activeTool),
  // click-drag on empty canvas draws the new shape at that geometry instead
  // of marquee-selecting.
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });

  // Marquee (drag-select) rectangle, in canvas-space (unscaled) units so it
  // rides along with the world-space pan/zoom transform automatically.
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState({ x: 0, y: 0 });
  const [marqueeEnd, setMarqueeEnd] = useState({ x: 0, y: 0 });

  // When dragging a node that's part of a multi-selection, this captures
  // every selected node's starting position so the whole group moves
  // together by the same delta.
  const [groupDragAnchors, setGroupDragAnchors] = useState<Record<string, { x: number; y: number }> | null>(null);

  const handleEndDrag = useCallback(() => {
    if (draggingNodeId && simulation && simulation.steps[currentStepIndex]) {
      const currentObjects = simulation.steps[currentStepIndex].objects;
      const draggedNode = currentObjects.find((o) => o.id === draggingNodeId);

      // Check if position actually changed, then save to history
      if (draggedNode && initialDragPosition) {
        const positionChanged = draggedNode.x !== initialDragPosition.x || draggedNode.y !== initialDragPosition.y;
        if (positionChanged) {
          saveToHistory();
        }
      }
    }

    if (isDrawingShape && activeTool) {
      const x0 = Math.min(drawStart.x, drawCurrent.x);
      const y0 = Math.min(drawStart.y, drawCurrent.y);
      const rawW = Math.abs(drawCurrent.x - drawStart.x);
      const rawH = Math.abs(drawCurrent.y - drawStart.y);
      const MIN_DRAG = 6; // below this, treat as a plain click -> default size

      if (rawW < MIN_DRAG && rawH < MIN_DRAG) {
        addObject(activeTool, { x: x0, y: y0 });
      } else {
        addObject(activeTool, { x: x0, y: y0 }, { width: rawW, height: rawH });
      }
      setActiveTool(null);
    }

    setIsPanning(false);
    setDraggingNodeId(null);
    setInitialDragPosition(null);
    setGroupDragAnchors(null);
    setIsMarqueeSelecting(false);
    setIsDrawingShape(false);
  }, [
    draggingNodeId,
    simulation,
    currentStepIndex,
    initialDragPosition,
    saveToHistory,
    updateObject,
    isDrawingShape,
    activeTool,
    drawStart,
    drawCurrent,
    addObject,
    setActiveTool,
  ]);

  // Window-level safety listeners to eliminate phantom / sticky drag
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (draggingNodeId || isPanning || isDrawingShape) {
        handleEndDrag();
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Escape while a shape tool is armed/drawing cancels it without
      // placing anything, rather than finalizing a shape at whatever the
      // cursor's last position was.
      if (e.key === 'Escape' && (isDrawingShape || activeTool)) {
        setIsDrawingShape(false);
        setActiveTool(null);
        return;
      }
      // Clear drag on Escape or Undo/Redo key shortcuts
      if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z')) {
        handleEndDrag();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('pointerup', handleGlobalMouseUp);
    window.addEventListener('blur', handleGlobalMouseUp);
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('pointerup', handleGlobalMouseUp);
      window.removeEventListener('blur', handleGlobalMouseUp);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [draggingNodeId, isPanning, isDrawingShape, activeTool, handleEndDrag, setActiveTool]);

  // Figma-style Space-to-pan: holding Space switches empty-canvas drag from
  // marquee-select to panning, same as most design tools.
  useEffect(() => {
    const handleSpaceDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.code === 'Space') setIsSpacePressed(true);
    };
    const handleSpaceUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', handleSpaceDown);
    window.addEventListener('keyup', handleSpaceUp);
    return () => {
      window.removeEventListener('keydown', handleSpaceDown);
      window.removeEventListener('keyup', handleSpaceUp);
    };
  }, []);

  // Figma-style wheel navigation: plain scroll pans the canvas, Ctrl/Cmd+scroll
  // (or a trackpad pinch, which browsers report as a ctrlKey wheel event)
  // zooms toward the cursor. Attached as a native listener so preventDefault
  // reliably stops the page from scrolling -- React's onWheel is passive.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        const store = useSimulationStore.getState();
        const { zoom: curZoom, pan: curPan } = store;
        const zoomFactor = Math.exp(-e.deltaY * 0.01);
        const newZoom = Math.min(2.5, Math.max(0.3, curZoom * zoomFactor));
        const worldX = (cursorX - curPan.x) / curZoom;
        const worldY = (cursorY - curPan.y) / curZoom;
        store.setZoom(newZoom);
        store.setPan({ x: cursorX - worldX * newZoom, y: cursorY - worldY * newZoom });
      } else {
        const store = useSimulationStore.getState();
        store.setPan({ x: store.pan.x - e.deltaX, y: store.pan.y - e.deltaY });
      }
    };

    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelNative);
  }, []);

  // Corner-handle resize drag for rectangle nodes.
  useEffect(() => {
    if (!resizingNodeId) return;

    const handleResizeMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.mouseX) / zoom;
      const dy = (e.clientY - resizeStart.mouseY) / zoom;
      updateObject(
        resizingNodeId,
        { width: Math.max(40, Math.round(resizeStart.width + dx)), height: Math.max(30, Math.round(resizeStart.height + dy)) },
        true
      );
    };
    const handleResizeUp = () => {
      setResizingNodeId(null);
      saveToHistory();
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeUp);
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeUp);
    };
  }, [resizingNodeId, resizeStart, zoom, updateObject, saveToHistory]);

  // Reset drag state when step changes, undo/redo happens, or counter increments
  useEffect(() => {
    setDraggingNodeId(null);
    setDragOffset({ x: 0, y: 0 });
    setInitialDragPosition(null);
    setIsPanning(false);
    setGroupDragAnchors(null);
    setIsMarqueeSelecting(false);
    setIsDrawingShape(false);
  }, [historyIndex, _dragResetCounter]);

  // Reset drag state when step changes
  useEffect(() => {
    if (currentStepIndex !== lastStepIndex) {
      setDraggingNodeId(null);
      setDragOffset({ x: 0, y: 0 });
      setInitialDragPosition(null);
      setIsPanning(false);
      setGroupDragAnchors(null);
      setIsMarqueeSelecting(false);
      setLastStepIndex(currentStepIndex);
    }
  }, [currentStepIndex, lastStepIndex]);

  // Reset drag state when selected object changes -- but not when the
  // selection just changed *because* a drag started on that same node
  // (mousedown selects and begins dragging in one go), or every fresh
  // click-and-drag would be cancelled before the first mousemove landed.
  useEffect(() => {
    if (selectedObjectId !== lastSelectedId) {
      if (draggingNodeId !== selectedObjectId) {
        setDraggingNodeId(null);
        setDragOffset({ x: 0, y: 0 });
        setInitialDragPosition(null);
      }
      setLastSelectedId(selectedObjectId);
    }
  }, [selectedObjectId, lastSelectedId, draggingNodeId]);

  // Center + zoom-to-fit whatever the simulation actually contains, instead
  // of always opening at zoom 1 / pan (0,0) -- a layout authored assuming a
  // wide desktop canvas otherwise renders mostly off-screen on a narrow
  // phone viewport, with only a sliver of content visible at the left edge.
  const fitToView = useCallback(() => {
    if (!simulation || !canvasRef.current) return;
    const allObjects = simulation.steps.flatMap((s) => s.objects);
    if (allObjects.length === 0) return;

    const minX = Math.min(...allObjects.map((o) => o.x));
    const minY = Math.min(...allObjects.map((o) => o.y));
    const maxX = Math.max(...allObjects.map((o) => o.x + o.width));
    const maxY = Math.max(...allObjects.map((o) => o.y + o.height));
    const contentWidth = Math.max(1, maxX - minX);
    const contentHeight = Math.max(1, maxY - minY);

    const rect = canvasRef.current.getBoundingClientRect();
    const PADDING = 48;
    const availWidth = Math.max(50, rect.width - PADDING * 2);
    const availHeight = Math.max(50, rect.height - PADDING * 2);

    const fitZoom = Math.min(availWidth / contentWidth, availHeight / contentHeight, 1.2);
    const contentCenterX = minX + contentWidth / 2;
    const contentCenterY = minY + contentHeight / 2;

    setZoom(fitZoom);
    setPan({
      x: rect.width / 2 - contentCenterX * fitZoom,
      y: rect.height / 2 - contentCenterY * fitZoom,
    });
  }, [simulation, setZoom, setPan]);

  // Auto-fit once whenever a (different) simulation is loaded.
  useEffect(() => {
    const raf = requestAnimationFrame(() => fitToView());
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulation?.id]);

  // Manual re-center, requested via the toolbar's "Reset View" button.
  useEffect(() => {
    if (fitViewCounter > 0) fitToView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitViewCounter]);

  if (!simulation || !simulation.steps[currentStepIndex]) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-950 text-slate-500 font-mono text-sm">
        No active step loaded.
      </div>
    );
  }

  const currentStep = simulation.steps[currentStepIndex];
  const objects = currentStep.objects;
  const snapEnabled = simulation.settings?.snapToGrid ?? true;
  const gridSize = simulation.settings?.gridSize ?? 20;

  const isNodeSelected = (id: string) =>
    selectedObjectId === id || selectedObjectIds.includes(id);
  const isNodeBeingDragged = (id: string) =>
    draggingNodeId === id || (groupDragAnchors ? id in groupDragAnchors : false);

  // Used by the stack push/pop flying-particle trajectory below (unrelated
  // to the Algorithm Overview HUD, which is now a manually-written note).
  const primaryArrayOrString = objects.find((o) => o.type === 'array' || o.type === 'string') as ArrayVisualNode | StringVisualNode | undefined;
  const primaryStack = objects.find((o) => o.type === 'stack') as StackVisualNode | undefined;

  const showOverview = simulation.settings?.showAlgorithmOverview ?? true;
  const overviewText = simulation.settings?.algorithmOverviewText || '';

  const startEditingOverview = () => {
    setOverviewDraft(overviewText);
    setIsEditingOverview(true);
  };

  const saveOverviewDraft = () => {
    updateSettings({ algorithmOverviewText: overviewDraft });
    setIsEditingOverview(false);
  };

  // Finds every node whose bounding box intersects the given canvas-space rect.
  const getIdsInRect = (a: { x: number; y: number }, b: { x: number; y: number }): string[] => {
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    return objects
      .filter((o) => !o.locked && o.x < maxX && o.x + o.width > minX && o.y < maxY && o.y + o.height > minY)
      .map((o) => o.id);
  };

  // Mouse & Touch Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // The world-space transform container sits on top of most of the visible
    // canvas, so a strict `=== canvasRef.current` check only ever matched a
    // sliver of dead space. Treat any click that didn't land on a node (or
    // one of its interactive children) as "empty canvas" instead.
    const isEmptyClick = !(e.target as HTMLElement).closest('[data-node-id]');
    if (!isEmptyClick) return;

    if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && isSpacePressed)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button === 0 && activeTool) {
      // A tool is armed (e.g. Rectangle) -- click-drag draws the shape here
      // instead of marquee-selecting.
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const startX = (e.clientX - canvasRect.left - pan.x) / zoom;
      const startY = (e.clientY - canvasRect.top - pan.y) / zoom;
      setDrawStart({ x: startX, y: startY });
      setDrawCurrent({ x: startX, y: startY });
      setIsDrawingShape(true);
      return;
    }

    if (e.button === 0) {
      // Plain click-drag on empty canvas starts a marquee drag-select.
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const startX = (e.clientX - canvasRect.left - pan.x) / zoom;
      const startY = (e.clientY - canvasRect.top - pan.y) / zoom;
      setMarqueeStart({ x: startX, y: startY });
      setMarqueeEnd({ x: startX, y: startY });
      setIsMarqueeSelecting(true);
      setSelectedObjectIds([]);
    }
  };

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && (e.target as HTMLElement) === canvasRef.current) {
      const touch = e.touches[0];
      setIsPanning(true);
      setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      setSelectedObjectId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Track cursor position in canvas (world-space) coordinates on every
    // move, including plain hover with no button held, so a later Ctrl+V
    // knows where "here" is.
    const hoverRect = canvasRef.current?.getBoundingClientRect();
    if (hoverRect) {
      lastCanvasMouse.x = (e.clientX - hoverRect.left - pan.x) / zoom;
      lastCanvasMouse.y = (e.clientY - hoverRect.top - pan.y) / zoom;
    }

    // Safety check: If no mouse buttons are pressed, clear any drag/pan/marquee immediately
    if (e.buttons === 0) {
      if (draggingNodeId || isPanning || isMarqueeSelecting) {
        handleEndDrag();
      }
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (isDrawingShape) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const curX = (e.clientX - canvasRect.left - pan.x) / zoom;
      const curY = (e.clientY - canvasRect.top - pan.y) / zoom;
      setDrawCurrent({ x: curX, y: curY });
      return;
    }

    if (isMarqueeSelecting) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const curX = (e.clientX - canvasRect.left - pan.x) / zoom;
      const curY = (e.clientY - canvasRect.top - pan.y) / zoom;
      const next = { x: curX, y: curY };
      setMarqueeEnd(next);
      setSelectedObjectIds(getIdsInRect(marqueeStart, next));
      return;
    }

    if (draggingNodeId && !isTransitioning) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const rawX = (e.clientX - canvasRect.left - pan.x) / zoom - dragOffset.x;
      const rawY = (e.clientY - canvasRect.top - pan.y) / zoom - dragOffset.y;

      // No origin clamp: nodes can be placed freely in any direction, like a
      // Figma canvas that isn't pinned to a top-left corner.
      const clampedX = snapEnabled ? snapToGrid(rawX, gridSize) : Math.round(rawX);
      const clampedY = snapEnabled ? snapToGrid(rawY, gridSize) : Math.round(rawY);

      if (groupDragAnchors) {
        const primaryAnchor = groupDragAnchors[draggingNodeId];
        const dx = clampedX - primaryAnchor.x;
        const dy = clampedY - primaryAnchor.y;
        for (const [id, anchor] of Object.entries(groupDragAnchors)) {
          updateObject(id, { x: anchor.x + dx, y: anchor.y + dy }, true);
        }
      } else {
        // Skip history during drag, save on drag end
        updateObject(draggingNodeId, { x: clampedX, y: clampedY }, true);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];

    if (isPanning) {
      setPan({
        x: touch.clientX - panStart.x,
        y: touch.clientY - panStart.y,
      });
      return;
    }

    if (draggingNodeId && !isTransitioning) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const rawX = (touch.clientX - canvasRect.left - pan.x) / zoom - dragOffset.x;
      const rawY = (touch.clientY - canvasRect.top - pan.y) / zoom - dragOffset.y;

      const nextX = snapEnabled ? snapToGrid(rawX, gridSize) : Math.round(rawX);
      const nextY = snapEnabled ? snapToGrid(rawY, gridSize) : Math.round(rawY);

      updateObject(draggingNodeId, { x: nextX, y: nextY });
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: VisualNode) => {
    e.stopPropagation();
    if (isTransitioning) return;

    if (e.shiftKey) {
      // Shift-click adds/removes this node from the multi-selection without
      // starting a drag, so you can build up a group one click at a time.
      toggleSelectedObjectId(node.id);
      return;
    }

    const isPartOfGroup = selectedObjectIds.includes(node.id) && selectedObjectIds.length > 1;

    if (isPartOfGroup) {
      // Dragging any already-selected node in a multi-selection moves the
      // whole group together; capture every member's starting position.
      const anchors: Record<string, { x: number; y: number }> = {};
      for (const id of selectedObjectIds) {
        const obj = objects.find((o) => o.id === id);
        if (obj) anchors[id] = { x: obj.x, y: obj.y };
      }
      setGroupDragAnchors(anchors);
    } else {
      setSelectedObjectId(node.id);
      setGroupDragAnchors(null);
    }

    setDraggingNodeId(node.id);

    // Store initial position for comparison on drag end
    setInitialDragPosition({ x: node.x, y: node.y });

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const mouseCanvasX = (e.clientX - canvasRect.left - pan.x) / zoom;
    const mouseCanvasY = (e.clientY - canvasRect.top - pan.y) / zoom;

    setDragOffset({
      x: mouseCanvasX - node.x,
      y: mouseCanvasY - node.y,
    });
  };

  const handleNodeTouchStart = (e: React.TouchEvent, node: VisualNode) => {
    e.stopPropagation();
    if (isTransitioning || e.touches.length !== 1) return;

    const touch = e.touches[0];
    setSelectedObjectId(node.id);
    setDraggingNodeId(node.id);

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const touchCanvasX = (touch.clientX - canvasRect.left - pan.x) / zoom;
    const touchCanvasY = (touch.clientY - canvasRect.top - pan.y) / zoom;

    setDragOffset({
      x: touchCanvasX - node.x,
      y: touchCanvasY - node.y,
    });
  };

  const getRenderedNodeState = (node: VisualNode) => {
    // If the node is currently being actively dragged (solo, or as part of a
    // group drag), preserve its live dragged coordinates rather than letting
    // pointer/range anchoring recalculate a stale position underneath it.
    if (draggingNodeId === node.id || (groupDragAnchors && node.id in groupDragAnchors)) {
      return { ...node, opacity: 1 };
    }

    if (!isTransitioning || !activeDiffPlan) {
      if (node.type === 'pointer') {
        const anchoredPos = calculatePointerPosition(node as PointerVisualNode, objects);
        return { ...node, x: anchoredPos.x, y: anchoredPos.y, opacity: 1 };
      }
      if (node.type === 'range') {
        const rangePos = calculateRangePosition(node as RangeVisualNode, objects);
        return { ...node, x: rangePos.x, y: rangePos.y, width: rangePos.width, height: rangePos.height, opacity: 1 };
      }
      return { ...node, opacity: 1 };
    }

    const modDiff = activeDiffPlan.modifiedObjects.find((m) => m.id === node.id);
    if (modDiff) {
      const fromObj = modDiff.from;
      const toObj = modDiff.to;

      let fromX = fromObj.x;
      let fromY = fromObj.y;
      let fromW = fromObj.width;
      let fromH = fromObj.height;

      let toX = toObj.x;
      let toY = toObj.y;
      let toW = toObj.width;
      let toH = toObj.height;

      if (fromObj.type === 'pointer') {
        const fromAnchored = calculatePointerPosition(fromObj as PointerVisualNode, simulation.steps[activeDiffPlan.fromStepIndex].objects);
        fromX = fromAnchored.x;
        fromY = fromAnchored.y;
      }
      if (toObj.type === 'pointer') {
        const toAnchored = calculatePointerPosition(toObj as PointerVisualNode, simulation.steps[activeDiffPlan.toStepIndex].objects);
        toX = toAnchored.x;
        toY = toAnchored.y;
      }

      if (fromObj.type === 'range') {
        const fromRangePos = calculateRangePosition(fromObj as RangeVisualNode, simulation.steps[activeDiffPlan.fromStepIndex].objects);
        fromX = fromRangePos.x;
        fromY = fromRangePos.y;
        fromW = fromRangePos.width;
        fromH = fromRangePos.height;
      }
      if (toObj.type === 'range') {
        const toRangePos = calculateRangePosition(toObj as RangeVisualNode, simulation.steps[activeDiffPlan.toStepIndex].objects);
        toX = toRangePos.x;
        toY = toRangePos.y;
        toW = toRangePos.width;
        toH = toRangePos.height;
      }

      const t = transitionProgress;
      const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      const currX = fromX + (toX - fromX) * easeT;
      const currY = fromY + (toY - fromY) * easeT;
      const currW = fromW + (toW - fromW) * easeT;
      const currH = fromH + (toH - fromH) * easeT;

      // For array and string, use fromObj as base during active transition so elements start from original slots and animate to destination
      const baseObj = (fromObj.type === 'array' || fromObj.type === 'string') ? fromObj : toObj;

      return {
        ...baseObj,
        x: currX,
        y: currY,
        width: currW,
        height: currH,
        opacity: 1,
        diffDetails: modDiff,
      };
    }

    const isAdded = activeDiffPlan.addedObjects.some((a) => a.id === node.id);
    if (isAdded) {
      return { ...node, opacity: transitionProgress };
    }

    // Unchanged pointers/ranges must stay anchored to their target cell while
    // something else animates (e.g. an array swap) instead of snapping to
    // their raw stored x/y, which drifts once anything else on the canvas moves.
    if (node.type === 'pointer') {
      const anchoredPos = calculatePointerPosition(node as PointerVisualNode, objects);
      return { ...node, x: anchoredPos.x, y: anchoredPos.y, opacity: 1 };
    }
    if (node.type === 'range') {
      const rangePos = calculateRangePosition(node as RangeVisualNode, objects);
      return { ...node, x: rangePos.x, y: rangePos.y, width: rangePos.width, height: rangePos.height, opacity: 1 };
    }

    return { ...node, opacity: 1 };
  };

  const renderNodeComponent = (node: VisualNode, diffDetails?: any) => {
    const isSelected = isNodeSelected(node.id) && !isTransitioning;

    switch (node.type) {
      case 'array':
        return (
          <ArrayNodeView
            node={node as any}
            isSelected={isSelected}
            isInteractive={!isTransitioning}
            diffDetails={diffDetails}
            transitionProgress={transitionProgress}
          />
        );
      case 'string':
        return (
          <StringNodeView
            node={node as any}
            isSelected={isSelected}
            isInteractive={!isTransitioning}
            diffDetails={diffDetails}
            transitionProgress={transitionProgress}
          />
        );
      case 'variable':
        return (
          <VariableNodeView
            node={node as any}
            isSelected={isSelected}
            isInteractive={!isTransitioning}
            diffOldValue={diffDetails?.valueChanged?.oldValue}
            diffNewValue={diffDetails?.valueChanged?.newValue}
            transitionProgress={transitionProgress}
          />
        );
      case 'value':
        return <ValueNodeView node={node as any} isSelected={isSelected} isInteractive={!isTransitioning} />;
      case 'pointer':
        return <PointerNodeView node={node as any} isSelected={isSelected} isInteractive={!isTransitioning} />;
      case 'range':
        return <RangeNodeView node={node as any} isSelected={isSelected} isInteractive={!isTransitioning} />;
      case 'text':
        return <TextNodeView node={node as any} isSelected={isSelected} isInteractive={!isTransitioning} />;
      case 'arrow':
        return <ArrowNodeView node={node as any} isSelected={isSelected} isInteractive={!isTransitioning} />;
      case 'highlight':
      case 'box':
        return <HighlightNodeView node={node as any} isSelected={isSelected} isInteractive={!isTransitioning} />;
      case 'stack':
        return <StackNodeView node={node as any} isSelected={isSelected} isInteractive={!isTransitioning} />;
      default:
        return null;
    }
  };

  // Trajectory Jumping Animation calculation for Push and Pop
  const renderFlyingTrajectory = () => {
    if (!isTransitioning || !activeDiffPlan || !primaryStack) return null;

    const toStep = simulation.steps[activeDiffPlan.toStepIndex];
    const toStack = toStep.objects.find((o) => o.type === 'stack') as StackVisualNode | undefined;
    if (!toStack) return null;

    const action = toStack.data.lastAction;
    if (action !== 'push' && action !== 'pop') return null;

    const t = transitionProgress;
    const stackTopX = toStack.x + (toStack.width / 2);
    const stackTopY = toStack.y + 30;

    let startX = stackTopX;
    let startY = stackTopY;
    let endX = stackTopX;
    let endY = stackTopY;
    let val = '';
    let isPush = action === 'push';

    if (isPush && primaryArrayOrString) {
      const ptr = toStep.objects.find((o) => o.type === 'pointer') as PointerVisualNode | undefined;
      const activeIdx = ptr?.data.targetIndex ?? 0;
      const cellCenter = getArrayCellCenter(primaryArrayOrString, activeIdx);

      startX = cellCenter.x;
      startY = cellCenter.y;
      endX = stackTopX;
      endY = stackTopY;

      const pushedEl = toStack.data.elements[toStack.data.elements.length - 1];
      val = pushedEl ? String(pushedEl.value) : '';
    } else if (!isPush) {
      startX = stackTopX;
      startY = stackTopY;
      endX = stackTopX + 40;
      endY = stackTopY - 70;
      val = toStack.data.lastPoppedValue ? String(toStack.data.lastPoppedValue) : '';
    }

    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 50;

    const curX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
    const curY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
    const scale = isPush ? 1 + Math.sin(t * Math.PI) * 0.3 : Math.max(0.2, 1.2 - t * 0.8);
    const opacity = isPush ? Math.min(1, t * 2) : Math.max(0, 1 - t);

    return (
      <div
        className="absolute pointer-events-none z-50 transition-all font-mono font-bold text-xs px-2.5 py-1 rounded-lg border flex items-center justify-center shadow-2xl"
        style={{
          left: `${curX - 18}px`,
          top: `${curY - 12}px`,
          transform: `scale(${scale})`,
          opacity,
          backgroundColor: isPush ? '#8b5cf6' : '#f43f5e',
          borderColor: '#ffffff',
          color: '#ffffff',
          boxShadow: isPush ? '0 0 20px #8b5cf6' : '0 0 20px #f43f5e',
        }}
      >
        {val}
      </div>
    );
  };


  return (
    <div
      ref={canvasRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleEndDrag}
      onTouchStart={handleCanvasTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleEndDrag}
      className={`flex-1 relative overflow-hidden bg-[#070b14] select-none touch-none ${
        isPanning ? 'cursor-grabbing' : isSpacePressed ? 'cursor-grab' : 'cursor-crosshair'
      }`}
      style={{
        backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
        backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Top Left: Algorithm Overview HUD Card -- optional, manually-written note */}
      {showOverview ? (
        <div className="absolute top-4 left-4 z-30 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 shadow-xl text-xs max-w-xs transition-all pointer-events-auto select-none hidden sm:block">
          <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Algorithm Overview</span>
            </div>
            <div className="flex items-center gap-2">
              {!isEditingOverview && (
                <button
                  type="button"
                  onClick={startEditingOverview}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-mono"
                >
                  edit
                </button>
              )}
              <button
                type="button"
                onClick={() => updateSettings({ showAlgorithmOverview: false })}
                className="text-[10px] text-slate-500 hover:text-slate-300 font-mono"
              >
                hide
              </button>
            </div>
          </div>

          {isEditingOverview ? (
            <div className="flex flex-col gap-2">
              <textarea
                autoFocus
                rows={5}
                value={overviewDraft}
                onChange={(e) => setOverviewDraft(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Write your own notes about this algorithm..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[11px] font-mono text-slate-200 outline-none focus:border-indigo-500 resize-none leading-relaxed"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingOverview(false)}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-mono"
                >
                  cancel
                </button>
                <button
                  type="button"
                  onClick={saveOverviewDraft}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono font-bold"
                >
                  save
                </button>
              </div>
            </div>
          ) : overviewText ? (
            <p
              onClick={startEditingOverview}
              className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed cursor-text"
              title="Click to edit"
            >
              {overviewText}
            </p>
          ) : (
            <p
              onClick={startEditingOverview}
              className="font-mono text-[11px] text-slate-500 italic cursor-text"
            >
              Click "edit" to write your own notes here.
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => updateSettings({ showAlgorithmOverview: true })}
          className="absolute top-4 left-4 z-30 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors hidden sm:block"
        >
          + Overview
        </button>
      )}

      {/* Zoom / Pan World Space Container */}
      <div
        className="absolute top-0 left-0 origin-top-left transition-transform duration-75"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: `${simulation.settings?.canvasWidth || 6000}px`,
          height: `${simulation.settings?.canvasHeight || 4000}px`,
        }}
      >
        {/* Live preview while drawing a new shape with an armed tool */}
        {isDrawingShape && (
          <div
            className="absolute border-2 border-dashed border-indigo-400 bg-indigo-500/10 pointer-events-none z-40 rounded-sm"
            style={{
              left: `${Math.min(drawStart.x, drawCurrent.x)}px`,
              top: `${Math.min(drawStart.y, drawCurrent.y)}px`,
              width: `${Math.abs(drawCurrent.x - drawStart.x)}px`,
              height: `${Math.abs(drawCurrent.y - drawStart.y)}px`,
            }}
          />
        )}

        {/* Marquee Drag-Select Rectangle */}
        {isMarqueeSelecting && (
          <div
            className="absolute border-2 border-indigo-400 bg-indigo-500/10 pointer-events-none z-40"
            style={{
              left: `${Math.min(marqueeStart.x, marqueeEnd.x)}px`,
              top: `${Math.min(marqueeStart.y, marqueeEnd.y)}px`,
              width: `${Math.abs(marqueeEnd.x - marqueeStart.x)}px`,
              height: `${Math.abs(marqueeEnd.y - marqueeStart.y)}px`,
            }}
          />
        )}

        {/* Render Canvas Visual Nodes */}
        {objects.map((node) => {
          const rendered = getRenderedNodeState(node);
          const isSelected = isNodeSelected(node.id) && !isTransitioning;

          return (
            <div
              key={node.id}
              data-node-id={node.id}
              onMouseDown={node.locked ? undefined : (e) => handleNodeMouseDown(e, node)}
              onTouchStart={node.locked ? undefined : (e) => handleNodeTouchStart(e, node)}
              className={`absolute transition-shadow duration-100 ${
                node.locked ? 'cursor-default' : isNodeBeingDragged(node.id) ? 'cursor-grabbing z-50' : 'cursor-grab'
              } ${isSelected && selectedObjectIds.length > 1 ? 'ring-2 ring-indigo-400/80 rounded-md' : ''}`}
              style={{
                left: `${rendered.x}px`,
                top: `${rendered.y}px`,
                zIndex: node.zIndex || 1,
                opacity: rendered.opacity ?? 1,
                // Locked nodes let clicks/drags fall through to whatever is
                // underneath instead of intercepting them -- unlock via the
                // small badge below, which stays interactive on its own.
                pointerEvents: node.locked ? 'none' : 'auto',
              }}
            >
              {renderNodeComponent(rendered as VisualNode, (rendered as any).diffDetails)}

              {/* Figma-style corner resize handle -- rectangles are the one
                  node type with no fixed content shape, so free resizing
                  actually makes sense for them. */}
              {node.type === 'highlight' && isSelected && !isTransitioning && !node.locked && (
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setResizingNodeId(node.id);
                    setResizeStart({
                      mouseX: e.clientX,
                      mouseY: e.clientY,
                      width: node.width,
                      height: node.height,
                    });
                  }}
                  className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 rounded-sm bg-indigo-400 border border-white/80 cursor-nwse-resize z-10"
                  title="Drag to resize"
                />
              )}

              {node.locked && (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateObject(node.id, { locked: false } as any);
                    setSelectedObjectId(node.id);
                  }}
                  className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 flex items-center justify-center shadow-lg"
                  style={{ pointerEvents: 'auto' }}
                  title="Locked -- click to unlock"
                >
                  <Lock className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Dynamic Trajectory Particle for Stack Push & Pop! */}
        {renderFlyingTrajectory()}
      </div>
    </div>
  );
};
