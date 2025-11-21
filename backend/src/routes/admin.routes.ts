import { Router } from 'express';
import { ensureAdminAccess } from '../middleware/admin-access.js';
import { adminController } from '../controllers/admin.controller.js';

const router = Router();

router.use(ensureAdminAccess);

router.get('/appointments', adminController.getAppointments);
router.get('/patients', adminController.getPatients);
router.get('/dentists', adminController.getDentists);
router.post('/dentists', adminController.createDentist);
router.delete('/dentists/:id', adminController.deleteDentist);
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/analytics', adminController.getAnalytics);
router.get('/analytics/export', adminController.exportAnalytics);

export { router as adminRouter };

