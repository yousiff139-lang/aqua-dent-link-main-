import { Router } from 'express';
import { dentistController } from '../controllers/dentist.controller.js';

const router = Router();

// POST /api/auth/dentist/login - Dentist login
router.post('/auth/dentist/login', dentistController.login);

// GET /api/dentists/:email - Get dentist profile by email
router.get('/dentists/:email', dentistController.getByEmail);

// GET /api/dentists/:email/patients - Get dentist's patients/appointments
router.get('/dentists/:email/patients', dentistController.getPatients);

export { router as dentistRouter };
