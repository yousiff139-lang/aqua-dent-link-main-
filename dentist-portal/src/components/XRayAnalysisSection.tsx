import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle2, FileImage, RefreshCw } from 'lucide-react';
import XRayViewer from './XRayViewer';
import AnalysisResults from './AnalysisResults';
import { useXRayAnalysis } from '../hooks/useXRayAnalysis';
import { generateXRayReport } from '@/utils/pdf';
import axios from 'axios';

// Python AI Backend URL (same as X-Ray Lab uses)
const AI_API_URL = 'http://localhost:8000/api/v1';

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

interface MedicalDocument {
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    is_xray: boolean;
    xray_format?: string;
    xray_analysis_result?: any;
    analysis_status?: string;
    analyzed_at?: string;
}

interface XRayAnalysisSectionProps {
    appointmentId: string;
    patientName?: string;
}

export default function XRayAnalysisSection({
    appointmentId,
    patientName
}: XRayAnalysisSectionProps) {
    const [xrays, setXrays] = useState<MedicalDocument[]>([]);
    const [selectedXray, setSelectedXray] = useState<MedicalDocument | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [aiServiceAvailable, setAiServiceAvailable] = useState(true);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const {
        getAppointmentXrays,
        checkAIServiceHealth,
        isLoading,
        error,
    } = useXRayAnalysis();

    // Fetch X-rays on mount
    useEffect(() => {
        loadXrays();
        checkServiceHealth();
    }, [appointmentId]);

    const loadXrays = async () => {
        try {
            const fetchedXrays = await getAppointmentXrays(appointmentId);
            setXrays(fetchedXrays);

            // Auto-select first X-ray
            if (fetchedXrays.length > 0) {
                setSelectedXray(fetchedXrays[0]);
            }
        } catch (err) {
            console.error('Failed to load X-rays:', err);
        }
    };

    const checkServiceHealth = async () => {
        try {
            const response = await axios.get(`${AI_API_URL}/health`);
            setAiServiceAvailable(response.status === 200);
        } catch {
            setAiServiceAvailable(false);
        }
    };

    // Direct analysis using Python AI backend (same approach as X-Ray Lab)
    const handleAnalyze = async () => {
        if (!selectedXray) return;

        setIsAnalyzing(true);
        setAnalysisError(null);

        try {
            // Get the proper image URL
            let imageUrl = selectedXray.file_url;

            // If it's a relative path (Supabase storage path), convert to public URL
            if (!imageUrl.startsWith('http')) {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                if (supabaseUrl) {
                    // Try medical-documents bucket first, then xray-uploads
                    imageUrl = `${supabaseUrl}/storage/v1/object/public/medical-documents/${imageUrl}`;
                }
            }

            console.log('Fetching image from URL:', imageUrl);

            // Fetch the image from the URL
            const imageResponse = await fetch(imageUrl);

            if (!imageResponse.ok) {
                // Try xray-uploads bucket as fallback
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                if (supabaseUrl && !selectedXray.file_url.startsWith('http')) {
                    imageUrl = `${supabaseUrl}/storage/v1/object/public/xray-uploads/${selectedXray.file_url}`;
                    console.log('Retrying with xray-uploads bucket:', imageUrl);
                    const retryResponse = await fetch(imageUrl);
                    if (!retryResponse.ok) {
                        throw new Error(`Failed to fetch image: ${retryResponse.status}`);
                    }
                    const blob = await retryResponse.blob();
                    await processAndAnalyze(blob, selectedXray.file_name || 'xray.png');
                    return;
                }
                throw new Error(`Failed to fetch image: ${imageResponse.status}`);
            }

            const blob = await imageResponse.blob();
            await processAndAnalyze(blob, selectedXray.file_name || 'xray.png');

        } catch (err: any) {
            console.error('Analysis failed:', err);
            setAnalysisError(err.response?.data?.detail || err.message || 'Analysis failed');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Helper function to process and analyze the image blob
    const processAndAnalyze = async (blob: Blob, fileName: string) => {
        // Create a File from the blob
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

        // Create FormData (same as X-Ray Lab)
        const formData = new FormData();
        formData.append('file', file);

        // Determine endpoint based on file type
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const isDicom = ['dcm', 'dicom', 'rvg'].includes(ext);
        const endpoint = isDicom ? '/detect-dicom' : '/detect';

        console.log(`Sending X-ray to Python AI backend: ${AI_API_URL}${endpoint}`);

        // Call Python AI backend directly (same as X-Ray Lab)
        const response = await axios.post(`${AI_API_URL}${endpoint}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        console.log('Analysis response:', response.data);

        // Update selected X-ray with results
        const predictions = response.data.predictions || [];
        setSelectedXray(prev => prev ? {
            ...prev,
            xray_analysis_result: {
                predictions,
                image_info: response.data.image_info,
                metadata: response.data.metadata || response.data.dicom_metadata,
            },
            analysis_status: 'completed'
        } : null);
    };

    const handleGenerateReport = async () => {
        if (!selectedXray?.xray_analysis_result?.predictions) {
            setAnalysisError('No detections to generate report from. Please analyze the X-ray first.');
            return;
        }

        setIsGeneratingReport(true);
        setAnalysisError(null);

        try {
            const predictions = selectedXray.xray_analysis_result.predictions;

            // Format request body exactly like X-Ray Lab does
            const requestBody = {
                predictions: predictions,
                metadata: selectedXray.xray_analysis_result.metadata || null,
                image_info: selectedXray.xray_analysis_result.image_info || null,
            };

            console.log('Sending diagnostic report request:', requestBody);

            // Use correct endpoint: /generate-diagnostic-report (same as X-Ray Lab)
            const response = await axios.post(`${AI_API_URL}/generate-diagnostic-report`, requestBody);

            console.log('Diagnostic report response:', response.data);

            const report = response.data?.diagnostic_report;

            if (!report) {
                throw new Error('No diagnostic report in response');
            }

            // Update selected X-ray with diagnostic report
            setSelectedXray(prev => prev ? {
                ...prev,
                xray_analysis_result: {
                    ...prev.xray_analysis_result,
                    diagnostic_report: report
                }
            } : null);
        } catch (err: any) {
            console.error('Report generation failed:', err);
            console.error('Error response:', err.response?.data);
            setAnalysisError(err.response?.data?.detail || err.message || 'Report generation failed');
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const handleExportReport = () => {
        if (!selectedXray?.xray_analysis_result) {
            console.error('No analysis results to export');
            return;
        }

        try {
            generateXRayReport({
                patientName: patientName,
                fileName: selectedXray.file_name,
                analysisDate: selectedXray.analyzed_at ? new Date(selectedXray.analyzed_at) : new Date(),
                detections: selectedXray.xray_analysis_result.predictions || [],
                diagnosticReport: selectedXray.xray_analysis_result.diagnostic_report,
                imageInfo: selectedXray.xray_analysis_result.image_info,
                metadata: selectedXray.xray_analysis_result.metadata,
            });
            console.log('PDF exported successfully');
        } catch (error) {
            console.error('Failed to export PDF:', error);
        }
    };

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="default" className="bg-green-600">Analyzed</Badge>;
            case 'analyzing':
                return <Badge variant="secondary">Analyzing...</Badge>;
            case 'failed':
                return <Badge variant="destructive">Failed</Badge>;
            case 'pending':
            default:
                return <Badge variant="outline">Not Analyzed</Badge>;
        }
    };

    if (isLoading && xrays.length === 0) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-[500px]" />
                    <Skeleton className="h-[500px]" />
                </div>
            </div>
        );
    }

    if (xrays.length === 0) {
        return (
            <Card className="p-8 text-center">
                <FileImage className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No X-Rays Found</h3>
                <p className="text-gray-600">
                    This appointment does not have any X-ray images uploaded yet.
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">X-Ray Analysis</h2>
                    {patientName && (
                        <p className="text-gray-600">Patient: {patientName}</p>
                    )}
                </div>

                <Button
                    onClick={loadXrays}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* AI Service Status */}
            {!aiServiceAvailable && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>AI Service Unavailable</AlertTitle>
                    <AlertDescription>
                        The dental AI analysis service is currently unavailable. Please try again later.
                    </AlertDescription>
                </Alert>
            )}

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Analysis Error Alert */}
            {analysisError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Analysis Error</AlertTitle>
                    <AlertDescription>{analysisError}</AlertDescription>
                </Alert>
            )}

            {/* X-Ray Selector */}
            {xrays.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {xrays.map((xray) => (
                        <Button
                            key={xray.id}
                            onClick={() => setSelectedXray(xray)}
                            variant={selectedXray?.id === xray.id ? 'default' : 'outline'}
                            className="gap-2"
                        >
                            {xray.file_name}
                            {getStatusBadge(xray.analysis_status)}
                        </Button>
                    ))}
                </div>
            )}

            {/* Main Content */}
            {selectedXray && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* X-Ray Viewer */}
                    <XRayViewer
                        imageUrl={selectedXray.file_url}
                        detections={selectedXray.xray_analysis_result?.predictions || []}
                        onAnalyze={selectedXray.analysis_status !== 'completed' && !isAnalyzing ? handleAnalyze : undefined}
                        isAnalyzing={isAnalyzing}
                    />

                    {/* Analysis Results */}
                    <AnalysisResults
                        detections={selectedXray.xray_analysis_result?.predictions || []}
                        diagnosticReport={selectedXray.xray_analysis_result?.diagnostic_report}
                        onGenerateReport={
                            selectedXray.analysis_status === 'completed' && !selectedXray.xray_analysis_result?.diagnostic_report
                                ? handleGenerateReport
                                : undefined
                        }
                        onExportReport={
                            selectedXray.xray_analysis_result?.diagnostic_report
                                ? handleExportReport
                                : undefined
                        }
                        isGeneratingReport={isGeneratingReport}
                    />
                </div>
            )}
        </div>
    );
}
