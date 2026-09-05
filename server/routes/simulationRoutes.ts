import { Router } from 'express';
import {
  listSimulations,
  createSimulation,
  getSimulation,
  updateSimulation,
  deleteSimulation,
  duplicateSimulation,
  exportSimulation,
  importSimulation,
  getTemplatesList,
} from '../controllers/simulationController';
import { requireAuth } from '../auth/authMiddleware';

const router = Router();

// Public / shared endpoints
router.get('/templates', getTemplatesList);

// Protected endpoints
router.use(requireAuth);
router.get('/', listSimulations);
router.post('/', createSimulation);
router.post('/import', importSimulation);
router.get('/:id', getSimulation);
router.put('/:id', updateSimulation);
router.delete('/:id', deleteSimulation);
router.post('/:id/duplicate', duplicateSimulation);
router.get('/:id/export', exportSimulation);

export default router;
