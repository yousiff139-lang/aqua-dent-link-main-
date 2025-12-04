import { Router } from 'express';
import { xrayAnalysisController } from '../controllers/xray-analysis.controller.js';

const router = Router();

/**
 * X-Ray Analysis Routes
 * Base path: /api/xray
 */

// Analyze an X-ray document
router.post(
    '/analyze/:documentId',
    xrayAnalysisController.analyzeXray.bind(xrayAnalysisController)
);

// Get analysis results for a document
router.get(
    '/results/:documentId',
    xrayAnalysisController.getAnalysisResults.bind(xrayAnalysisController)
);

// Get all X-rays for an appointment
router.get(
    '/appointment/:appointmentId',
    xrayAnalysisController.getAppointmentXrays.bind(xrayAnalysisController)
);

// Check dental AI service health
router.get(
    '/health',
    xrayAnalysisController.checkHealth.bind(xrayAnalysisController)
);

// Validate if uploaded image is an X-ray
router.post(
    '/validate',
    xrayAnalysisController.validateImage.bind(xrayAnalysisController)
);

export default router;
