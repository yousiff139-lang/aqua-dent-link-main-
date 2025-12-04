import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Detection {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    class: string;
    class_id: number;
    detection_id: string;
}

interface DiagnosticReport {
    report: string;
    summary: string;
    recommendations: string[];
    severity_level: 'low' | 'moderate' | 'high';
}

interface XRayAnalysisResult {
    predictions: Detection[];
    file_type: 'DCM' | 'PNG/JPEG';
    xray_validation?: {
        is_xray: boolean;
        confidence: number;
    };
    image_info?: any;
    dicom_metadata?: any;
    diagnostic_report?: DiagnosticReport;
}

interface MedicalDocument {
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    is_xray: boolean;
    xray_format?: string;
    xray_analysis_result?: XRayAnalysisResult;
    analysis_status?: string;
    analyzed_at?: string;
}

export function useXRayAnalysis() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyzeXray = async (documentId: string, fileUrl?: string): Promise<any> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/xray/analyze/${documentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fileUrl }),
            });

            if (!response.ok) {
                throw new Error(`Analysis failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const getAnalysisResults = async (documentId: string): Promise<XRayAnalysisResult | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/xray/results/${documentId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`Failed to fetch results: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const getAppointmentXrays = async (appointmentId: string): Promise<MedicalDocument[]> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/xray/appointment/${appointmentId}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch X-rays: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data || [];
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const generateDiagnosticReport = async (documentId: string): Promise<any> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/xray/diagnostic/${documentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to generate report: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const checkAIServiceHealth = async (): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE_URL}/xray/health`);
            const data = await response.json();
            return data.aiServiceAvailable || false;
        } catch {
            return false;
        }
    };

    return {
        analyzeXray,
        getAnalysisResults,
        getAppointmentXrays,
        generateDiagnosticReport,
        checkAIServiceHealth,
        isLoading,
        error,
    };
}
