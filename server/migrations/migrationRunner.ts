export const CURRENT_SCHEMA_VERSION = 2;

export interface SimulationPayload {
  id: string;
  name: string;
  description?: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  settings?: {
    canvasWidth: number;
    canvasHeight: number;
    gridSize: number;
    snapToGrid: boolean;
    theme: 'dark' | 'light';
    defaultPlaybackSpeed: number;
  };
  steps: Array<{
    id: string;
    name: string;
    description?: string;
    durationMs?: number;
    objects: Array<any>;
  }>;
}

/**
 * Migrates V1 schema to V2:
 * - Ensures all objects have stable IDs, zIndex, styles, and normalized payload structures.
 * - Ensures settings block is present with grid and canvas bounds.
 * - Ensures variable nodes have animationStyle default ('strikethrough').
 * - Ensures pointer nodes have attachment info and direction.
 */
export function migrateV1ToV2(oldData: any): SimulationPayload {
  console.log(`[Migration] Running migrateV1ToV2 for simulation ${oldData.id || 'unknown'}`);
  
  const steps = (oldData.steps || []).map((step: any, sIdx: number) => {
    const objects = (step.objects || []).map((obj: any, oIdx: number) => {
      // Normalize object ID and structure
      const id = obj.id || `obj_${sIdx}_${oIdx}_${Date.now()}`;
      const baseStyle = {
        backgroundColor: obj.style?.backgroundColor || '#1e293b',
        borderColor: obj.style?.borderColor || '#334155',
        borderWidth: obj.style?.borderWidth ?? 1,
        borderRadius: obj.style?.borderRadius ?? 8,
        color: obj.style?.color || '#f8fafc',
        fontSize: obj.style?.fontSize ?? 14,
        opacity: obj.style?.opacity ?? 1,
        glow: obj.style?.glow ?? false,
        glowColor: obj.style?.glowColor || '#6366f1',
      };

      // Type-specific normalization
      if (obj.type === 'variable') {
        return {
          ...obj,
          id,
          zIndex: obj.zIndex ?? 10,
          style: baseStyle,
          data: {
            name: obj.data?.name || obj.name || 'var',
            value: obj.data?.value !== undefined ? obj.data.value : (obj.value !== undefined ? obj.value : 0),
            dataType: obj.data?.dataType || 'number',
            animationStyle: obj.data?.animationStyle || 'strikethrough',
          }
        };
      }

      if (obj.type === 'array') {
        return {
          ...obj,
          id,
          zIndex: obj.zIndex ?? 5,
          style: baseStyle,
          data: {
            name: obj.data?.name || obj.name || 'arr',
            showIndexes: obj.data?.showIndexes ?? true,
            orientation: obj.data?.orientation || 'horizontal',
            cellSize: obj.data?.cellSize || 64,
            elements: (obj.data?.elements || []).map((el: any, elIdx: number) => ({
              id: el.id || `cell_${id}_${elIdx}`,
              value: el.value !== undefined ? el.value : el,
              highlight: el.highlight || 'none',
              customColor: el.customColor || undefined,
            }))
          }
        };
      }

      if (obj.type === 'pointer') {
        return {
          ...obj,
          id,
          zIndex: obj.zIndex ?? 15,
          style: baseStyle,
          data: {
            label: obj.data?.label || obj.label || 'i',
            direction: obj.data?.direction || 'down',
            color: obj.data?.color || '#38bdf8',
            targetNodeId: obj.data?.targetNodeId || undefined,
            targetIndex: obj.data?.targetIndex !== undefined ? obj.data.targetIndex : undefined,
          }
        };
      }

      return {
        ...obj,
        id,
        zIndex: obj.zIndex ?? 1,
        style: baseStyle,
        data: obj.data || {},
      };
    });

    return {
      id: step.id || `step_${sIdx + 1}`,
      name: step.name || `Step ${sIdx + 1}`,
      description: step.description || '',
      durationMs: step.durationMs || 800,
      objects,
    };
  });

  return {
    id: oldData.id || `sim_${Date.now()}`,
    name: oldData.name || 'Untitled Simulation',
    description: oldData.description || '',
    schemaVersion: 2,
    createdAt: oldData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      canvasWidth: oldData.settings?.canvasWidth || 1200,
      canvasHeight: oldData.settings?.canvasHeight || 700,
      gridSize: oldData.settings?.gridSize || 20,
      snapToGrid: oldData.settings?.snapToGrid ?? true,
      theme: oldData.settings?.theme || 'dark',
      defaultPlaybackSpeed: oldData.settings?.defaultPlaybackSpeed || 1.0,
    },
    steps: steps.length > 0 ? steps : [
      {
        id: 'step_1',
        name: 'Step 1: Initial State',
        description: 'Initial algorithm setup',
        durationMs: 800,
        objects: [],
      }
    ],
  };
}

/**
 * Runs sequential migrations to bring any older schema payload up to CURRENT_SCHEMA_VERSION.
 */
export function migrateSimulationPayload(payload: any): { data: SimulationPayload; migrated: boolean } {
  let data = typeof payload === 'string' ? JSON.parse(payload) : { ...payload };
  const originalVersion = data.schemaVersion || 1;
  let migrated = false;

  if (originalVersion < 2) {
    data = migrateV1ToV2(data);
    migrated = true;
  }

  // Set latest version
  data.schemaVersion = CURRENT_SCHEMA_VERSION;
  return { data, migrated };
}
