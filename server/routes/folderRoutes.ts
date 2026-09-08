import { Router } from 'express';
import { listFolders, createFolder, renameFolder, deleteFolder } from '../controllers/folderController';
import { requireAuth } from '../auth/authMiddleware';

const router = Router();

router.use(requireAuth);
router.get('/', listFolders);
router.post('/', createFolder);
router.put('/:id', renameFolder);
router.delete('/:id', deleteFolder);

export default router;
