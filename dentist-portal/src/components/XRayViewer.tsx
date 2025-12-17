import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

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

interface XRayViewerProps {
    imageUrl: string;
    detections?: Detection[];
    onAnalyze?: () => void;
    isAnalyzing?: boolean;
}

export default function XRayViewer({
    imageUrl,
    detections = [],
    onAnalyze,
    isAnalyzing = false
}: XRayViewerProps) {
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hoveredDetection, setHoveredDetection] = useState<Detection | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !imageUrl) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Convert Supabase storage path to public URL if needed
        let actualImageUrl = imageUrl;
        if (!imageUrl.startsWith('http')) {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            if (supabaseUrl) {
                // Try medical-documents bucket
                actualImageUrl = `${supabaseUrl}/storage/v1/object/public/medical-documents/${imageUrl}`;
            }
        }

        console.log('Loading X-ray image from:', actualImageUrl);

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            console.log('Image loaded successfully');
            setLoadedImage(img);

            // Set canvas size
            canvas.width = img.width;
            canvas.height = img.height;

            drawOverlay(img);
        };

        img.onerror = (error) => {
            console.error('Failed to load image:', error);
            // Try xray-uploads bucket as fallback
            if (!imageUrl.startsWith('http')) {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                if (supabaseUrl) {
                    const fallbackUrl = `${supabaseUrl}/storage/v1/object/public/xray-uploads/${imageUrl}`;
                    console.log('Retrying with xray-uploads bucket:', fallbackUrl);
                    const fallbackImg = new Image();
                    fallbackImg.crossOrigin = 'anonymous';
                    fallbackImg.onload = () => {
                        setLoadedImage(fallbackImg);
                        canvas.width = fallbackImg.width;
                        canvas.height = fallbackImg.height;
                        drawOverlay(fallbackImg);
                    };
                    fallbackImg.src = fallbackUrl;
                }
            }
        };

        img.src = actualImageUrl;
    }, [imageUrl]);

    useEffect(() => {
        if (loadedImage) {
            drawOverlay(loadedImage);
        }
    }, [detections, zoom, position, hoveredDetection, loadedImage]);

    const drawOverlay = (img: HTMLImageElement) => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw image
        ctx.save();
        ctx.translate(position.x, position.y);
        ctx.scale(zoom, zoom);
        ctx.drawImage(img, 0, 0);

        // Draw detections
        detections.forEach((detection) => {
            const isHovered = hoveredDetection?.detection_id === detection.detection_id;

            // Color based on confidence
            const color = getConfidenceColor(detection.confidence);

            // Convert from center coordinates (AI model output) to top-left coordinates (canvas drawing)
            // The AI model returns x,y as the CENTER of the bounding box
            const boxX = detection.x - detection.width / 2;
            const boxY = detection.y - detection.height / 2;

            ctx.strokeStyle = color;
            ctx.lineWidth = isHovered ? 3 : 2;
            ctx.strokeRect(boxX, boxY, detection.width, detection.height);

            // Fill with semi-transparent color
            ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ', 0.2)');
            ctx.fillRect(boxX, boxY, detection.width, detection.height);

            // Draw label
            const label = `${detection.class} (${(detection.confidence * 100).toFixed(1)}%)`;
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillStyle = color;

            const textWidth = ctx.measureText(label).width;
            const padding = 4;

            // Background for label
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(
                boxX,
                boxY - 24,
                textWidth + padding * 2,
                20
            );

            // Label text
            ctx.fillStyle = color;
            ctx.fillText(label, boxX + padding, boxY - 8);
        });

        ctx.restore();
    };

    const getConfidenceColor = (confidence: number): string => {
        if (confidence >= 0.8) return 'rgb(239, 68, 68)'; // High - Red
        if (confidence >= 0.6) return 'rgb(249, 115, 22)'; // Medium - Orange
        return 'rgb(234, 179, 8)'; // Low - Yellow
    };

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.25, 0.5));
    };

    const handleReset = () => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientX - dragStart.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (!canvasRef.current || !loadedImage) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - position.x) / zoom;
        const y = (e.clientY - rect.top - position.y) / zoom;

        // Check if click is within any detection (using center-based coordinates)
        const clicked = detections.find(d => {
            const boxX = d.x - d.width / 2;
            const boxY = d.y - d.height / 2;
            return x >= boxX && x <= boxX + d.width &&
                y >= boxY && y <= boxY + d.height;
        });

        setHoveredDetection(clicked || null);
    };

    return (
        <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">X-Ray Image</h3>

                <div className="flex items-center gap-2">
                    {onAnalyze && (
                        <Button
                            onClick={onAnalyze}
                            disabled={isAnalyzing}
                            className="bg-teal-600 hover:bg-teal-700"
                        >
                            {isAnalyzing ? 'Analyzing...' : 'Analyze X-Ray'}
                        </Button>
                    )}

                    <div className="flex items-center gap-1 border rounded-lg p-1">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleZoomOut}
                            disabled={zoom <= 0.5}
                        >
                            <ZoomOut className="h-4 w-4" />
                        </Button>

                        <span className="px-2 text-sm font-medium">{Math.round(zoom * 100)}%</span>

                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleZoomIn}
                            disabled={zoom >= 3}
                        >
                            <ZoomIn className="h-4 w-4" />
                        </Button>

                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleReset}
                        >
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div
                className="relative bg-gray-900 rounded-lg overflow-hidden"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onClick={handleCanvasClick}
                    className="max-w-full h-auto"
                />
            </div>

            {/* Detection Info Tooltip */}
            {hoveredDetection && (
                <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-teal-900">{hoveredDetection.class}</p>
                            <p className="text-sm text-teal-700">
                                Confidence: {(hoveredDetection.confidence * 100).toFixed(1)}%
                            </p>
                            <p className="text-xs text-teal-600 mt-1">
                                Position: ({Math.round(hoveredDetection.x)}, {Math.round(hoveredDetection.y)})
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Legend */}
            {detections.length > 0 && (
                <div className="mt-4 flex items-center gap-4 text-sm">
                    <span className="font-semibold">Confidence Levels:</span>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-red-500"></div>
                        <span>High (≥80%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-orange-500"></div>
                        <span>Medium (60-80%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-yellow-500"></div>
                        <span>Low (&lt;60%)</span>
                    </div>
                </div>
            )}
        </Card>
    );
}
