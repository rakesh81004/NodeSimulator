import React, { useState } from 'react';
import { TreeVisualNode, TreeNodeData } from '../../../types/simulation';
import { useSimulationStore } from '../../../store/simulationStore';
import { useTheme } from '../../../utils/themeConfig';
import { useIsLightTheme } from '../../../utils/canvasTheme';
import { computeTreeLayout, TREE_NODE_DIAMETER } from '../../../utils/canvasGeometry';

interface Props {
  node: TreeVisualNode;
  isSelected: boolean;
  isInteractive?: boolean;
}

// Replaces one node inside a TreeNodeData tree by id, returning a new tree
// (never mutates in place, so React/the undo-history diffing stays honest).
function replaceInTree(root: TreeNodeData | null, targetId: string, updater: (n: TreeNodeData) => TreeNodeData): TreeNodeData | null {
  if (!root) return root;
  if (root.id === targetId) return updater(root);
  return {
    ...root,
    left: root.left ? replaceInTree(root.left, targetId, updater) : root.left,
    right: root.right ? replaceInTree(root.right, targetId, updater) : root.right,
  };
}

export const TreeNodeView: React.FC<Props> = ({ node, isSelected, isInteractive = true }) => {
  const { updateObject } = useSimulationStore();
  const { themeColor } = useTheme();
  const isLight = useIsLightTheme();
  const [editingId, setEditingId] = useState<string | null>(null);

  const { name = 'root', root = null, horizontalSpacing = 80, verticalSpacing = 70 } = node.data;
  const primaryColor = (node.style as any)?.borderColor || themeColor;
  const layout = computeTreeLayout(root, horizontalSpacing, verticalSpacing);
  const radius = TREE_NODE_DIAMETER / 2;
  const mutedTextColor = isLight ? '#111111' : '#f8fafc';

  const formatVal = (v: any) => {
    if (v === undefined || v === null) return '';
    return String(v).replace(/^['"]|['"]$/g, '');
  };
  const parseVal = (raw: string): string | number => {
    const clean = raw.replace(/^['"]|['"]$/g, '');
    const num = Number(clean);
    return !isNaN(num) && clean.trim() !== '' ? num : clean;
  };

  const setValue = (targetId: string, value: string | number) => {
    const nextRoot = replaceInTree(root, targetId, (n) => ({ ...n, value }));
    updateObject(node.id, { data: { ...node.data, root: nextRoot } } as any);
  };

  const customFill = (node.style as any)?.backgroundColor;

  // Matches ArrayNodeView's theme: an untouched node is a solid theme-colored
  // circle in dark mode, or plain white-on-black (worksheet style) in light
  // mode; a highlighted/custom-colored node keeps its own color with white
  // text in either theme.
  const isPlainNode = (n: TreeNodeData) => isLight && !n.color && !customFill && (!n.highlight || n.highlight === 'none');

  const nodeFill = (n: TreeNodeData) => {
    if (n.color) return n.color;
    switch (n.highlight) {
      case 'found':
        return '#00c853';
      case 'active':
      case 'visited':
        return primaryColor;
      default:
        if (customFill) return customFill;
        return isLight ? '#ffffff' : primaryColor;
    }
  };

  const nodeTextColor = (n: TreeNodeData) => (isPlainNode(n) ? '#000000' : '#ffffff');

  // Trim each connecting line back by the node radius at both ends, so it
  // stops flush at the circle's edge instead of cutting straight through
  // the middle of it.
  const trimToEdge = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    return {
      x1: x1 + ux * radius,
      y1: y1 + uy * radius,
      x2: x2 - ux * radius,
      y2: y2 - uy * radius,
    };
  };

  return (
    <div
      className={`relative select-none transition-all rounded-2xl ${isSelected ? 'ring-2 ring-white/90 shadow-2xl' : ''}`}
      style={{ width: `${layout.width}px`, height: `${layout.height}px` }}
      title={name}
    >
      {!root ? (
        <div
          className="w-full h-full flex items-center justify-center rounded-2xl border-2 border-dashed font-sans text-xs italic"
          style={{ borderColor: primaryColor, color: `${mutedTextColor}88` }}
        >
          empty tree
        </div>
      ) : (
        <>
          <svg className="absolute inset-0 pointer-events-none" width={layout.width} height={layout.height}>
            {layout.edges.map((e, i) => {
              const trimmed = trimToEdge(e.x1, e.y1, e.x2, e.y2);
              return <line key={i} x1={trimmed.x1} y1={trimmed.y1} x2={trimmed.x2} y2={trimmed.y2} stroke={primaryColor} strokeWidth={2} />;
            })}
          </svg>

          {layout.positions.map(({ node: n, x, y }) => (
            <div
              key={n.id}
              className="absolute flex items-center justify-center rounded-full font-sans font-bold text-base cursor-pointer"
              style={{
                left: `${x - radius}px`,
                top: `${y - radius}px`,
                width: `${TREE_NODE_DIAMETER}px`,
                height: `${TREE_NODE_DIAMETER}px`,
                backgroundColor: nodeFill(n),
                border: `2px solid ${primaryColor}`,
                color: nodeTextColor(n),
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isInteractive) setEditingId(n.id);
              }}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              {editingId === n.id && isInteractive ? (
                <input
                  type="text"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  value={formatVal(n.value)}
                  onChange={(e) => setValue(n.id, parseVal(e.target.value))}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === 'Escape') setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full h-full bg-transparent outline-none text-center font-sans font-bold"
                  style={{ color: nodeTextColor(n) }}
                />
              ) : (
                formatVal(n.value)
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
};
