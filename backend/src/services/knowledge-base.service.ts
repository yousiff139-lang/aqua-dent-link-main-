import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../config/logger.js';

// Training data structure
export interface QuestionAnswer {
    question: string;
    answer: string;
}

export interface TrainingDataMetadata {
    version: string;
    description: string;
    categories: string[];
    total_questions: number;
    estimated_tokens: number;
}

export interface TrainingData {
    metadata: TrainingDataMetadata;
    [category: string]: QuestionAnswer[] | TrainingDataMetadata;
}

export interface KnowledgeBaseResult {
    question: string;
    answer: string;
    category: string;
    confidence: number;
    source: 'exact_match' | 'fuzzy_match' | 'category_match';
}

export interface KnowledgeBaseStats {
    totalQuestions: number;
    totalCategories: number;
    questionsPerCategory: Record<string, number>;
    mostSearchedQuestions: Array<{ question: string; count: number }>;
}

/**
 * Knowledge Base Service
 * Manages dental FAQ training data and provides intelligent question matching
 */
export class KnowledgeBaseService {
    private trainingData: TrainingData | null = null;
    private questionCache: Map<string, KnowledgeBaseResult> = new Map();
    private searchStats: Map<string, number> = new Map();
    private isLoaded: boolean = false;

    /**
     * Load training data from JSON file
     */
    async loadTrainingData(): Promise<void> {
        try {
            const dataPath = join(process.cwd(), 'src', 'data', 'dental_training_qa.json');
            const rawData = readFileSync(dataPath, 'utf-8');
            this.trainingData = JSON.parse(rawData);
            this.isLoaded = true;

            logger.info('Knowledge base loaded successfully', {
                totalQuestions: this.trainingData?.metadata.total_questions,
                categories: this.trainingData?.metadata.categories.length,
            });
        } catch (error) {
            logger.error('Failed to load training data', { error });
            throw new Error('Failed to load knowledge base');
        }
    }

    /**
     * Search for answer by question using multiple matching strategies
     */
    searchByQuestion(question: string): KnowledgeBaseResult | null {
        if (!this.isLoaded || !this.trainingData) {
            logger.warn('Knowledge base not loaded');
            return null;
        }

        const normalizedQuestion = this.normalizeText(question);

        // Check cache first
        const cached = this.questionCache.get(normalizedQuestion);
        if (cached) {
            this.recordSearch(question);
            return cached;
        }

        // Strategy 1: Exact match
        const exactMatch = this.findExactMatch(normalizedQuestion);
        if (exactMatch) {
            this.questionCache.set(normalizedQuestion, exactMatch);
            this.recordSearch(question);
            return exactMatch;
        }

        // Strategy 2: Fuzzy match (high similarity)
        const fuzzyMatch = this.findFuzzyMatch(normalizedQuestion, 0.75);
        if (fuzzyMatch) {
            this.questionCache.set(normalizedQuestion, fuzzyMatch);
            this.recordSearch(question);
            return fuzzyMatch;
        }

        // Strategy 3: Keyword/category match (medium similarity)
        const keywordMatch = this.findKeywordMatch(normalizedQuestion, 0.5);
        if (keywordMatch) {
            this.questionCache.set(normalizedQuestion, keywordMatch);
            this.recordSearch(question);
            return keywordMatch;
        }

        // No match found - will fall back to internet search
        logger.info('No knowledge base match found', { question: question.substring(0, 50) });
        return null;
    }

    /**
     * Get all questions from a specific category
     */
    searchByCategory(category: string): QuestionAnswer[] {
        if (!this.isLoaded || !this.trainingData) {
            return [];
        }

        const categoryData = this.trainingData[category];
        if (Array.isArray(categoryData)) {
            return categoryData;
        }

        return [];
    }

    /**
     * Get knowledge base statistics
     */
    getStatistics(): KnowledgeBaseStats {
        if (!this.isLoaded || !this.trainingData) {
            return {
                totalQuestions: 0,
                totalCategories: 0,
                questionsPerCategory: {},
                mostSearchedQuestions: [],
            };
        }

        const questionsPerCategory: Record<string, number> = {};
        const categories = this.trainingData.metadata.categories;

        categories.forEach((category) => {
            const categoryData = this.trainingData![category];
            if (Array.isArray(categoryData)) {
                questionsPerCategory[category] = categoryData.length;
            }
        });

        // Get top 10 most searched questions
        const sortedSearches = Array.from(this.searchStats.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([question, count]) => ({ question, count }));

        return {
            totalQuestions: this.trainingData.metadata.total_questions,
            totalCategories: categories.length,
            questionsPerCategory,
            mostSearchedQuestions: sortedSearches,
        };
    }

