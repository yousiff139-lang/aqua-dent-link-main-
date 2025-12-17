import { useState, useEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
    src: string;
    alt: string;
    className?: string;
    fallbackSrc?: string;
    width?: number;
    height?: number;
    priority?: boolean;
    onLoad?: () => void;
    onError?: () => void;
}

/**
 * Optimized Image Component with:
 * - Lazy loading with IntersectionObserver
 * - Blur-up loading effect
 * - Automatic fallback handling
 * - Memory-efficient with cleanup
 */
const OptimizedImage = memo(function OptimizedImage({
    src,
    alt,
    className,
    fallbackSrc = '/avatars/default.png.svg',
    width,
    height,
    priority = false,
    onLoad,
    onError,
}: OptimizedImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(priority);
    const [currentSrc, setCurrentSrc] = useState<string>(priority ? src : '');
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // IntersectionObserver for lazy loading
    useEffect(() => {
        if (priority) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: '200px', // Start loading 200px before entering viewport
                threshold: 0.01,
            }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, [priority]);

    // Load image when in view
    useEffect(() => {
        if (isInView && src) {
            setCurrentSrc(src);
        }
    }, [isInView, src]);

    const handleLoad = () => {
        setIsLoaded(true);
        setHasError(false);
        onLoad?.();
    };

    const handleError = () => {
        setHasError(true);
        if (fallbackSrc && currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc);
        }
        onError?.();
    };

    return (
        <div
            ref={imgRef}
            className={cn(
                'relative overflow-hidden bg-gray-100',
                className
            )}
            style={{ width, height }}
        >
            {/* Placeholder/skeleton shown before load */}
            {!isLoaded && (
                <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
            )}

            {/* Actual image */}
            {currentSrc && (
                <img
                    src={currentSrc}
                    alt={alt}
                    width={width}
                    height={height}
                    loading={priority ? 'eager' : 'lazy'}
                    decoding="async"
                    onLoad={handleLoad}
                    onError={handleError}
                    className={cn(
                        'w-full h-full object-cover transition-opacity duration-300',
                        isLoaded ? 'opacity-100' : 'opacity-0'
                    )}
                />
            )}
        </div>
    );
});

export { OptimizedImage };
export default OptimizedImage;
