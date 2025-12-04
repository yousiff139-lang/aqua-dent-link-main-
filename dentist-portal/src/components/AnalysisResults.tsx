import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    AlertCircle,
    CheckCircle2,
    FileText,
    Download,
    AlertTriangle
} from 'lucide-react';

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

interface AnalysisResultsProps {
    detections: Detection[];
    diagnosticReport?: DiagnosticReport;
    onGenerateReport?: () => void;
    onExportReport?: () => void;
    isGeneratingReport?: boolean;
}

export default function AnalysisResults({
    detections,
    diagnosticReport,
    onGenerateReport,
    onExportReport,
    isGeneratingReport = false,
}: AnalysisResultsProps) {
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'moderate':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'low':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'high':
                return <AlertCircle className="h-5 w-5 text-red-600" />;
            case 'moderate':
                return <AlertTriangle className="h-5 w-5 text-orange-600" />;
            case 'low':
                return <CheckCircle2 className="h-5 w-5 text-yellow-600" />;
            default:
                return <CheckCircle2 className="h-5 w-5 text-gray-600" />;
        }
    };

    const averageConfidence = detections.length > 0
        ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
        : 0;

    return (
        <div className="space-y-4">
            {/* Summary Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-teal-600" />
                        Analysis Summary
                    </CardTitle>
                    <CardDescription>
                        AI-powered detection results
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Detections Found</p>
                            <p className="text-2xl font-bold text-teal-600">{detections.length}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Average Confidence</p>
                            <p className="text-2xl font-bold text-teal-600">
                                {(averageConfidence * 100).toFixed(1)}%
                            </p>
                        </div>
                    </div>

                    {diagnosticReport && (
                        <div className="pt-2">
                            <div className="flex items-center gap-2 mb-2">
                                {getSeverityIcon(diagnosticReport.severity_level)}
                                <span className="font-semibold">Severity Assessment:</span>
                                <Badge className={getSeverityColor(diagnosticReport.severity_level)}>
                                    {diagnosticReport.severity_level.toUpperCase()}
                                </Badge>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detections List */}
            <Card>
                <CardHeader>
                    <CardTitle>Detected Conditions</CardTitle>
                    <CardDescription>
                        {detections.length} condition{detections.length !== 1 ? 's' : ''} identified
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {detections.length === 0 ? (
                        <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle>No Issues Detected</AlertTitle>
                            <AlertDescription>
                                The AI analysis did not detect any significant dental conditions.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-3">
                            {detections.map((detection, index) => (
                                <div
                                    key={detection.detection_id}
                                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-semibold text-gray-900">
                                                    {index + 1}. {detection.class}
                                                </span>
                                                <Badge variant="outline">
                                                    ID: {detection.class_id}
                                                </Badge>
                                            </div>

                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-sm text-gray-600 mb-1">Confidence Level</p>
                                                    <div className="flex items-center gap-2">
                                                        <Progress
                                                            value={detection.confidence * 100}
                                                            className="flex-1 h-2"
                                                        />
                                                        <span className="text-sm font-semibold min-w-[50px]">
                                                            {(detection.confidence * 100).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="text-xs text-gray-500">
                                                    Location: ({Math.round(detection.x)}, {Math.round(detection.y)})
                                                    • Size: {Math.round(detection.width)}×{Math.round(detection.height)}px
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Diagnostic Report */}
            {diagnosticReport ? (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>AI Diagnostic Report</CardTitle>
                                <CardDescription>Generated by Gemini AI</CardDescription>
                            </div>
                            {onExportReport && (
                                <Button
                                    onClick={onExportReport}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                >
                                    <Download className="h-4 w-4" />
                                    Export PDF
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Summary */}
                        <div>
                            <h4 className="font-semibold mb-2">Summary</h4>
                            <p className="text-sm text-gray-700">{diagnosticReport.summary}</p>
                        </div>

                        {/* Full Report */}
                        <div>
                            <h4 className="font-semibold mb-2">Detailed Analysis</h4>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {diagnosticReport.report}
                                </p>
                            </div>
                        </div>

                        {/* Recommendations */}
                        <div>
                            <h4 className="font-semibold mb-2">Recommendations</h4>
                            <ul className="space-y-2">
                                {diagnosticReport.recommendations.map((rec, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-gray-700">{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                onGenerateReport && (
                    <Card>
                        <CardContent className="py-8 text-center">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="font-semibold mb-2">Generate Diagnostic Report</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Create an AI-powered diagnostic report based on the analysis results
                            </p>
                            <Button
                                onClick={onGenerateReport}
                                disabled={isGeneratingReport || detections.length === 0}
                                className="bg-teal-600 hover:bg-teal-700"
                            >
                                {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                            </Button>
                        </CardContent>
                    </Card>
                )
            )}
        </div>
    );
}