    /**
     * Clear cache and statistics (useful for testing)
     */
    clearCache(): void {
        this.questionCache.clear();
        this.searchStats.clear();
        logger.info('Knowledge base cache cleared');
    }

    // ===== PRIVATE HELPER METHODS =====

    /**
     * Normalize text for comparison
     */
    private normalizeText(text: string): string {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' '); // Normalize whitespace
    }

    /**
     * Find exact match in knowledge base
     */
    private findExactMatch(normalizedQuestion: string): KnowledgeBaseResult | null {
        if (!this.trainingData) return null;

        for (const category of this.trainingData.metadata.categories) {
            const categoryData = this.trainingData[category];
            if (!Array.isArray(categoryData)) continue;

            for (const qa of categoryData) {
                const normalizedKBQuestion = this.normalizeText(qa.question);
                if (normalizedKBQuestion === normalizedQuestion) {
                    return {
                        question: qa.question,
                        answer: qa.answer,
                        category,
                        confidence: 1.0,
                        source: 'exact_match',
                    };
                }
            }
        }

        return null;
    }

    /**
     * Find fuzzy match using similarity scoring
     */
    private findFuzzyMatch(
        normalizedQuestion: string,
        threshold: number
    ): KnowledgeBaseResult | null {
        if (!this.trainingData) return null;

        let bestMatch: KnowledgeBaseResult | null = null;
        let bestScore = 0;

        for (const category of this.trainingData.metadata.categories) {
            const categoryData = this.trainingData[category];
            if (!Array.isArray(categoryData)) continue;

            for (const qa of categoryData) {
                const normalizedKBQuestion = this.normalizeText(qa.question);
                const similarity = this.calculateSimilarity(normalizedQuestion, normalizedKBQuestion);

                if (similarity > bestScore && similarity >= threshold) {
                    bestScore = similarity;
                    bestMatch = {
                        question: qa.question,
                        answer: qa.answer,
                        category,
                        confidence: similarity,
                        source: 'fuzzy_match',
                    };
                }
            }
        }

        return bestMatch;
    }

    /**
     * Find match based on keyword overlap
     */
    private findKeywordMatch(
        normalizedQuestion: string,
        threshold: number
    ): KnowledgeBaseResult | null {
        if (!this.trainingData) return null;

        const questionWords = new Set(normalizedQuestion.split(' ').filter((w) => w.length > 3));
        if (questionWords.size === 0) return null;

        let bestMatch: KnowledgeBaseResult | null = null;
        let bestScore = 0;

        for (const category of this.trainingData.metadata.categories) {
            const categoryData = this.trainingData[category];
            if (!Array.isArray(categoryData)) continue;

            for (const qa of categoryData) {
                const normalizedKBQuestion = this.normalizeText(qa.question);
                const kbWords = new Set(normalizedKBQuestion.split(' ').filter((w) => w.length > 3));

                // Calculate word overlap
                const intersection = new Set([...questionWords].filter((w) => kbWords.has(w)));
                const union = new Set([...questionWords, ...kbWords]);
                const jaccardScore = intersection.size / union.size;

                if (jaccardScore > bestScore && jaccardScore >= threshold) {
                    bestScore = jaccardScore;
                    bestMatch = {
                        question: qa.question,
                        answer: qa.answer,
                        category,
                        confidence: jaccardScore,
                        source: 'category_match',
                    };
                }
            }
        }

        return bestMatch;
    }

    /**
     * Calculate similarity between two strings using Levenshtein-based approach
     */
    private calculateSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix: number[][] = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Record search for analytics
     */
    private recordSearch(question: string): void {
        const count = this.searchStats.get(question) || 0;
        this.searchStats.set(question, count + 1);
    }
}

// Export singleton instance
export const knowledgeBaseService = new KnowledgeBaseService();
