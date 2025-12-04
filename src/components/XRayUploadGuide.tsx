import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileImage, Info, CheckCircle2 } from 'lucide-react';

export function XRayUploadGuide() {
    return (
        <Card className="mt-2 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <FileImage className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                        <h4 className="font-semibold text-blue-900 text-sm">X-Ray Upload Guidelines</h4>

                        <div className="space-y-1 text-xs text-blue-800">
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span><strong>Supported Formats:</strong> PNG, JPEG, DCM (DICOM)</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span><strong>Max File Size:</strong> 10MB per file</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span><strong>Image Quality:</strong> Clear, high-resolution dental X-rays</span>
                            </div>
                        </div>

                        <Alert className="mt-2 bg-blue-100 border-blue-300">
                            <Info className="h-3 w-3" />
                            <AlertDescription className="text-xs text-blue-900">
                                Your dentist will be able to analyze uploaded X-rays using AI-powered cavity detection
                            </AlertDescription>
                        </Alert>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
