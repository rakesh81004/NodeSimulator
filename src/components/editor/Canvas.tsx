import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { VisualNode, PointerVisualNode, StackVisualNode, ArrayVisualNode, StringVisualNode, RangeVisualNode } from '../../types/simulation';
import { calculatePointerPosition, calculateRangePosition, getArrayCellCenter, snapToGrid } from '../../utils/canvasGeometry';
import { ArrayNodeView } from './nodes/ArrayNodeView';
import { StringNodeView } from './nodes/StringNodeView';
import { VariableNodeView } from './nodes/VariableNodeView';
import { PointerNodeView } from './nodes/PointerNodeView';
import { TextNodeView } from './nodes/TextNodeView';
import { ArrowNodeView } from './nodes/ArrowNodeView';
import { HighlightNodeView } from './nodes/HighlightNodeView';
import { StackNodeView } from './nodes/StackNodeView';
import { RangeNodeView } from './nodes/RangeNodeView';
import { Info, Sparkles } from 'lucide-react';

export const Canvas: React.FC = () => {
  const {
    simulation,
    currentStepIndex,
    selectedObjectId,
    setSelectedObjectId,
    updateObject,
    zoom,
    pan,
    setPan,
    isTransitioning,
    activeDiffPlan,
    transitionProgress,
    saveToHistory,
    canUndo,
    historyIndex,
    _dragResetCounter,
  } = useSimulationStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showInfoHud, setShowInfoHud] = useState(true);
  const [initialDragPosition, setInitialDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [lastStepIndex, setLastStepIndex] = useState(currentStepIndex);
  const [lastSelectedId, setLastSelectedId] = useState(selectedObjectId);

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
      
      // Auto-snap pointer or range to closest Array / String cell
      if (draggedNode && (draggedNode.type === 'pointer' || draggedNode.type === 'range')) {
        const target = currentObjects.find((o) => o.type === 'array' || o.type === 'string') as ArrayVisualNode | StringVisualNode | undefined;
        if (target) {
          const isNearY = Math.abs(draggedNode.y - target.y) < 160;
          const isNearX = draggedNode.x >= target.x - 60 && draggedNode.x <= target.x + target.width + 60;
          if (isNearY && isNearX) {
            const cellSize = target.data.cellSize || 56;
            const totalCells = target.type === 'array' ? (target as any).data.elements?.length || 1 : (target as any).data.characters?.length || 1;
            const rawIdx = Math.round((draggedNode.x - target.x) / cellSize);
            const targetIdx = Math.max(0, Math.min(totalCells - 1, rawIdx));

            if (draggedNode.type === 'pointer') {
              updateObject(draggedNode.id, {
                data: {
                  ...(draggedNode as PointerVisualNode).data,
                  targetNodeId: target.id,
                  targetIndex: targetIdx,
                },
              } as any);
            } else if (draggedNode.type === 'range') {
              const currentSpan = Math.max(0, ((draggedNode as RangeVisualNode).data.endIndex ?? 2) - ((draggedNode as RangeVisualNode).data.startIndex ?? 0));
              const newStart = targetIdx;
              const newEnd = Math.min(totalCells - 1, newStart + currentSpan);
              updateObject(draggedNode.id, {
                data: {
                  ...(draggedNode as RangeVisualNode).data,
                  targetNodeId: target.id,
                  startIndex: newStart,
                  endIndex: newEnd,
                },
              } as any);
            }
          }
        }
      }
    }

    setIsPanning(false);
    setDraggingNodeId(null);
    setInitialDragPosition(null);
  }, [draggingNodeId, simulation, currentStepIndex, initialDragPosition, saveToHistory, updateObject]);

  // Window-level safety listeners to eliminate phantom / sticky drag
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (draggingNodeId || isPanning) {
        handleEndDrag();
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
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
  }, [draggingNodeId, isPanning, handleEndDrag]);

  // Reset drag state when step changes, undo/redo happens, or counter increments
  useEffect(() => {
    setDraggingNodeId(null);
    setDragOffset({ x: 0, y: 0 });
    setInitialDragPosition(null);
    setIsPanning(false);
  }, [historyIndex, _dragResetCounter]);

  // Reset drag state when step changes
  useEffect(() => {
    if (currentStepIndex !== lastStepIndex) {
      setDraggingNodeId(null);
      setDragOffset({ x: 0, y: 0 });
      setInitialDragPosition(null);
      setIsPanning(false);
      setLastStepIndex(currentStepIndex);
    }
  }, [currentStepIndex, lastStepIndex]);

  // Reset drag state when selected object changes
  useEffect(() => {
    if (selectedObjectId !== lastSelectedId) {
      setDraggingNodeId(null);
      setDragOffset({ x: 0, y: 0 });
      setInitialDragPosition(null);
      setLastSelectedId(selectedObjectId);
    }
  }, [selectedObjectId, lastSelectedId]);

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

  // Overview HUD entities
  const primaryArrayOrString = objects.find((o) => o.type === 'array' || o.type === 'string') as ArrayVisualNode | StringVisualNode | undefined;
  const primaryStack = objects.find((o) => o.type === 'stack') as StackVisualNode | undefined;
  const variables = objects.filter((o) => o.type === 'variable');

  // Mouse & Touch Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Deselect when clicking on empty space or canvas background
    if (e.button === 0 && (e.target as HTMLElement) === canvasRef.current) {
      setSelectedObjectId(null);
    }
    
    if (e.button === 1 || e.altKey || (e.target as HTMLElement) === canvasRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Deselect when clicking on empty space
    // Check if the click target is not within a node
    const target = e.target as HTMLElement;
    const isNode = target.closest('[data-node-id]');
    
    if (!isNode) {
      setSelectedObjectId(null);
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
    // Safety check: If no mouse buttons are pressed, clear any drag/pan immediately
    if (e.buttons === 0) {
      if (draggingNodeId || isPanning) {
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

    if (draggingNodeId && !isTransitioning) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const rawX = (e.clientX - canvasRect.left - pan.x) / zoom - dragOffset.x;
      const rawY = (e.clientY - canvasRect.top - pan.y) / zoom - dragOffset.y;

      const nextX = snapEnabled ? snapToGrid(rawX, gridSize) : Math.round(rawX);
      const nextY = snapEnabled ? snapToGrid(rawY, gridSize) : Math.round(rawY);

      // Skip history during drag, save on drag end
      updateObject(draggingNodeId, { x: Math.max(0, nextX), y: Math.max(0, nextY) }, true);
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

      updateObject(draggingNodeId, { x: Math.max(0, nextX), y: Math.max(0, nextY) });
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: VisualNode) => {
    e.stopPropagation();
    if (isTransitioning) return;

    setSelectedObjectId(node.id);
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
    // If the node is currently being actively dragged by the user, preserve live dragged coordinates
    if (draggingNodeId === node.id) {
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

    return { ...node, opacity: 1 };
  };

  const renderNodeComponent = (node: VisualNode, diffDetails?: any) => {
    const isSelected = selectedObjectId === node.id && !isTransitioning;

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
      onClick={handleCanvasClick}
      onTouchStart={handleCanvasTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleEndDrag}
      className="flex-1 relative overflow-hidden bg-[#070b14] cursor-crosshair select-none touch-none"
      style={{
        backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
        backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Top Left: Algorithm Overview HUD Card */}
      {showInfoHud && (
        <div className="absolute top-4 left-4 z-30 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 shadow-xl text-xs max-w-xs transition-all pointer-events-auto select-none hidden sm:block">
          <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Algorithm Overview</span>
            </div>
            <button
              type="button"
              onClick={() => setShowInfoHud(false)}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-mono"
            >
              hide
            </button>
          </div>

          <div className="flex flex-col gap-1.5 font-mono text-[11px]">
            {primaryArrayOrString && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Input {primaryArrayOrString.type}:</span>
                <span className="text-sky-400 font-bold truncate max-w-[140px]">
                  {primaryArrayOrString.type === 'string'
                    ? `"${(primaryArrayOrString as StringVisualNode).data.characters.map((c) => c.value).join('')}"`
                    : `[${(primaryArrayOrString as ArrayVisualNode).data.elements.map((e) => e.value).join(', ')}]`}
                </span>
              </div>
            )}

            {variables.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">{(v as any).data.name}:</span>
                <span className="text-emerald-400 font-bold truncate max-w-[120px]">
                  {String((v as any).data.value)}
                </span>
              </div>
            ))}

            {primaryStack && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Stack Size:</span>
                <span className="text-purple-400 font-bold">
                  {primaryStack.data.elements.length} items
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Zoom / Pan World Space Container */}
      <div
        className="absolute top-0 left-0 origin-top-left transition-transform duration-75"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: `${simulation.settings?.canvasWidth || 1200}px`,
          height: `${simulation.settings?.canvasHeight || 700}px`,
        }}
      >
        {/* Render Canvas Visual Nodes */}
        {objects.map((node) => {
          const rendered = getRenderedNodeState(node);
          const isSelected = selectedObjectId === node.id && !isTransitioning;

          return (
            <div
              key={node.id}
              data-node-id={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onTouchStart={(e) => handleNodeTouchStart(e, node)}
              className={`absolute transition-shadow duration-100 ${
                draggingNodeId === node.id ? 'cursor-grabbing z-50' : 'cursor-grab'
              }`}
              style={{
                left: `${rendered.x}px`,
                top: `${rendered.y}px`,
                zIndex: node.zIndex || 1,
                opacity: rendered.opacity ?? 1,
              }}
            >
              {renderNodeComponent(rendered as VisualNode, (rendered as any).diffDetails)}
            </div>
          );
        })}

        {/* Dynamic Trajectory Particle for Stack Push & Pop! */}
        {renderFlyingTrajectory()}
      </div>
    </div>
  );
};
