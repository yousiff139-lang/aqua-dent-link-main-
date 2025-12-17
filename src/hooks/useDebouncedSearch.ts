import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Debounced search hook for faster search experience
 * Delays the search execution until user stops typing
 */
export function useDebouncedSearch<T>(
    searchFn: (query: string) => Promise<T[]>,
    delay: number = 300
) {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [results, setResults] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Debounce the query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, delay);

        return () => clearTimeout(timer);
    }, [query, delay]);

    // Execute search when debounced query changes
    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        // Abort previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const executeSearch = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const data = await searchFn(debouncedQuery);
                if (!controller.signal.aborted) {
                    setResults(data);
                }
            } catch (err: any) {
                if (!controller.signal.aborted) {
                    setError(err.message || 'Search failed');
                    setResults([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        executeSearch();

        return () => {
            controller.abort();
        };
    }, [debouncedQuery, searchFn]);

    const clearSearch = useCallback(() => {
        setQuery('');
        setDebouncedQuery('');
        setResults([]);
        setError(null);
    }, []);

    return {
        query,
        setQuery,
        results,
        isLoading,
        error,
        clearSearch,
    };
}

/**
 * Simple debounced value hook
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Throttled callback hook
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 300
): T {
    const lastCall = useRef<number>(0);
    const lastResult = useRef<ReturnType<T>>();

    return useCallback(
        ((...args: Parameters<T>) => {
            const now = Date.now();
            if (now - lastCall.current >= delay) {
                lastCall.current = now;
                lastResult.current = callback(...args);
            }
            return lastResult.current;
        }) as T,
        [callback, delay]
    );
}
