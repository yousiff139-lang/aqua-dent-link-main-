import { Request, Response } from 'express';
import { xrayAnalysisService } from '../services/xray-analysis.service.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/errors.js';

/**
 * Controller for X-Ray analysis endpoints
 */
export class XRayAnalysisController {
    /**
     * Analyze an X-ray document
     * POST /api/xray/analyze/:documentId
     * Body: { fileUrl?: string } - Required for temp document IDs
     */
    async analyzeXray(req: Request, res: Response): Promise<void> {
        try {
            const { documentId } = req.params;
            const { fileUrl } = req.body || {};

            if (!documentId) {
                throw AppError.validation('Document ID is required');
            }

            logger.info(`Starting X-ray analysis for document: ${documentId}`);

            // Start analysis - pass fileUrl for temp IDs
            const result = await xrayAnalysisService.analyzeDocumentXray(documentId, fileUrl);

            res.status(200).json({
                success: true,
                message: 'X-ray analysis completed successfully',
                documentId,
                data: result
            });

        } catch (error: any) {
            logger.error('Error in analyzeXray controller:', error);

            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: error.message || 'Failed to analyze X-ray'
                });
            }
        }
    }

    /**
     * Get analysis results for an X-ray
     * GET /api/xray/results/:documentId
     */
    async getAnalysisResults(req: Request, res: Response): Promise<void> {
        try {
            const { documentId } = req.params;

            if (!documentId) {
                throw AppError.validation('Document ID is required');
            }

            const results = await xrayAnalysisService.getAnalysisResults(documentId);

            if (!results) {
                res.status(404).json({
                    success: false,
                    error: 'Analysis not completed or not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: results
            });

        } catch (error: any) {
            logger.error('Error in getAnalysisResults controller:', error);

            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get analysis results'
            });
        }
    }

    /**
     * Get all X-rays for an appointment
     * GET /api/xray/appointment/:appointmentId
     */
    async getAppointmentXrays(req: Request, res: Response): Promise<void> {
        try {
            const { appointmentId } = req.params;

            if (!appointmentId) {
                throw AppError.validation('Appointment ID is required');
            }

            const xrays = await xrayAnalysisService.getAppointmentXrays(appointmentId);

            res.status(200).json({
                success: true,
                data: xrays,
                count: xrays.length
            });

        } catch (error: any) {
            logger.error('Error in getAppointmentXrays controller:', error);

            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get appointment X-rays'
            });
        }
    }

    /**
     * Check if dental AI service is available
     * GET /api/xray/health
     */
    async checkHealth(req: Request, res: Response): Promise<void> {
        try {
            const isHealthy = await xrayAnalysisService.checkAIServiceHealth();

            res.status(200).json({
                success: true,
                aiServiceAvailable: isHealthy,
                message: isHealthy
                    ? 'Dental AI service is available'
                    : 'Dental AI service is not available'
            });

        } catch (error: any) {
            logger.error('Error in checkHealth controller:', error);

            res.status(200).json({
                success: true,
                aiServiceAvailable: false,
                message: 'Failed to check AI service health'
            });
        }
    }

    /**
     * Validate if an upload is an X-ray
     * POST /api/xray/validate
     */
    async validateImage(req: Request, res: Response): Promise<void> {
        try {
            // This endpoint would receive a file upload
            // For now, return a placeholder
            res.status(501).json({
                success: false,
                error: 'Image validation endpoint not yet implemented'
            });

        } catch (error: any) {
            logger.error('Error in validateImage controller:', error);

            res.status(500).json({
                success: false,
                error: error.message || 'Failed to validate image'
            });
        }
    }
}

// Export singleton instance
export const xrayAnalysisController = new XRayAnalysisController();
