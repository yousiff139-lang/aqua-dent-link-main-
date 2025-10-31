import { Router } from 'express';
import { PatientController, registerValidation, loginValidation } from '../controllers/patientController';

const router = Router();

/**
 * Patient Routes
 */
router.post('/register', registerValidation, PatientController.register);
router.post('/login', loginValidation, PatientController.login);
router.get('/:id', PatientController.getById);

export default router;
