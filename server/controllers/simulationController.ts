import { Response } from 'express';
import crypto from 'crypto';
import { execute, query, queryOne, withTransaction } from '../db/database';
import { AuthenticatedRequest } from '../auth/authMiddleware';
import {
  CURRENT_SCHEMA_VERSION,
  migrateSimulationPayload,
  SimulationPayload,
} from '../migrations/migrationRunner';
import { TEMPLATES } from '../templates/defaultTemplates';

export async function listSimulations(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { search, tag, folderId } = req.query;

    let sql = `
      SELECT id, name, description, schema_version, tags, step_count, thumbnail, is_public, folder_id, created_at, updated_at
      FROM simulations
      WHERE user_id = ?
    `;
    const params: any[] = [userId];

    if (search && typeof search === 'string') {
      sql += ` AND (name LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (tag && typeof tag === 'string') {
      sql += ` AND tags LIKE ?`;
      params.push(`%${tag}%`);
    }

    if (folderId && typeof folderId === 'string') {
      if (folderId === 'none') {
        sql += ` AND folder_id IS NULL`;
      } else {
        sql += ` AND folder_id = ?`;
        params.push(folderId);
      }
    }

    sql += ` ORDER BY updated_at DESC`;

    const simulations = await query(sql, params);
    return res.json({ simulations });
  } catch (error: any) {
    console.error('[Simulations] List error:', error);
    return res.status(500).json({ error: 'Failed to fetch simulations.' });
  }
}

export async function createSimulation(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { name, description, templateId, folderId } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Simulation name is required.' });
    }

    if (folderId) {
      const folder = await queryOne<any>('SELECT id FROM folders WHERE id = ? AND user_id = ?', [folderId, userId]);
      if (!folder) {
        return res.status(400).json({ error: 'Folder not found.' });
      }
    }

    const simId = `sim_${crypto.randomUUID()}`;
    let simulationData: SimulationPayload;

    if (templateId && TEMPLATES[templateId]) {
      const tpl = TEMPLATES[templateId];
      simulationData = {
        id: simId,
        name: name.trim(),
        description: description?.trim() || tpl.description || '',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: tpl.settings || {
          canvasWidth: 6000,
          canvasHeight: 4000,
          gridSize: 20,
          snapToGrid: true,
          theme: 'dark',
          defaultPlaybackSpeed: 1.0,
        },
        steps: (tpl.steps || []).map((step, idx) => ({
          ...step,
          id: `step_${idx + 1}_${crypto.randomUUID().slice(0, 8)}`,
        })),
      };
    } else {
      simulationData = {
        id: simId,
        name: name.trim(),
        description: description?.trim() || '',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          canvasWidth: 6000,
          canvasHeight: 4000,
          gridSize: 20,
          snapToGrid: true,
          theme: 'dark',
          defaultPlaybackSpeed: 1.0,
        },
        steps: [
          {
            id: `step_1_${crypto.randomUUID().slice(0, 8)}`,
            name: 'Step 1: Initial State',
            description: 'Define initial array, variables, or pointers here.',
            durationMs: 800,
            objects: [],
          },
        ],
      };
    }

    const dataJson = JSON.stringify(simulationData);
    const stepCount = simulationData.steps.length;

    await execute(
      `INSERT INTO simulations (id, user_id, name, description, schema_version, tags, data, step_count, folder_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        simId,
        userId,
        simulationData.name,
        simulationData.description,
        CURRENT_SCHEMA_VERSION,
        templateId ? 'Template,DSA' : 'Custom',
        dataJson,
        stepCount,
        folderId || null,
      ]
    );

    return res.status(201).json({
      message: 'Simulation created successfully.',
      simulation: simulationData,
    });
  } catch (error: any) {
    console.error('[Simulations] Create error:', error);
    return res.status(500).json({ error: 'Failed to create simulation.' });
  }
}

