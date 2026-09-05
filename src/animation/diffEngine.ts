import { StepModel, VisualNode, VariableVisualNode, PointerVisualNode, ArrayVisualNode, StringVisualNode, StackVisualNode, RangeVisualNode } from '../types/simulation';
import { StepDiffPlan, ObjectModificationDiff } from '../types/diff';

export function computeStepDiff(
  fromStep: StepModel,
  toStep: StepModel,
  fromIndex: number,
  toIndex: number
): StepDiffPlan {
  const fromMap = new Map<string, VisualNode>();
  fromStep.objects.forEach((obj) => fromMap.set(obj.id, obj));

  const toMap = new Map<string, VisualNode>();
  toStep.objects.forEach((obj) => toMap.set(obj.id, obj));

  const addedObjects: VisualNode[] = [];
  const removedObjects: VisualNode[] = [];
  const modifiedObjects: ObjectModificationDiff[] = [];
  const unchangedObjectIds: string[] = [];

  // Find added and modified objects
  for (const [id, toObj] of toMap.entries()) {
    if (!fromMap.has(id)) {
      addedObjects.push(toObj);
    } else {
      const fromObj = fromMap.get(id)!;
      const posChanged = fromObj.x !== toObj.x || fromObj.y !== toObj.y;
      const sizeChanged = fromObj.width !== toObj.width || fromObj.height !== toObj.height;
      const styleChanged = JSON.stringify(fromObj.style) !== JSON.stringify(toObj.style);

      let valueChanged: ObjectModificationDiff['valueChanged'] = undefined;
      let pointerMoved: ObjectModificationDiff['pointerMoved'] = undefined;
      let arrayChanged: ObjectModificationDiff['arrayChanged'] = undefined;
      let rangeChanged: ObjectModificationDiff['rangeChanged'] = undefined;
      let stackChanged: ObjectModificationDiff['stackChanged'] = undefined;

      // Check Variable changes
      if (fromObj.type === 'variable' && toObj.type === 'variable') {
        const fromVar = fromObj as VariableVisualNode;
        const toVar = toObj as VariableVisualNode;
        if (fromVar.data.value !== toVar.data.value) {
          valueChanged = {
            oldValue: fromVar.data.value,
            newValue: toVar.data.value,
            strikethroughRequired: toVar.data.animationStyle !== 'crossfade',
          };
        }
      }

      // Check Pointer changes
      if (fromObj.type === 'pointer' && toObj.type === 'pointer') {
        const fromPtr = fromObj as PointerVisualNode;
        const toPtr = toObj as PointerVisualNode;
        if (
          fromPtr.data.targetIndex !== toPtr.data.targetIndex ||
          fromPtr.data.targetNodeId !== toPtr.data.targetNodeId ||
          fromPtr.data.direction !== toPtr.data.direction
        ) {
          pointerMoved = {
            oldIndex: fromPtr.data.targetIndex,
            newIndex: toPtr.data.targetIndex,
            oldTargetId: fromPtr.data.targetNodeId,
            newTargetId: toPtr.data.targetNodeId,
            oldDirection: fromPtr.data.direction,
            newDirection: toPtr.data.direction,
          };
        }
      }

      // Check Range changes
      if (fromObj.type === 'range' && toObj.type === 'range') {
        const fromRange = fromObj as RangeVisualNode;
        const toRange = toObj as RangeVisualNode;
        const startDiff = fromRange.data.startIndex !== toRange.data.startIndex;
        const endDiff = fromRange.data.endIndex !== toRange.data.endIndex;
        const targetDiff = fromRange.data.targetNodeId !== toRange.data.targetNodeId;

        if (startDiff || endDiff || targetDiff) {
          const oldSpan = (fromRange.data.endIndex ?? 0) - (fromRange.data.startIndex ?? 0);
          const newSpan = (toRange.data.endIndex ?? 0) - (toRange.data.startIndex ?? 0);
          rangeChanged = {
            oldStartIndex: fromRange.data.startIndex,
            newStartIndex: toRange.data.startIndex,
            oldEndIndex: fromRange.data.endIndex,
            newEndIndex: toRange.data.endIndex,
            oldTargetId: fromRange.data.targetNodeId,
            newTargetId: toRange.data.targetNodeId,
            windowShifted: startDiff && endDiff && oldSpan === newSpan,
            windowResized: oldSpan !== newSpan,
          };
        }
      }

      // Check Array & String changes
      if (
        (fromObj.type === 'array' && toObj.type === 'array') ||
        (fromObj.type === 'string' && toObj.type === 'string')
      ) {
        const fromArr = fromObj as ArrayVisualNode | StringVisualNode;
        const toArr = toObj as ArrayVisualNode | StringVisualNode;
        const fromElements = fromArr.type === 'string' ? (fromArr as StringVisualNode).data.characters : (fromArr as ArrayVisualNode).data.elements;
        const toElements = toArr.type === 'string' ? (toArr as StringVisualNode).data.characters : (toArr as ArrayVisualNode).data.elements;

        const countChanged = fromElements.length !== toElements.length;
        const modifiedIndices: number[] = [];
        const valueChanges: { index: number; oldValue: any; newValue: any }[] = [];
        const highlightChanges: { index: number; oldHighlight?: string; newHighlight?: string }[] = [];
        const elementMoves: { fromIndex: number; toIndex: number; value: any; id: string }[] = [];

        const maxLen = Math.max(fromElements.length, toElements.length);
        for (let i = 0; i < maxLen; i++) {
          const fromEl = fromElements[i];
          const toEl = toElements[i];
          if (!fromEl || !toEl || fromEl.value !== toEl.value) {
            modifiedIndices.push(i);
            if (fromEl && toEl) {
              valueChanges.push({
                index: i,
                oldValue: fromEl.value,
                newValue: toEl.value,
              });
            }
          }
          if (fromEl?.highlight !== toEl?.highlight) {
            highlightChanges.push({
              index: i,
              oldHighlight: fromEl?.highlight,
              newHighlight: toEl?.highlight,
            });
          }
        }

        // Detect element swaps & moves between fromElements and toElements
        let swappedIndices: [number, number] | undefined = undefined;
        if (fromElements.length === toElements.length && modifiedIndices.length === 2) {
          const [i, j] = modifiedIndices;
          const fromI = fromElements[i];
          const fromJ = fromElements[j];
          const toI = toElements[i];
          const toJ = toElements[j];

          // Check if (i, j) swapped by value or ID
          if (
            (fromI.value === toJ.value && fromJ.value === toI.value) ||
            (fromI.id === toJ.id && fromJ.id === toI.id)
          ) {
            swappedIndices = [i, j];
            elementMoves.push(
              { fromIndex: i, toIndex: j, value: fromI.value, id: fromI.id },
              { fromIndex: j, toIndex: i, value: fromJ.value, id: fromJ.id }
            );
          }
        } else if (fromElements.length === toElements.length && modifiedIndices.length > 2) {
          // Detect general permutation / multi-element moves
          fromElements.forEach((fromEl, fromIdx) => {
            const matchToIdx = toElements.findIndex((toEl, toIdx) => 
              toIdx !== fromIdx && (toEl.id === fromEl.id || (toEl.value === fromEl.value && modifiedIndices.includes(toIdx)))
            );
            if (matchToIdx !== -1) {
              elementMoves.push({
                fromIndex: fromIdx,
                toIndex: matchToIdx,
                value: fromEl.value,
                id: fromEl.id,
              });
            }
          });
        }

        if (countChanged || modifiedIndices.length > 0 || highlightChanges.length > 0 || !!swappedIndices) {
          arrayChanged = {
            elementCountChanged: countChanged,
            modifiedIndices,
            swappedIndices,
            elementMoves: elementMoves.length > 0 ? elementMoves : undefined,
            valueChanges: valueChanges.length > 0 ? valueChanges : undefined,
            highlightChanges,
          };
        }
      }

      // Check Stack changes
      if (fromObj.type === 'stack' && toObj.type === 'stack') {
        const fromStack = fromObj as StackVisualNode;
        const toStack = toObj as StackVisualNode;
        const fromElements = fromStack.data.elements;
        const toElements = toStack.data.elements;

        const countChanged = fromElements.length !== toElements.length;
        const modifiedIndices: number[] = [];
        const highlightChanges: { index: number; oldHighlight?: string; newHighlight?: string }[] = [];

        const maxLen = Math.max(fromElements.length, toElements.length);
        for (let i = 0; i < maxLen; i++) {
          const fromEl = fromElements[i];
          const toEl = toElements[i];
          if (!fromEl || !toEl || fromEl.value !== toEl.value) {
            modifiedIndices.push(i);
          }
          if (fromEl?.highlight !== toEl?.highlight) {
            highlightChanges.push({
              index: i,
              oldHighlight: fromEl?.highlight,
              newHighlight: toEl?.highlight,
            });
          }
        }

        const actionChanged = fromStack.data.lastAction !== toStack.data.lastAction;
        const poppedValueChanged = fromStack.data.lastPoppedValue !== toStack.data.lastPoppedValue;

        if (countChanged || modifiedIndices.length > 0 || highlightChanges.length > 0 || actionChanged || poppedValueChanged) {
          stackChanged = {
            elementCountChanged: countChanged,
            modifiedIndices,
            highlightChanges,
            actionChanged,
            oldAction: fromStack.data.lastAction,
            newAction: toStack.data.lastAction,
            poppedValueChanged,
            oldPoppedValue: fromStack.data.lastPoppedValue,
            newPoppedValue: toStack.data.lastPoppedValue,
          };
        }
      }

      const hasChange =
        posChanged ||
        sizeChanged ||
        styleChanged ||
        !!valueChanged ||
        !!pointerMoved ||
        !!rangeChanged ||
        !!arrayChanged ||
        !!stackChanged;

      if (hasChange) {
        modifiedObjects.push({
          id,
          type: toObj.type,
          from: fromObj,
          to: toObj,
          positionChanged: posChanged,
          sizeChanged,
          styleChanged,
          valueChanged,
          pointerMoved,
          rangeChanged,
          arrayChanged,
          stackChanged,
        });
      } else {
        unchangedObjectIds.push(id);
      }
    }
  }

  // Find removed objects
  for (const [id, fromObj] of fromMap.entries()) {
    if (!toMap.has(id)) {
      removedObjects.push(fromObj);
    }
  }

  return {
    fromStepId: fromStep.id,
    toStepId: toStep.id,
    fromStepIndex: fromIndex,
    toStepIndex: toIndex,
    durationMs: toStep.durationMs || 800,
    addedObjects,
    removedObjects,
    modifiedObjects,
    unchangedObjectIds,
  };
}
