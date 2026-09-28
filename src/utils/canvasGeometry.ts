import { VisualNode, ArrayVisualNode, StringVisualNode, PointerVisualNode, RangeVisualNode, TreeNodeData } from '../types/simulation';

export const TREE_NODE_DIAMETER = 44;

// Point on a rectangle's boundary (centered at cx,cy with the given half
// extents) where a ray from its center toward (towardX, towardY) exits --
// the standard "clip a line to a box" trick, used so a linked-list arrow
// stops flush at each node's edge instead of running into its middle.
function clipLineToRect(cx: number, cy: number, halfW: number, halfH: number, towardX: number, towardY: number) {
  const dx = towardX - cx;
  const dy = towardY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY, 1);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

export interface ListLinkSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: 'next' | 'prev';
  color: string;
}

export interface ListLinkRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Recomputed fresh every render from each list node's LIVE position, so
// dragging any individual node -- moving it anywhere relative to its
// next/prev neighbors -- keeps every arrow attached and correctly routed,
// with no manual re-wiring. `next` and `prev` arrows between the same pair
// of nodes are offset to opposite sides of the direct line so a doubly
// linked list shows two parallel lines instead of one line drawn twice.
export function computeListLinks(
  nodes: { id: string; next?: string | null; prev?: string | null; lineColor?: string }[],
  getRect: (id: string) => ListLinkRect | undefined
): ListLinkSegment[] {
  const OFFSET = 5;
  const segments: ListLinkSegment[] = [];

  const addSegment = (fromId: string, toId: string, kind: 'next' | 'prev', color: string) => {
    const a = getRect(fromId);
    const b = getRect(toId);
    if (!a || !b) return;
    const acx = a.x + a.width / 2;
    const acy = a.y + a.height / 2;
    const bcx = b.x + b.width / 2;
    const bcy = b.y + b.height / 2;

    const dx = bcx - acx;
    const dy = bcy - acy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const px = -dy / dist;
    const py = dx / dist;
    const sign = kind === 'next' ? 1 : -1;
    const ox = px * OFFSET * sign;
    const oy = py * OFFSET * sign;

    const start = clipLineToRect(acx + ox, acy + oy, a.width / 2, a.height / 2, bcx + ox, bcy + oy);
    const end = clipLineToRect(bcx + ox, bcy + oy, b.width / 2, b.height / 2, acx + ox, acy + oy);
    segments.push({ x1: start.x, y1: start.y, x2: end.x, y2: end.y, kind, color });
  };

  for (const n of nodes) {
    if (n.next) addSegment(n.id, n.next, 'next', n.lineColor || '#22d3ee');
    if (n.prev) addSegment(n.id, n.prev, 'prev', n.lineColor || '#f59e0b');
  }

  return segments;
}

export interface TreeLayoutPosition {
  node: TreeNodeData;
  x: number;
  y: number;
}

export interface TreeLayoutEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TreeLayoutResult {
  positions: TreeLayoutPosition[];
  edges: TreeLayoutEdge[];
  width: number;
  height: number;
}

// Shared by TreeNodeView (to actually draw the tree) and the Properties
// panel (to keep the node's stored width/height in sync whenever the tree
// structure is edited) -- one source of truth for where every node/edge
// lands, so the two never drift apart. Classic recursive binary-tree layout:
// each child gets half its parent's horizontal spread, so subtrees never
// overlap regardless of depth.
export function computeTreeLayout(
  root: TreeNodeData | null | undefined,
  horizontalSpacing: number = 80,
  verticalSpacing: number = 70
): TreeLayoutResult {
  const PADDING = TREE_NODE_DIAMETER / 2 + 10;

  if (!root) {
    const empty = TREE_NODE_DIAMETER + PADDING * 2;
    return { positions: [], edges: [], width: empty, height: empty };
  }

  const raw: { node: TreeNodeData; x: number; y: number }[] = [];
  const rawEdges: TreeLayoutEdge[] = [];

  const walk = (node: TreeNodeData, depth: number, x: number) => {
    const y = depth * verticalSpacing;
    raw.push({ node, x, y });
    const childSpacing = Math.max(24, horizontalSpacing / Math.pow(2, depth));
    if (node.left) {
      rawEdges.push({ x1: x, y1: y, x2: x - childSpacing, y2: y + verticalSpacing });
      walk(node.left, depth + 1, x - childSpacing);
    }
    if (node.right) {
      rawEdges.push({ x1: x, y1: y, x2: x + childSpacing, y2: y + verticalSpacing });
      walk(node.right, depth + 1, x + childSpacing);
    }
  };
  walk(root, 0, 0);

  const minX = Math.min(...raw.map((p) => p.x));
  const maxX = Math.max(...raw.map((p) => p.x));
  const maxY = Math.max(...raw.map((p) => p.y));
  const offsetX = -minX + PADDING;

  const positions: TreeLayoutPosition[] = raw.map((p) => ({ node: p.node, x: p.x + offsetX, y: p.y + PADDING }));
  const edges: TreeLayoutEdge[] = rawEdges.map((e) => ({
    x1: e.x1 + offsetX,
    y1: e.y1 + PADDING,
    x2: e.x2 + offsetX,
    y2: e.y2 + PADDING,
  }));

  return {
    positions,
    edges,
    width: maxX - minX + PADDING * 2,
    height: maxY + PADDING * 2,
  };
}

export function snapToGrid(value: number, gridSize: number = 20): number {
  return Math.round(value / gridSize) * gridSize;
}

export interface SmartSnapResult {
  x: number | null;
  y: number | null;
  guideX: number | null;
  guideY: number | null;
}

// Figma-style smart alignment: while dragging a node, check its left/center/
// right edges against every other node's left/center/right edges (and same
// for top/center/bottom), and snap to whichever single edge pair is closest,
// as long as it's within `threshold` canvas-space units. Independent per
// axis, so you can align horizontally with one node and vertically with a
// completely different one in the same drag.
export function computeSmartSnap(
  dragged: { x: number; y: number; width: number; height: number },
  others: { x: number; y: number; width: number; height: number }[],
  threshold: number
): SmartSnapResult {
  let bestXDiff = threshold;
  let snapX: number | null = null;
  let guideX: number | null = null;

  let bestYDiff = threshold;
  let snapY: number | null = null;
  let guideY: number | null = null;

  const draggedEdgesX = [dragged.x, dragged.x + dragged.width / 2, dragged.x + dragged.width];
  const draggedEdgesY = [dragged.y, dragged.y + dragged.height / 2, dragged.y + dragged.height];

  for (const other of others) {
    const otherEdgesX = [other.x, other.x + other.width / 2, other.x + other.width];
    const otherEdgesY = [other.y, other.y + other.height / 2, other.y + other.height];

    for (const dEdge of draggedEdgesX) {
      for (const oEdge of otherEdgesX) {
        const diff = Math.abs(dEdge - oEdge);
        if (diff < bestXDiff) {
          bestXDiff = diff;
          snapX = dragged.x + (oEdge - dEdge);
          guideX = oEdge;
        }
      }
    }

    for (const dEdge of draggedEdgesY) {
      for (const oEdge of otherEdgesY) {
        const diff = Math.abs(dEdge - oEdge);
        if (diff < bestYDiff) {
          bestYDiff = diff;
          snapY = dragged.y + (oEdge - dEdge);
          guideY = oEdge;
        }
      }
    }
  }

  return { x: snapX, y: snapY, guideX, guideY };
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
