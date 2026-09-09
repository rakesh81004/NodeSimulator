import { VisualNode, ArrayVisualNode, StringVisualNode, PointerVisualNode, RangeVisualNode } from '../types/simulation';

export function snapToGrid(value: number, gridSize: number = 20): number {
  return Math.round(value / gridSize) * gridSize;
}

// ArrayNodeView/StringNodeView render an index-number row above each cell when
// showIndexes is on, which adds visible height the node's stored `height`
// field doesn't include (that field only covers the colored cell itself).
// Any geometry that needs the array's true rendered top/bottom for a
// horizontal array has to account for this extra strip explicitly.
const INDEX_LABEL_ROW_HEIGHT = 18.5;

function getIndexLabelOffset(node: ArrayVisualNode | StringVisualNode): number {
  return node.data.showIndexes ? INDEX_LABEL_ROW_HEIGHT : 0;
}

/**
 * Calculates absolute center point for a specific cell in an Array or String node,
 * with seamless joined cells.
 */
export function getArrayCellCenter(
  node: ArrayVisualNode | StringVisualNode,
  cellIndex: number
): { x: number; y: number } {
  const cellSize = node.data.cellSize || 56;
  const isHorizontal = node.type === 'string' ? true : (node.data.orientation !== 'vertical');

  if (isHorizontal) {
    const cellLeft = node.x + (cellIndex * cellSize);
    const cellCenterX = cellLeft + (cellSize / 2);
    const cellCenterY = node.y + getIndexLabelOffset(node) + (node.height / 2);
    return { x: cellCenterX, y: cellCenterY };
  } else {
    const cellTop = node.y + (cellIndex * cellSize);
    const cellCenterX = node.x + (node.width / 2);
    const cellCenterY = cellTop + (cellSize / 2);
    return { x: cellCenterX, y: cellCenterY };
  }
}

/**
 * Calculates the exact rendered position for a PointerNode when attached to an Array cell.
 */
export function calculatePointerPosition(
  pointer: PointerVisualNode,
  objects: VisualNode[]
): { x: number; y: number } {
  if (!pointer.data.targetNodeId || pointer.data.targetIndex === undefined) {
    return { x: pointer.x, y: pointer.y };
  }

  const targetNode = objects.find(
    (o) => o.id === pointer.data.targetNodeId && (o.type === 'array' || o.type === 'string')
  ) as ArrayVisualNode | StringVisualNode | undefined;

  if (!targetNode) {
    return { x: pointer.x, y: pointer.y };
  }

  const totalCells = targetNode.type === 'array' 
    ? (targetNode as ArrayVisualNode).data.elements?.length || 1 
    : (targetNode as StringVisualNode).data.characters?.length || 1;
  const safeIdx = Math.max(0, Math.min(totalCells - 1, pointer.data.targetIndex));

  const cellCenter = getArrayCellCenter(targetNode, safeIdx);
  const direction = pointer.data.direction || 'up';
  const pointerW = pointer.width || 44;
  const pointerH = pointer.height || 54;

  // Stagger pointers that share the same target cell + direction so they sit
  // closely side-by-side instead of exactly overlapping one another.
  const siblings = objects
    .filter(
      (o): o is PointerVisualNode =>
        o.type === 'pointer' &&
        o.data.targetNodeId === pointer.data.targetNodeId &&
        o.data.targetIndex === pointer.data.targetIndex &&
        (o.data.direction || 'up') === direction
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const rank = Math.max(0, siblings.findIndex((o) => o.id === pointer.id));
  const staggerGap = 18;
  const staggerOffset = siblings.length > 1 ? (rank - (siblings.length - 1) / 2) * staggerGap : 0;

  // One grid-dot's worth of breathing room on every side, so the arrow tip
  // sits a consistent distance from the array regardless of which side it's on.
  const gapToArray = 20;

  switch (direction) {
    case 'down':
      // Arrow points down to the top of cell
      return {
        x: cellCenter.x - (pointerW / 2) + staggerOffset,
        y: targetNode.y - pointerH - gapToArray,
      };
    case 'up':
      // Arrow points up to the true bottom of the cell (below any index-label row)
      return {
        x: cellCenter.x - (pointerW / 2) + staggerOffset,
        y: targetNode.y + getIndexLabelOffset(targetNode) + targetNode.height + gapToArray,
      };
    case 'left':
      return {
        x: targetNode.x + targetNode.width + gapToArray,
        y: cellCenter.y - (pointerH / 2) + staggerOffset,
      };
    case 'right':
      return {
        x: targetNode.x - pointerW - gapToArray,
        y: cellCenter.y - (pointerH / 2) + staggerOffset,
      };
    default:
      return { x: pointer.x, y: pointer.y };
  }
}

/**
 * Calculates the exact rendered position, width, and span for a RangeVisualNode
 * when anchored to an Array or String cell span.
 */
export function calculateRangePosition(
  range: RangeVisualNode,
  objects: VisualNode[]
): { x: number; y: number; width: number; height: number } {
  const defaultW = range.width || 200;
  const defaultH = range.height || 56;

  if (!range.data.targetNodeId || range.data.startIndex === undefined) {
    return { x: range.x, y: range.y, width: defaultW, height: defaultH };
  }

  const targetNode = objects.find(
    (o) => o.id === range.data.targetNodeId && (o.type === 'array' || o.type === 'string')
  ) as ArrayVisualNode | StringVisualNode | undefined;

  if (!targetNode) {
    return { x: range.x, y: range.y, width: defaultW, height: defaultH };
  }

  const cellSize = targetNode.data.cellSize || 56;
  const totalCells = targetNode.type === 'array' 
    ? (targetNode as ArrayVisualNode).data.elements?.length || 1 
    : (targetNode as StringVisualNode).data.characters?.length || 1;

  const startIdx = Math.max(0, Math.min(totalCells - 1, range.data.startIndex ?? 0));
  const endIdx = Math.max(startIdx, Math.min(totalCells - 1, range.data.endIndex ?? startIdx));

  const minIdx = Math.min(startIdx, endIdx);
  const maxIdx = Math.max(startIdx, endIdx);

  const spanLeft = targetNode.x + minIdx * cellSize;
  const spanWidth = Math.max(cellSize, (maxIdx - minIdx + 1) * cellSize);
  const variant = range.data.variant || 'bracket';

  if (variant === 'window-box') {
    return {
      x: spanLeft - 4,
      y: targetNode.y - 4,
      width: spanWidth + 8,
      height: targetNode.height + 8,
    };
  }

  // Bracket / Line sits above the target array by default
  const height = range.height || 56;
  return {
    x: spanLeft,
    y: targetNode.y - height - 8,
    width: spanWidth,
    height,
  };
}
