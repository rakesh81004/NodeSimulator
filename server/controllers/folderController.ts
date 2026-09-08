import { Response } from 'express';
import crypto from 'crypto';
import { execute, query, queryOne } from '../db/database';
import { AuthenticatedRequest } from '../auth/authMiddleware';

export async function listFolders(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const folders = await query(
      `SELECT f.id, f.name, f.color, f.created_at, f.updated_at,
              COUNT(s.id) AS simulation_count
       FROM folders f
       LEFT JOIN simulations s ON s.folder_id = f.id
       WHERE f.user_id = ?
       GROUP BY f.id, f.name, f.color, f.created_at, f.updated_at
       ORDER BY f.name ASC`,
      [userId]
    );

    return res.json({ folders });
  } catch (error: any) {
    console.error('[Folders] List error:', error);
    return res.status(500).json({ error: 'Failed to fetch folders.' });
  }
}

export async function createFolder(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { name, color } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required.' });
    }

    const folderId = `fld_${crypto.randomUUID()}`;
    await execute(
      `INSERT INTO folders (id, user_id, name, color) VALUES (?, ?, ?, ?)`,
      [folderId, userId, name.trim(), color || '#6366f1']
    );

    const folder = await queryOne<any>('SELECT * FROM folders WHERE id = ?', [folderId]);

    return res.status(201).json({
      message: 'Folder created successfully.',
      folder: { ...folder, simulation_count: 0 },
    });
  } catch (error: any) {
    console.error('[Folders] Create error:', error);
    return res.status(500).json({ error: 'Failed to create folder.' });
  }
}

export async function renameFolder(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { name, color } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required.' });
    }

    const result = await execute(
      `UPDATE folders SET name = ?, color = COALESCE(?, color), updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [name.trim(), color || null, id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Folder not found or access denied.' });
    }

    return res.json({ message: 'Folder updated successfully.' });
  } catch (error: any) {
    console.error('[Folders] Rename error:', error);
    return res.status(500).json({ error: 'Failed to update folder.' });
  }
}

export async function deleteFolder(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const result = await execute('DELETE FROM folders WHERE id = ? AND user_id = ?', [id, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Folder not found or access denied.' });
    }

    return res.json({ message: 'Folder deleted. Its simulations moved to Uncategorized.' });
  } catch (error: any) {
    console.error('[Folders] Delete error:', error);
    return res.status(500).json({ error: 'Failed to delete folder.' });
  }
}
