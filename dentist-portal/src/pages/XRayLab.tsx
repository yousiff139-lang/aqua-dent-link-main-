import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import {
    FileImage, Upload, AlertCircle, Loader2,
    Stethoscope, ZoomIn, ZoomOut, RotateCw, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

// Dental AI Backend URL - same as original
const API_URL = 'http://localhost:8000/api/v1';

// Create axios instance like original
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

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

interface DicomMetadata {
    patient_name?: string;
    patient_id?: string;
    study_date?: string;
    modality?: string;
}

interface ImageInfo {
    width: number;
    height: number;
    format: string;
}

interface DiagnosticReport {
    report: string;
    summary: string;
    recommendations: string[];
    severity_level: string;
}

interface UploadedXray {
    id: string;
    file: File;
    previewUrl: string;
    status: 'pending' | 'loading' | 'success' | 'error';
    error?: string;
    predictions?: Detection[];
    metadata?: DicomMetadata;
    imageInfo?: ImageInfo;
    diagnosticReport?: DiagnosticReport;
}

// Detection color mapping (same as original)
const getDetectionColor = (classId: number): string => {
    const colors: { [key: number]: string } = {
        0: '#ef4444', // red - cavity
        1: '#f97316', // orange - periapical lesion
        2: '#eab308', // yellow
        3: '#22c55e', // green
    };
    return colors[classId] || '#ef4444';
};

export default function XRayLab() {
    const [xrays, setXrays] = useState<UploadedXray[]>([]);
    const [selectedXray, setSelectedXray] = useState<UploadedXray | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [imageDisplaySize, setImageDisplaySize] = useState({ width: 0, height: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Update image display size when image loads
    const handleImageLoad = useCallback(() => {
        if (imageRef.current) {
            setImageDisplaySize({
                width: imageRef.current.clientWidth,
                height: imageRef.current.clientHeight,
            });
        }
    }, []);

    // Detect dental conditions - use correct endpoint based on file type
    const detectDentalConditions = async (file: File): Promise<{
        predictions: Detection[];
        metadata?: DicomMetadata;
        image_info?: ImageInfo;
    }> => {
        const formData = new FormData();
        formData.append('file', file);

        // Check file extension to determine which endpoint to use
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const isDicom = ['dcm', 'dicom', 'rvg'].includes(ext);

        // Use /detect-dicom for DICOM files, /detect for regular images
        const endpoint = isDicom ? '/detect-dicom' : '/detect';

        const response = await apiClient.post(endpoint, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    };

    // Generate diagnostic report
    const generateDiagnosticReport = async (xray: UploadedXray) => {
        if (!xray.predictions || xray.predictions.length === 0) {
            toast.error('No detections to generate report from');
            return;
        }

        setIsGeneratingReport(true);
        try {
            // Format request properly - send null for optional fields if not available
            const requestBody = {
                predictions: xray.predictions,
                metadata: xray.metadata || null,
                image_info: xray.imageInfo || null,
            };

            console.log('Sending diagnostic report request:', requestBody);

            const response = await apiClient.post('/generate-diagnostic-report', requestBody);

            console.log('Diagnostic report response:', response.data);

            const report = response.data?.diagnostic_report;

            if (!report) {
                throw new Error('No diagnostic report in response');
            }

            // Update xray with report
            setXrays(prev => prev.map(x =>
                x.id === xray.id ? { ...x, diagnosticReport: report } : x
            ));

            if (selectedXray?.id === xray.id) {
                setSelectedXray(prev => prev ? { ...prev, diagnosticReport: report } : null);
            }

            toast.success('Diagnostic report generated!');
        } catch (err: any) {
            console.error('Report generation failed:', err);
            console.error('Error response:', err.response?.data);
            const errorMsg = err.response?.data?.detail || err.message || 'Failed to generate report';
            toast.error(errorMsg);
            // Don't crash the component - just show error toast
        } finally {
            setIsGeneratingReport(false);
        }
    };

    // Handle file upload - process like original
    const handleFiles = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);

        for (const file of fileArray) {
            // Validate file extension
            const validExtensions = ['.png', '.jpg', '.jpeg', '.dcm', '.dicom', '.rvg'];
            const ext = '.' + file.name.split('.').pop()?.toLowerCase();

            if (!validExtensions.includes(ext)) {
                toast.error(`Invalid file type: ${file.name}. Use PNG, JPEG, DCM, or RVG.`);
                continue;
            }

            // Create preview URL
            const previewUrl = URL.createObjectURL(file);
            const id = `${file.name}-${Date.now()}`;

            const newXray: UploadedXray = {
                id,
                file,
                previewUrl,
                status: 'pending'
            };

            // Add to list
            setXrays(prev => [newXray, ...prev]);

            // Start detection immediately (like original)
            setXrays(prev => prev.map(x =>
                x.id === id ? { ...x, status: 'loading' } : x
            ));

            try {
                const result = await detectDentalConditions(file);

                const updatedXray: UploadedXray = {
                    ...newXray,
                    status: 'success',
                    predictions: result.predictions || [],
                    metadata: result.metadata,
                    imageInfo: result.image_info,
                };

                setXrays(prev => prev.map(x =>
                    x.id === id ? updatedXray : x
                ));

                const detectionCount = result.predictions?.length || 0;
                toast.success(`Analysis complete: ${detectionCount} condition(s) detected`);

            } catch (err: any) {
                console.error('Detection failed:', err);
                const errorMsg = err.response?.data?.detail || err.message || 'Analysis failed';

                setXrays(prev => prev.map(x =>
                    x.id === id ? { ...x, status: 'error', error: errorMsg } : x
                ));

                toast.error(`Failed to analyze ${file.name}: ${errorMsg}`);
            }
        }
    };

    // Remove an X-ray
    const removeXray = (id: string) => {
        const xray = xrays.find(x => x.id === id);
        if (xray) {
            URL.revokeObjectURL(xray.previewUrl);
        }
        setXrays(prev => prev.filter(x => x.id !== id));
        if (selectedXray?.id === id) {
            setSelectedXray(null);
        }
    };

    // Drag & drop handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget === e.target) setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
            handleFiles(e.dataTransfer.files);
        }
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'success': return <Badge className="bg-green-600">Analyzed</Badge>;
            case 'loading': return <Badge variant="secondary">Analyzing...</Badge>;
            case 'error': return <Badge variant="destructive">Failed</Badge>;
            default: return <Badge variant="outline">Pending</Badge>;
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)]">
            {/* Left Panel - Upload & X-ray List */}
            <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto flex flex-col">
                <h1 className="text-xl font-bold mb-4">X-Ray Lab</h1>

                {/* Drag & Drop Zone */}
                <div
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        border-2 border-dashed rounded-xl p-6 text-center cursor-pointer mb-4
                        transition-all duration-200
                        ${isDragging
                            ? 'border-teal-500 bg-teal-50 scale-[1.02]'
                            : 'border-gray-300 hover:border-teal-400 hover:bg-white'
                        }
                    `}
                >
                    <Upload className={`h-10 w-10 mx-auto mb-2 ${isDragging ? 'text-teal-500' : 'text-gray-400'}`} />
                    <p className="font-medium text-sm">
                        {isDragging ? 'Drop files here!' : 'Drag & Drop X-rays'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">or click to browse</p>
                    <p className="text-xs text-gray-400 mt-2">DCM, RVG, PNG, JPEG</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg,.dcm,.dicom,.rvg"
                        onChange={(e) => e.target.files && handleFiles(e.target.files)}
                        className="hidden"
                        multiple
                    />
                </div>

                {/* X-ray List */}
                <div className="flex-1 space-y-2 overflow-y-auto">
                    {xrays.map((xray) => (
                        <Card
                            key={xray.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${selectedXray?.id === xray.id ? 'ring-2 ring-teal-500' : ''
                                }`}
                            onClick={() => setSelectedXray(xray)}
                        >
                            <div className="p-3 flex items-center gap-3">
                                <div className="w-12 h-12 bg-gray-900 rounded overflow-hidden flex-shrink-0">
                                    <img
                                        src={xray.previewUrl}
                                        alt={xray.file.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{xray.file.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {getStatusBadge(xray.status)}
                                        {xray.status === 'loading' && (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeXray(xray.id);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4 text-gray-500" />
                                </Button>
                            </div>
                        </Card>
                    ))}

                    {xrays.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            <FileImage className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No X-rays uploaded</p>
                            <p className="text-xs mt-1">Drop files above to start</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Viewer & Results */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {selectedXray ? (
                    <>
                        {/* Toolbar */}
                        <div className="border-b p-3 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium w-16 text-center">{Math.round(zoom * 100)}%</span>
                                <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setRotation(r => (r + 90) % 360)}>
                                    <RotateCw className="h-4 w-4" />
                                </Button>
                            </div>

                            {selectedXray.status === 'success' &&
                                selectedXray.predictions &&
                                selectedXray.predictions.length > 0 &&
                                !selectedXray.diagnosticReport && (
                                    <Button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            generateDiagnosticReport(selectedXray);
                                        }}
                                        disabled={isGeneratingReport}
                                        className="bg-teal-600 hover:bg-teal-700"
                                    >
                                        {isGeneratingReport ? (
                                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                                        ) : (
                                            <><Stethoscope className="h-4 w-4 mr-2" /> Generate Diagnosis</>
                                        )}
                                    </Button>
                                )}
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* X-ray Viewer */}
                            <div className="flex-1 bg-gray-900 relative overflow-auto flex items-center justify-center p-4">
                                <div
                                    className="relative"
                                    style={{
                                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                        transition: 'transform 0.2s'
                                    }}
                                >
                                    <img
                                        ref={imageRef}
                                        src={selectedXray.previewUrl}
                                        alt={selectedXray.file.name}
                                        className="max-w-full max-h-[70vh] object-contain"
                                        onLoad={handleImageLoad}
                                    />

                                    {/* Detection overlay - works with or without imageInfo */}
                                    {selectedXray.status === 'success' &&
                                        selectedXray.predictions &&
                                        selectedXray.predictions.length > 0 &&
                                        imageRef.current && (
                                            <>
                                                {selectedXray.predictions.map((detection) => {
                                                    // Use imageInfo if available, otherwise use natural image dimensions
                                                    const originalWidth = selectedXray.imageInfo?.width || imageRef.current!.naturalWidth;
                                                    const originalHeight = selectedXray.imageInfo?.height || imageRef.current!.naturalHeight;
                                                    const displayWidth = imageRef.current!.clientWidth;
                                                    const displayHeight = imageRef.current!.clientHeight;

                                                    const scaleX = displayWidth / originalWidth;
                                                    const scaleY = displayHeight / originalHeight;
                                                    const boxColor = getDetectionColor(detection.class_id);

                                                    // IMPORTANT: Roboflow returns x,y as CENTER of bounding box
                                                    // We need to convert to top-left corner for CSS positioning
                                                    const boxWidth = detection.width * scaleX;
                                                    const boxHeight = detection.height * scaleY;
                                                    const centerX = detection.x * scaleX;
                                                    const centerY = detection.y * scaleY;

                                                    // Convert center to top-left corner
                                                    const left = centerX - (boxWidth / 2);
                                                    const top = centerY - (boxHeight / 2);

                                                    return (
                                                        <div
                                                            key={detection.detection_id}
                                                            className="absolute border-2"
                                                            style={{
                                                                left: left,
                                                                top: top,
                                                                width: boxWidth,
                                                                height: boxHeight,
                                                                borderColor: boxColor,
                                                            }}
                                                        >
                                                            <div
                                                                className="absolute -top-6 left-0 px-1 text-xs text-white truncate"
                                                                style={{ backgroundColor: boxColor }}
                                                            >
                                                                {detection.class} ({(detection.confidence * 100).toFixed(1)}%)
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        )}
                                </div>
                            </div>

                            {/* Results Panel */}
                            <div className="w-96 border-l bg-white overflow-y-auto">
                                <div className="p-4 space-y-4">
                                    <h3 className="font-bold text-lg">Analysis Results</h3>

                                    {selectedXray.status === 'loading' && (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                                            <span className="ml-3">Analyzing X-ray...</span>
                                        </div>
                                    )}

                                    {selectedXray.status === 'error' && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-red-600">
                                                <AlertCircle className="h-4 w-4" />
                                                <span className="font-medium">Error</span>
                                            </div>
                                            <p className="text-red-700 text-sm mt-1">{selectedXray.error}</p>
                                        </div>
                                    )}

                                    {selectedXray.status === 'success' && (
                                        <>
                                            {/* Detections */}
                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm">Detected Conditions</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    {(!selectedXray.predictions || selectedXray.predictions.length === 0) ? (
                                                        <p className="text-gray-500 text-sm">No conditions detected ✓</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {selectedXray.predictions.map((d, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="flex justify-between items-center p-2 rounded"
                                                                    style={{
                                                                        backgroundColor: `${getDetectionColor(d.class_id)}20`,
                                                                        borderLeft: `3px solid ${getDetectionColor(d.class_id)}`
                                                                    }}
                                                                >
                                                                    <span className="font-medium" style={{ color: getDetectionColor(d.class_id) }}>
                                                                        {d.class}
                                                                    </span>
                                                                    <Badge style={{ backgroundColor: getDetectionColor(d.class_id) }}>
                                                                        {(d.confidence * 100).toFixed(0)}%
                                                                    </Badge>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            {/* Diagnostic Report */}
                                            {selectedXray.diagnosticReport && (
                                                <Card className="border-teal-200 bg-teal-50">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-sm flex items-center gap-2">
                                                            <Stethoscope className="h-4 w-4 text-teal-600" />
                                                            AI Diagnostic Report
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-3 text-sm">
                                                        <div>
                                                            <h4 className="font-semibold mb-1">Summary</h4>
                                                            <p>{selectedXray.diagnosticReport?.summary || 'No summary available'}</p>
                                                        </div>

                                                        <div>
                                                            <h4 className="font-semibold mb-1">Detailed Report</h4>
                                                            <p className="whitespace-pre-wrap">{selectedXray.diagnosticReport?.report || 'No detailed report available'}</p>
                                                        </div>

                                                        {selectedXray.diagnosticReport.recommendations?.length > 0 && (
                                                            <div>
                                                                <h4 className="font-semibold mb-1">Recommendations</h4>
                                                                <ul className="list-disc list-inside space-y-1">
                                                                    {selectedXray.diagnosticReport.recommendations.map((rec, i) => (
                                                                        <li key={i}>{rec}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {selectedXray.diagnosticReport?.severity_level && (
                                                            <div className="pt-2 border-t">
                                                                <Badge className={
                                                                    selectedXray.diagnosticReport.severity_level === 'high'
                                                                        ? 'bg-red-600'
                                                                        : selectedXray.diagnosticReport.severity_level === 'moderate'
                                                                            ? 'bg-yellow-600'
                                                                            : 'bg-green-600'
                                                                }>
                                                                    Severity: {selectedXray.diagnosticReport.severity_level.toUpperCase()}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {/* Metadata */}
                                            {selectedXray.metadata && Object.keys(selectedXray.metadata).length > 0 && (
                                                <Card>
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-sm">DICOM Metadata</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="text-sm space-y-1">
                                                        {selectedXray.metadata.patient_name && (
                                                            <p><strong>Patient:</strong> {selectedXray.metadata.patient_name}</p>
                                                        )}
                                                        {selectedXray.metadata.study_date && (
                                                            <p><strong>Study Date:</strong> {selectedXray.metadata.study_date}</p>
                                                        )}
                                                        {selectedXray.metadata.modality && (
                                                            <p><strong>Modality:</strong> {selectedXray.metadata.modality}</p>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {/* Image Info */}
                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm">File Information</CardTitle>
                                                </CardHeader>
                                                <CardContent className="text-sm space-y-1">
                                                    <p><strong>File:</strong> {selectedXray.file.name}</p>
                                                    <p><strong>Size:</strong> {(selectedXray.file.size / 1024).toFixed(1)} KB</p>
                                                    {selectedXray.imageInfo && (
                                                        <p><strong>Dimensions:</strong> {selectedXray.imageInfo.width} x {selectedXray.imageInfo.height}</p>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-100">
                        <div className="text-center">
                            <FileImage className="h-20 w-20 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-600">No X-Ray Selected</h3>
                            <p className="text-gray-500 mt-1">Upload or select an X-ray to view analysis</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
