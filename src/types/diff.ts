import { VisualNode, VisualNodeType } from './simulation';

export interface ObjectModificationDiff {
  id: string;
  type: VisualNodeType;
  from: VisualNode;
  to: VisualNode;
  
  positionChanged: boolean;
  sizeChanged: boolean;
  styleChanged: boolean;
  
  // Specific diff details
  valueChanged?: {
    oldValue: any;
    newValue: any;
    strikethroughRequired: boolean;
  };
  pointerMoved?: {
    oldIndex?: number;
    newIndex?: number;
    oldTargetId?: string;
    newTargetId?: string;
    oldDirection?: string;
    newDirection?: string;
  };
  arrayChanged?: {
    elementCountChanged: boolean;
    modifiedIndices: number[];
    swappedIndices?: [number, number];
    elementMoves?: { fromIndex: number; toIndex: number; value: any; id: string }[];
    valueChanges?: { index: number; oldValue: any; newValue: any }[];
    highlightChanges: { index: number; oldHighlight?: string; newHighlight?: string }[];
  };
  rangeChanged?: {
    oldStartIndex?: number;
    newStartIndex?: number;
    oldEndIndex?: number;
    newEndIndex?: number;
    oldTargetId?: string;
    newTargetId?: string;
    windowShifted?: boolean;
    windowResized?: boolean;
  };
  stackChanged?: {
    elementCountChanged: boolean;
    modifiedIndices: number[];
    highlightChanges: { index: number; oldHighlight?: string; newHighlight?: string }[];
    actionChanged: boolean;
    oldAction?: 'push' | 'pop' | 'peek' | 'none';
    newAction?: 'push' | 'pop' | 'peek' | 'none';
    poppedValueChanged: boolean;
    oldPoppedValue?: string | number;
    newPoppedValue?: string | number;
  };
}

export interface StepDiffPlan {
  fromStepId: string;
  toStepId: string;
  fromStepIndex: number;
  toStepIndex: number;
  durationMs: number;
  
  addedObjects: VisualNode[];
  removedObjects: VisualNode[];
  modifiedObjects: ObjectModificationDiff[];
  unchangedObjectIds: string[];
}

export interface PlaybackState {
  isPlaying: boolean;
  currentStepIndex: number;
  transitionProgress: number; // 0.0 to 1.0 during active transition
  speed: number;              // 0.25, 0.5, 1.0, 1.5, 2.0
  isTransitioning: boolean;
  activeDiffPlan: StepDiffPlan | null;
  loop: boolean;
}