export async function getSimulation(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const row = await queryOne<any>(
      `SELECT * FROM simulations
       WHERE id = ? AND (user_id = ? OR is_public = 1)`,
      [id, userId]
    );

    if (!row) {
      return res.status(404).json({ error: 'Simulation not found.' });
    }

    const { data, migrated } = migrateSimulationPayload(row.data);

    if (migrated) {
      console.log(`[Simulations] Auto-migrating simulation ${id} from v${row.schema_version} to v${CURRENT_SCHEMA_VERSION}`);
      const backupId = `bkp_${crypto.randomUUID()}`;
      await withTransaction(async (conn) => {
        await conn.execute(
          `INSERT INTO simulation_backups (id, simulation_id, schema_version, data, reason)
           VALUES (?, ?, ?, ?, ?)`,
          [backupId, id, row.schema_version, row.data, 'AUTO_MIGRATION_ON_READ']
        );
        await conn.execute(
          `UPDATE simulations
           SET schema_version = ?, data = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [CURRENT_SCHEMA_VERSION, JSON.stringify(data), id]
        );
      });
    }

    return res.json({ simulation: data });
  } catch (error: any) {
    console.error('[Simulations] Get error:', error);
    return res.status(500).json({ error: 'Failed to load simulation.' });
  }
}

export async function updateSimulation(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { data, name, description, tags, thumbnail } = req.body;

    const existing = await queryOne<any>(
      'SELECT * FROM simulations WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Simulation not found or access denied.' });
    }

    if (!data) {
      return res.status(400).json({ error: 'Missing simulation data.' });
    }

    const { data: migratedData } = migrateSimulationPayload(data);
    migratedData.updatedAt = new Date().toISOString();

    const simName = name || migratedData.name || existing.name;
    const simDesc = description !== undefined ? description : (migratedData.description || existing.description);
    const stepCount = migratedData.steps ? migratedData.steps.length : existing.step_count;
    const dataJson = JSON.stringify(migratedData);

    await execute(
      `UPDATE simulations
       SET name = ?, description = ?, tags = COALESCE(?, tags),
           data = ?, step_count = ?, thumbnail = COALESCE(?, thumbnail),
           schema_version = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        simName,
        simDesc,
        tags || null,
        dataJson,
        stepCount,
        thumbnail || null,
        CURRENT_SCHEMA_VERSION,
        id,
        userId,
      ]
    );

    return res.json({
      message: 'Simulation updated successfully.',
      simulation: migratedData,
    });
  } catch (error: any) {
    console.error('[Simulations] Update error:', error);
    return res.status(500).json({ error: 'Failed to update simulation.' });
  }
}

export async function deleteSimulation(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const result = await execute(
      'DELETE FROM simulations WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Simulation not found or access denied.' });
    }

    return res.json({ message: 'Simulation deleted successfully.' });
  } catch (error: any) {
    console.error('[Simulations] Delete error:', error);
    return res.status(500).json({ error: 'Failed to delete simulation.' });
  }
}

export async function moveSimulationFolder(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { folderId } = req.body;

    if (folderId) {
      const folder = await queryOne<any>('SELECT id FROM folders WHERE id = ? AND user_id = ?', [folderId, userId]);
      if (!folder) {
        return res.status(400).json({ error: 'Folder not found.' });
      }
    }

    const result = await execute(
      'UPDATE simulations SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [folderId || null, id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Simulation not found or access denied.' });
    }

    return res.json({ message: 'Simulation moved successfully.' });
  } catch (error: any) {
    console.error('[Simulations] Move to folder error:', error);
    return res.status(500).json({ error: 'Failed to move simulation.' });
  }
}

export async function duplicateSimulation(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await queryOne<any>(
      'SELECT * FROM simulations WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Simulation not found.' });
    }

    const { data } = migrateSimulationPayload(existing.data);
    const newSimId = `sim_${crypto.randomUUID()}`;

    const newSimData: SimulationPayload = {
      ...data,
      id: newSimId,
      name: `${existing.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const dataJson = JSON.stringify(newSimData);

    await execute(
      `INSERT INTO simulations (id, user_id, name, description, schema_version, tags, data, step_count, thumbnail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newSimId,
        userId,
        newSimData.name,
        existing.description,
        CURRENT_SCHEMA_VERSION,
        existing.tags,
        dataJson,
        newSimData.steps.length,
        existing.thumbnail,
      ]
    );

    return res.status(201).json({
      message: 'Simulation duplicated successfully.',
      simulation: newSimData,
    });
  } catch (error: any) {
    console.error('[Simulations] Duplicate error:', error);
    return res.status(500).json({ error: 'Failed to duplicate simulation.' });
  }
}

export async function exportSimulation(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await queryOne<any>(
      'SELECT * FROM simulations WHERE id = ? AND (user_id = ? OR is_public = 1)',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Simulation not found.' });
    }

    const { data } = migrateSimulationPayload(existing.data);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${data.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_v${data.schemaVersion}.json"`);
    return res.send(JSON.stringify(data, null, 2));
  } catch (error: any) {
    console.error('[Simulations] Export error:', error);
    return res.status(500).json({ error: 'Failed to export simulation.' });
  }
}

export async function importSimulation(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const rawData = req.body;

    if (!rawData || typeof rawData !== 'object') {
      return res.status(400).json({ error: 'Invalid simulation JSON payload.' });
    }

    const { data: migratedData } = migrateSimulationPayload(rawData);
    const newSimId = `sim_${crypto.randomUUID()}`;

    migratedData.id = newSimId;
    migratedData.name = migratedData.name ? `${migratedData.name} (Imported)` : 'Imported Simulation';
    migratedData.createdAt = new Date().toISOString();
    migratedData.updatedAt = new Date().toISOString();

    const dataJson = JSON.stringify(migratedData);

    await execute(
      `INSERT INTO simulations (id, user_id, name, description, schema_version, tags, data, step_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newSimId,
        userId,
        migratedData.name,
        migratedData.description || 'Imported simulation',
        CURRENT_SCHEMA_VERSION,
        'Imported',
        dataJson,
        migratedData.steps.length,
      ]
    );

    return res.status(201).json({
      message: 'Simulation imported successfully.',
      simulation: migratedData,
    });
  } catch (error: any) {
    console.error('[Simulations] Import error:', error);
    return res.status(500).json({ error: 'Failed to import simulation. Check file format.' });
  }
}

export function getTemplatesList(_req: AuthenticatedRequest, res: Response) {
  const templatesList = Object.entries(TEMPLATES).map(([id, tpl]) => ({
    id,
    name: tpl.name,
    description: tpl.description,
    stepCount: tpl.steps?.length || 0,
  }));

  return res.json({ templates: templatesList });
}
