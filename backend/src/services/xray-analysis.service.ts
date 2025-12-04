import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { logger } from '../config/logger.js';
import { supabase } from '../config/supabase.js';
import { imageValidatorService } from './image-validator.service.js';

/**
 * X-Ray Analysis Result Interface
 */
export interface XRayDetection {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    class: string;
    class_id: number;
    detection_id: string;
}

export interface XRayAnalysisResult {
    predictions: XRayDetection[];
    file_type: 'DCM' | 'PNG/JPEG';
    xray_validation?: {
        is_xray: boolean;
        confidence: number;
    };
    image_info?: any;
    dicom_metadata?: any;
}

/**
 * Service for analyzing X-rays using the dental AI
 */
export class XRayAnalysisService {
    private dentalAiBaseUrl: string;

    constructor() {
        this.dentalAiBaseUrl = process.env.DENTAL_AI_API_URL || 'http://localhost:8000/api/v1';
    }

    /**
     * Analyze an X-ray file for dental conditions
     */
    async analyzeXray(filePath: string): Promise<XRayAnalysisResult> {
        try {
            logger.info(`Analyzing X-ray at path: ${filePath}`);

            // Create form data
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));
            formData.append('validate_xray', 'true');

            // Call dental AI's detect-auto endpoint
            const response = await axios.post(
                `${this.dentalAiBaseUrl}/detect-auto`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                    },
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity,
                }
            );

            logger.info('X-ray analysis completed successfully');

            return response.data;

        } catch (error: any) {
            logger.error('Error analyzing X-ray:', error.response?.data || error.message);

            if (error.response?.status === 400) {
                throw new Error(error.response.data.detail || 'Invalid X-ray image');
            }

            throw new Error('Failed to analyze X-ray. Please ensure the dental AI service is running.');
        }
    }

    /**
     * Analyze X-ray for a specific medical document
     * Handles both database document IDs and temporary IDs with URLs
     */
    async analyzeDocumentXray(documentId: string, fileUrl?: string): Promise<any> {
        try {
            let document: any = null;
            let downloadUrl: string | null = null;

            // Check if this is a temporary ID (from JSONB documents)
            if (documentId.startsWith('temp-')) {
                // For temp IDs, we need the fileUrl to be passed
                if (!fileUrl) {
                    throw new Error('File URL is required for temporary document IDs');
                }

                document = {
                    id: documentId,
                    file_url: fileUrl,
                    file_name: fileUrl.split('/').pop() || 'xray.png',
                    is_xray: true
                };
                downloadUrl = fileUrl;
            } else {
                // Get document from database
                const { data, error } = await supabase
                    .from('medical_documents')
                    .select('*')
                    .eq('id', documentId)
                    .single();

                if (error || !data) {
                    throw new Error('Medical document not found');
                }

                document = data;

                // Update status to analyzing
                await supabase
                    .from('medical_documents')
                    .update({ analysis_status: 'analyzing' })
                    .eq('id', documentId);
            }

            // Download the file
            let fileBuffer: Buffer;

            if (document.file_url.startsWith('http')) {
                // Direct URL - fetch from internet
                const response = await axios.get(document.file_url, { responseType: 'arraybuffer' });
                fileBuffer = Buffer.from(response.data);
            } else {
                // Supabase storage path - download from storage
                const { data: fileData, error: downloadError } = await supabase.storage
                    .from('medical-documents')
                    .download(document.file_url);

                if (downloadError || !fileData) {
                    throw new Error('Failed to download X-ray file');
                }
                fileBuffer = Buffer.from(await fileData.arrayBuffer());
            }

            // Save to temporary file
            const tempFilePath = `/tmp/${documentId}_${document.file_name}`;
            fs.writeFileSync(tempFilePath, fileBuffer);

            try {
                // Analyze the X-ray
                const analysisResult = await this.analyzeXray(tempFilePath);

                // Save analysis results to database if it's a real document
                if (!documentId.startsWith('temp-')) {
                    await supabase
                        .from('medical_documents')
                        .update({
                            xray_analysis_result: analysisResult,
                            analysis_status: 'completed',
                            analyzed_at: new Date().toISOString()
                        })
                        .eq('id', documentId);
                }

                logger.info(`Analysis complete for document ${documentId}: ${analysisResult.predictions.length} detections found`);

                return analysisResult;

            } finally {
                // Clean up temp file
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
            }

        } catch (error: any) {
            logger.error(`Error analyzing document ${documentId}:`, error);

            // Update status to failed if it's a real document
            if (!documentId.startsWith('temp-')) {
                await supabase
                    .from('medical_documents')
                    .update({
                        analysis_status: 'failed',
                        xray_analysis_result: { error: error.message }
                    })
                    .eq('id', documentId);
            }

            throw error;
        }
    }

    /**
     * Get analysis results for a document
     */
    async getAnalysisResults(documentId: string): Promise<XRayAnalysisResult | null> {
        try {
            const { data: document, error } = await supabase
                .from('medical_documents')
                .select('xray_analysis_result, analysis_status')
                .eq('id', documentId)
                .single();

            if (error || !document) {
                throw new Error('Medical document not found');
            }

            if (document.analysis_status !== 'completed') {
                return null;
            }

            return document.xray_analysis_result;

        } catch (error) {
            logger.error(`Error getting analysis results for ${documentId}:`, error);
            throw error;
        }
    }

    /**
     * Classify and mark document as X-ray during upload
     */
    async classifyAndMarkXray(
        documentId: string,
        filename: string,
        fileBuffer: Buffer
    ): Promise<void> {
        try {
            // Classify the document
            const classification = await imageValidatorService.classifyDocument(
                filename,
                fileBuffer
            );

            logger.info(`Document ${documentId} classified:`, classification);

            // Update database with classification
            await supabase
                .from('medical_documents')
                .update({
                    is_xray: classification.isXray,
                    xray_format: classification.format,
                    analysis_status: classification.isXray ? 'pending' : 'not_xray'
                })
                .eq('id', documentId);

        } catch (error) {
            logger.error(`Error classifying document ${documentId}:`, error);
            throw error;
        }
    }

    /**
     * Get all X-rays for an appointment
     * Queries by appointment_id directly, with fallback to health_info linkage
     */
    async getAppointmentXrays(appointmentId: string): Promise<any[]> {
        try {
            // First, try direct appointment_id lookup - get ALL documents (not just is_xray=true)
            // because newly uploaded images might not be marked as X-rays yet
            const { data: directDocs, error: directError } = await supabase
                .from('medical_documents')
                .select('*')
                .eq('appointment_id', appointmentId);

            if (!directError && directDocs && directDocs.length > 0) {
                // Mark all images as potential X-rays for analysis
                return directDocs.map(doc => ({
                    ...doc,
                    is_xray: doc.is_xray || doc.file_type?.startsWith('image/') || true
                }));
            }

            // Fallback: Query via health_info_id linkage (for older data)
            const { data: healthInfo, error: healthError } = await supabase
                .from('appointment_health_info')
                .select('id')
                .eq('appointment_id', appointmentId)
                .single();

            if (healthError || !healthInfo) {
                // Check appointment_medical_info.documents JSONB field (where booking form uploads go)
                const { data: medicalInfo, error: medicalInfoError } = await supabase
                    .from('appointment_medical_info')
                    .select('documents, patient_id')
                    .eq('appointment_id', appointmentId)
                    .single();

                if (!medicalInfoError && medicalInfo?.documents && Array.isArray(medicalInfo.documents) && medicalInfo.documents.length > 0) {
                    // Convert JSONB documents to expected format - treat all uploaded images as potential X-rays
                    return medicalInfo.documents.map((doc: any) => ({
                        id: doc.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        file_name: doc.name || doc.file_name,
                        file_url: doc.url || doc.file_url,
                        file_type: doc.type || doc.file_type || 'image',
                        is_xray: true, // Treat all uploaded images as X-rays for analysis
                        analysis_status: doc.analysis_status || 'pending'
                    }));
                }

                // Also check appointments.documents JSONB field
                const { data: appointment, error: aptError } = await supabase
                    .from('appointments')
                    .select('documents, patient_id')
                    .eq('id', appointmentId)
                    .single();

                if (!aptError && appointment?.documents && Array.isArray(appointment.documents)) {
                    // Convert JSONB documents to expected format
                    return appointment.documents
                        .filter((doc: any) => doc.is_xray || doc.file_name?.toLowerCase().includes('xray') || doc.file_name?.toLowerCase().includes('x-ray') || doc.type?.startsWith('image/'))
                        .map((doc: any) => ({
                            id: doc.id || `temp-${Date.now()}`,
                            file_name: doc.file_name || doc.name,
                            file_url: doc.file_url || doc.url,
                            file_type: doc.file_type || 'image',
                            is_xray: true,
                            analysis_status: doc.analysis_status || 'pending'
                        }));
                }

                return [];
            }

            // Query by health_info_id
            const { data: xrays, error } = await supabase
                .from('medical_documents')
                .select('*')
                .eq('health_info_id', healthInfo.id)
                .eq('is_xray', true);

            if (error) {
                throw error;
            }

            return xrays || [];

        } catch (error) {
            logger.error(`Error getting X-rays for appointment ${appointmentId}:`, error);
            throw error;
        }
    }

    /**
     * Check if dental AI service is available
     */
    async checkAIServiceHealth(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.dentalAiBaseUrl}/health`, {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            logger.warn('Dental AI service is not available');
            return false;
        }
    }

    /**
     * Generate diagnostic report using Gemini AI
     */
    async generateDiagnosticReport(
        detections: XRayDetection[],
        metadata?: any,
        imageInfo?: any
    ): Promise<{
        report: string;
        summary: string;
        recommendations: string[];
        severity_level: 'low' | 'moderate' | 'high';
    }> {
        try {
            logger.info('Generating diagnostic report with Gemini');

            // Call dental AI's diagnostic report endpoint
            const response = await axios.post(
                `${this.dentalAiBaseUrl}/generate-diagnostic-report`,
                {
                    predictions: detections,
                    metadata: metadata || {},
                    image_info: imageInfo || {}
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info('Diagnostic report generated successfully');

            return response.data.diagnostic_report;

        } catch (error: any) {
            logger.error('Error generating diagnostic report:', error.response?.data || error.message);

            // Return fallback report
            return {
                report: `Automated dental analysis detected ${detections.length} findings. Professional evaluation recommended.`,
                summary: `Analysis completed with ${detections.length} detections`,
                recommendations: [
                    'Schedule dental consultation',
                    'Professional radiographic interpretation needed',
                ],
                severity_level: 'moderate',
            };
        }
    }

    /**
     * Analyze X-ray and generate diagnostic report
     */
    async analyzeWithDiagnosticReport(documentId: string): Promise<void> {
        try {
            // First, analyze the X-ray
            await this.analyzeDocumentXray(documentId);

            // Get the analysis results
            const analysisResult = await this.getAnalysisResults(documentId);

            if (!analysisResult) {
                throw new Error('Analysis results not found');
            }

            // Generate diagnostic report
            const diagnosticReport = await this.generateDiagnosticReport(
                analysisResult.predictions,
                analysisResult.dicom_metadata,
                analysisResult.image_info
            );

            // Update document with diagnostic report
            await supabase
                .from('medical_documents')
                .update({
                    xray_analysis_result: {
                        ...analysisResult,
                        diagnostic_report: diagnosticReport
                    }
                })
                .eq('id', documentId);

            logger.info(`Diagnostic report added to document ${documentId}`);

        } catch (error) {
            logger.error(`Error analyzing with diagnostic report ${documentId}:`, error);
            throw error;
        }
    }
}

// Export singleton instance
export const xrayAnalysisService = new XRayAnalysisService();
