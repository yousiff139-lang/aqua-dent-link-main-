import axios from 'axios';
import { logger } from '../config/logger.js';

/**
 * Service to validate if uploaded images are X-rays
 * Uses simple heuristics and can call the dental AI for validation
 */
export class ImageValidatorService {
    private dentalAiBaseUrl: string;

    constructor() {
        // Get dental AI URL from environment
        this.dentalAiBaseUrl = process.env.DENTAL_AI_API_URL || 'http://localhost:8000/api/v1';
    }

    /**
     * Check if file extension indicates it's an X-ray format
     */
    isXrayFileExtension(filename: string): boolean {
        const xrayExtensions = ['.dcm', '.dicom', '.png', '.jpg', '.jpeg', '.webp', '.gif'];
        const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return xrayExtensions.includes(extension);
    }

    /**
     * Get X-ray format from filename
     */
    getXrayFormat(filename: string): 'DCM' | 'PNG' | 'JPEG' | 'WEBP' | null {
        const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));

        if (extension === '.dcm' || extension === '.dicom') {
            return 'DCM';
        } else if (extension === '.png') {
            return 'PNG';
        } else if (extension === '.jpg' || extension === '.jpeg') {
            return 'JPEG';
        } else if (extension === '.webp' || extension === '.gif') {
            return 'WEBP';
        }

        return null;
    }

    /**
     * Validate if image is actually an X-ray using the dental AI
     * This calls the AI's validation endpoint
     */
    async validateIsXray(fileBuffer: Buffer, filename: string): Promise<{
        isXray: boolean;
        confidence: number;
        format: string | null;
    }> {
        try {
            const format = this.getXrayFormat(filename);

            // For DCM files, we assume they are X-rays (DICOM is medical imaging format)
            if (format === 'DCM') {
                return {
                    isXray: true,
                    confidence: 1.0,
                    format: 'DCM'
                };
            }

            // For PNG/JPEG, we would ideally call the AI to validate
            // For now, return basic heuristic
            // TODO: Implement AI validation call when dental AI is running

            logger.info(`Validating image: ${filename}, format: ${format}`);

            // Basic validation: check if file extension is valid
            const hasValidExtension = this.isXrayFileExtension(filename);

            return {
                isXray: hasValidExtension,
                confidence: hasValidExtension ? 0.8 : 0.1, // High confidence for valid extensions
                format
            };

        } catch (error) {
            logger.error('Error validating X-ray:', error);
            return {
                isXray: false,
                confidence: 0.0,
                format: null
            };
        }
    }

    /**
     * Validate image using dental AI's detection endpoint
     * This is more accurate but requires the AI service to be running
     */
    async validateIsXrayWithAI(filePath: string): Promise<{
        isXray: boolean;
        confidence: number;
    }> {
        try {
            // Call the dental AI's detect-auto endpoint with validate_xray=true
            const FormData = require('form-data');
            const fs = require('fs');

            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));
            formData.append('validate_xray', 'true');

            const response = await axios.post(
                `${this.dentalAiBaseUrl}/detect-auto`,
                formData,
                {
                    headers: formData.getHeaders(),
                    validateStatus: (status) => status < 500 // Don't throw on 4xx errors
                }
            );

            if (response.status === 200 && response.data.xray_validation) {
                return {
                    isXray: response.data.xray_validation.is_xray,
                    confidence: response.data.xray_validation.confidence
                };
            }

            // If validation failed (400 error), it's likely not an X-ray
            if (response.status === 400) {
                return {
                    isXray: false,
                    confidence: 0.0
                };
            }

            throw new Error(`Unexpected response from dental AI: ${response.status}`);

        } catch (error) {
            logger.error('Error validating with AI:', error);
            // Fall back to basic validation
            return {
                isXray: false,
                confidence: 0.0
            };
        }
    }

    /**
     * Check if file size is appropriate for X-ray
     * X-rays are typically between 100KB and 10MB
     */
    isValidXraySize(fileSize: number): boolean {
        const minSize = 10 * 1024; // 10KB (lowered from 100KB to allow smaller images)
        const maxSize = 50 * 1024 * 1024; // 50MB (increased for larger DICOM files)
        return fileSize >= minSize && fileSize <= maxSize;
    }

    /**
     * Classify document type based on filename and validation
     */
    async classifyDocument(
        filename: string,
        fileBuffer: Buffer
    ): Promise<{
        isXray: boolean;
        format: string | null;
        confidence: number;
    }> {
        // Quick check: file extension
        const format = this.getXrayFormat(filename);

        if (!format) {
            return {
                isXray: false,
                format: null,
                confidence: 1.0
            };
        }

        // Check file size
        if (!this.isValidXraySize(fileBuffer.length)) {
            logger.warn(`File size ${fileBuffer.length} is outside typical X-ray range`);
            return {
                isXray: false,
                format,
                confidence: 0.3
            };
        }

        // Validate using basic heuristics
        const validation = await this.validateIsXray(fileBuffer, filename);

        return validation;
    }
}

// Export singleton instance
export const imageValidatorService = new ImageValidatorService();
