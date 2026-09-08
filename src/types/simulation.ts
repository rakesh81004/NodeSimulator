export type VisualNodeType =
  | 'array'
  | 'string'
  | 'variable'
  | 'pointer'
  | 'text'
  | 'arrow'
  | 'highlight'
  | 'box'
  | 'stack'
  | 'range';

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
}

export interface ArrayElement {
  id: string;
  value: string | number;
  highlight?: 'none' | 'active' | 'found' | 'swapping' | 'visited' | 'dimmed' | 'pushing' | 'popping' | 'window';
  customColor?: string;
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

export type VisualNode =
  | ArrayVisualNode
  | StringVisualNode
  | VariableVisualNode
  | PointerVisualNode
  | TextVisualNode
  | ArrowVisualNode
  | HighlightVisualNode
  | StackVisualNode
  | RangeVisualNode;

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
