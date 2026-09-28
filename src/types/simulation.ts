export type VisualNodeType =
  | 'array'
  | 'string'
  | 'variable'
  | 'value'
  | 'pointer'
  | 'text'
  | 'arrow'
  | 'highlight'
  | 'box'
  | 'stack'
  | 'range'
  | 'hashmap'
  | 'tree'
  | 'listnode';

export interface BaseNodeStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  color?: string;
  fontSize?: number;
  opacity?: number;
  glow?: boolean;
  glowColor?: string;
}

export interface BaseVisualNode {
  id: string;
  type: VisualNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  style: BaseNodeStyle;
  // Locked nodes ignore clicks/drags on canvas (so an overlapping background
  // shape can't steal selection from whatever sits "inside" it) -- unlock
  // via the small lock badge that appears on top of a locked node instead.
  locked?: boolean;
}

export interface ArrayElement {
  id: string;
  value: string | number;
  highlight?: 'none' | 'active' | 'found' | 'swapping' | 'visited' | 'dimmed' | 'pushing' | 'popping' | 'window';
  customColor?: string;
  strikethrough?: boolean;
}

export interface ArrayVisualNode extends BaseVisualNode {
  type: 'array';
  data: {
    name?: string;
    showIndexes: boolean;
    orientation: 'horizontal' | 'vertical';
    cellSize: number;
    elements: ArrayElement[];
  };
}

export interface StringVisualNode extends BaseVisualNode {
  type: 'string';
  data: {
    name?: string;
    showIndexes: boolean;
    cellSize: number;
    characters: ArrayElement[];
  };
}

export interface VariableVisualNode extends BaseVisualNode {
  type: 'variable';
  data: {
    name: string;
    value: string | number | boolean;
    dataType?: 'number' | 'string' | 'boolean' | 'pointer';
    animationStyle?: 'strikethrough' | 'crossfade' | 'slide';
  };
}

export interface ValueVisualNode extends BaseVisualNode {
  type: 'value';
  data: {
    value: string | number | boolean;
    dataType?: 'number' | 'string' | 'boolean';
    strikethrough?: boolean;
  };
}

export interface PointerVisualNode extends BaseVisualNode {
  type: 'pointer';
  data: {
    label: string;
    direction: 'down' | 'up' | 'left' | 'right';
    color: string;
    targetNodeId?: string;
    targetIndex?: number;
  };
}

export interface RangeVisualNode extends BaseVisualNode {
  type: 'range';
  data: {
    label?: string;
    startLabel?: string;
    endLabel?: string;
    targetNodeId?: string;
    startIndex?: number;
    endIndex?: number;
    variant?: 'bracket' | 'line' | 'window-box' | 'double-arrow' | 'curly-bracket';
    color?: string;
    showIndices?: boolean;
    showLength?: boolean;
  };
}

export interface TextVisualNode extends BaseVisualNode {
  type: 'text';
  data: {
    text: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    isCallout?: boolean;
    badgeText?: string;
  };
}

export interface ArrowVisualNode extends BaseVisualNode {
  type: 'arrow';
  data: {
    label?: string;
    startNodeId?: string;
    endNodeId?: string;
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
    curved?: boolean;
    arrowHead: 'end' | 'both' | 'none';
    color: string;
  };
}

export interface HighlightVisualNode extends BaseVisualNode {
  type: 'highlight' | 'box';
  data: {
    label?: string;
    variant: 'window' | 'glow' | 'dashed' | 'filled';
    color: string;
    // Independent fill color -- `color` above doubles as the border/label
    // accent, so a plain rectangle needs its own fill to let the two differ.
    fillColor?: string;
  };
}

// First-Class Stack Component (LIFO vertical box with push & pop off)
export interface StackVisualNode extends BaseVisualNode {
  type: 'stack';
  data: {
    name?: string;               // e.g. "st", "stack"
    capacity?: number;
    elements: ArrayElement[];    // bottom to top (index 0 is bottom, index length-1 is top)
    lastAction?: 'push' | 'pop' | 'peek' | 'none';
    lastPoppedValue?: string | number;
  };
}

export interface HashMapEntry {
  id: string;
  key: string | number;
  value: string | number;
  highlight?: 'none' | 'active' | 'found' | 'inserted' | 'removed' | 'updated';
  color?: string;
}

// Unordered key -> value table (HashMap/Dictionary), rendered as stacked rows.
export interface HashMapVisualNode extends BaseVisualNode {
  type: 'hashmap';
  data: {
    name?: string;
    entries: HashMapEntry[];
  };
}

// A single binary tree node -- deliberately recursive so a whole subtree is
// just plain nested data, no separate node-id bookkeeping required.
export interface TreeNodeData {
  id: string;
  value: string | number;
  left?: TreeNodeData | null;
  right?: TreeNodeData | null;
  highlight?: 'none' | 'active' | 'found' | 'visited';
  color?: string;
}

export interface TreeVisualNode extends BaseVisualNode {
  type: 'tree';
  data: {
    name?: string;
    root: TreeNodeData | null;
    // Horizontal gap between a node and each child at the ROOT level; halves
    // every level down so subtrees never overlap. Vertical gap is constant
    // per level. Both are user-adjustable so a wide/deep tree can be spread
    // out (or a small one made compact) instead of a fixed layout forever.
    horizontalSpacing?: number;
    verticalSpacing?: number;
  };
}

// A single linked-list node -- deliberately its OWN top-level canvas object
// (not bundled inside a parent's data array like Array/Stack) so it can be
// dragged independently; `next`/`prev` are just other list nodes' ids, and
// the connecting arrows are recomputed from live positions every render, the
// same way Pointer nodes already track a target by id instead of a fixed
// offset. Singly/doubly/circular are just different next/prev wiring on top
// of the same node shape, not separate types.
export interface ListNodeVisualNode extends BaseVisualNode {
  type: 'listnode';
  data: {
    value: string | number;
    next?: string | null;
    prev?: string | null;
    label?: string; // optional badge like "head" shown above the node
    highlight?: 'none' | 'active' | 'found' | 'visited';
    color?: string;
    lineColor?: string; // color of this node's outgoing next/prev connector lines
  };
}

export type VisualNode =
  | ArrayVisualNode
  | StringVisualNode
  | VariableVisualNode
  | ValueVisualNode
  | PointerVisualNode
  | TextVisualNode
  | ArrowVisualNode
  | HighlightVisualNode
  | StackVisualNode
  | RangeVisualNode
  | HashMapVisualNode
  | TreeVisualNode
  | ListNodeVisualNode;

export interface StepModel {
  id: string;
  name: string;
  description?: string;
  durationMs?: number;
  objects: VisualNode[];
}

export interface SimulationSettings {
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number;
  snapToGrid: boolean;
  theme: 'dark' | 'light';
  defaultPlaybackSpeed: number;
  // The "Algorithm Overview" HUD card: optional, and its content is written
  // by hand rather than derived from whatever nodes happen to be on canvas.
  showAlgorithmOverview?: boolean;
  algorithmOverviewText?: string;
}

export interface SimulationData {
  id: string;
  name: string;
  description?: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  tags?: string;
  settings: SimulationSettings;
  steps: StepModel[];
  // Present only for simulations generated from the Code Import flow, so the
  // dry run can be regenerated from scratch after the input is edited.
  sourceAlgorithmType?: string;
  sourceCode?: string;
  sourceLanguage?: string;
}

export interface SimulationSummary {
  id: string;
  name: string;
  description?: string;
  schema_version: number;
  tags?: string;
  step_count: number;
  thumbnail?: string;
  is_public: number;
  folder_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  simulation_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  created_at?: string;
}
