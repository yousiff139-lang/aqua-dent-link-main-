/**
 * Card Validation Utilities for Conceptual Payment System
 * 
 * This module provides card number validation, type detection, and formatting
 * for the dental booking application's conceptual payment system.
 * 
 * IMPORTANT: This is for demonstration purposes only. In production,
 * use a certified payment processor (Stripe, Square, etc.)
 */

// Card type definitions
export type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

export interface CardInfo {
    type: CardType;
    displayName: string;
    cvvLength: number;
    cardNumberLength: number[];
    icon: string;
    color: string;
}

// Card type configurations
export const CARD_CONFIGS: Record<CardType, CardInfo> = {
    visa: {
        type: 'visa',
        displayName: 'Visa',
        cvvLength: 3,
        cardNumberLength: [13, 16, 19],
        icon: '💳', // Will be replaced with actual SVG in component
        color: '#1A1F71',
    },
    mastercard: {
        type: 'mastercard',
        displayName: 'MasterCard',
        cvvLength: 3,
        cardNumberLength: [16],
        icon: '💳',
        color: '#EB001B',
    },
    amex: {
        type: 'amex',
        displayName: 'American Express',
        cvvLength: 4,
        cardNumberLength: [15],
        icon: '💳',
        color: '#006FCF',
    },
    discover: {
        type: 'discover',
        displayName: 'Discover',
        cvvLength: 3,
        cardNumberLength: [16],
        icon: '💳',
        color: '#FF6000',
    },
    unknown: {
        type: 'unknown',
        displayName: 'Card',
        cvvLength: 3,
        cardNumberLength: [16],
        icon: '💳',
        color: '#6B7280',
    },
};

/**
 * Detect card type from card number using IIN/BIN ranges
 * 
 * Card Number Ranges:
 * - Visa: Starts with 4
 * - MasterCard: Starts with 51-55 or 2221-2720
 * - American Express: Starts with 34 or 37
 * - Discover: Starts with 6011, 622126-622925, 644-649, or 65
 */
export function detectCardType(cardNumber: string): CardType {
    // Remove spaces and dashes
    const cleanNumber = cardNumber.replace(/[\s-]/g, '');

    if (!cleanNumber || cleanNumber.length < 1) {
        return 'unknown';
    }

    // Visa: starts with 4
    if (/^4/.test(cleanNumber)) {
        return 'visa';
    }

    // MasterCard: starts with 51-55 or 2221-2720
    if (/^5[1-5]/.test(cleanNumber) || /^2(2[2-9][1-9]|2[3-9][0-9]|[3-6][0-9]{2}|7[0-1][0-9]|720)/.test(cleanNumber)) {
        return 'mastercard';
    }

    // American Express: starts with 34 or 37
    if (/^3[47]/.test(cleanNumber)) {
        return 'amex';
    }

    // Discover: starts with 6011, 622126-622925, 644-649, or 65
    if (/^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[01][0-9]|92[0-5])|64[4-9]|65)/.test(cleanNumber)) {
        return 'discover';
    }

    return 'unknown';
}

/**
 * Get card info based on detected type
 */
export function getCardInfo(cardNumber: string): CardInfo {
    const type = detectCardType(cardNumber);
    return CARD_CONFIGS[type];
}

/**
 * Luhn Algorithm (Mod 10) for card number validation
 * 
 * This algorithm validates card numbers by:
 * 1. Starting from the rightmost digit, double every second digit
 * 2. If doubling results in > 9, subtract 9
 * 3. Sum all digits
 * 4. If sum % 10 === 0, the number is valid
 */
export function validateLuhn(cardNumber: string): boolean {
    // Remove spaces and dashes
    const cleanNumber = cardNumber.replace(/[\s-]/g, '');

    // Must be all digits
    if (!/^\d+$/.test(cleanNumber)) {
        return false;
    }

    // Minimum length check
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
        return false;
    }

    let sum = 0;
    let isEven = false;

    // Process from right to left
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cleanNumber[i], 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
}

/**
 * Validate card number (type + length + Luhn)
 */
export function validateCardNumber(cardNumber: string): { isValid: boolean; error?: string } {
    const cleanNumber = cardNumber.replace(/[\s-]/g, '');

    if (!cleanNumber) {
        return { isValid: false, error: 'Card number is required' };
    }

    if (!/^\d+$/.test(cleanNumber)) {
        return { isValid: false, error: 'Card number must contain only digits' };
    }

    const cardType = detectCardType(cleanNumber);
    const cardConfig = CARD_CONFIGS[cardType];

    // Check length based on card type
    if (!cardConfig.cardNumberLength.includes(cleanNumber.length)) {
        const expectedLengths = cardConfig.cardNumberLength.join(' or ');
        return {
            isValid: false,
            error: `${cardConfig.displayName} card must be ${expectedLengths} digits`
        };
    }

    // Validate with Luhn algorithm
    if (!validateLuhn(cleanNumber)) {
        return { isValid: false, error: 'Invalid card number' };
    }

    return { isValid: true };
}

/**
 * Validate expiry date (MM/YY format)
 */
export function validateExpiry(expiry: string): { isValid: boolean; error?: string } {
    // Clean input - remove any non-digit characters except /
    const cleanExpiry = expiry.replace(/[^\d/]/g, '');

    // Check format
    const match = cleanExpiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) {
        return { isValid: false, error: 'Enter expiry as MM/YY' };
    }

    const month = parseInt(match[1], 10);
    const year = parseInt(match[2], 10);

    // Validate month
    if (month < 1 || month > 12) {
        return { isValid: false, error: 'Invalid month (01-12)' };
    }

    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear() % 100; // Get last 2 digits
    const currentMonth = now.getMonth() + 1; // 1-indexed

    // Check if expired
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
        return { isValid: false, error: 'Card has expired' };
    }

    // Check if too far in future (max 10 years)
    if (year > currentYear + 10) {
        return { isValid: false, error: 'Invalid expiry year' };
    }

    return { isValid: true };
}

/**
 * Validate CVV
 */
export function validateCVV(cvv: string, cardType: CardType = 'unknown'): { isValid: boolean; error?: string } {
    const cleanCVV = cvv.replace(/\D/g, '');

    if (!cleanCVV) {
        return { isValid: false, error: 'CVV is required' };
    }

    const expectedLength = CARD_CONFIGS[cardType].cvvLength;

    if (cleanCVV.length !== expectedLength) {
        return { isValid: false, error: `CVV must be ${expectedLength} digits` };
    }

    return { isValid: true };
}

/**
 * Validate cardholder name
 */
export function validateCardholderName(name: string): { isValid: boolean; error?: string } {
    const cleanName = name.trim();

    if (!cleanName) {
        return { isValid: false, error: 'Cardholder name is required' };
    }

    if (cleanName.length < 2) {
        return { isValid: false, error: 'Name must be at least 2 characters' };
    }

    if (cleanName.length > 50) {
        return { isValid: false, error: 'Name must not exceed 50 characters' };
    }

    // Only allow letters, spaces, hyphens, and apostrophes
    if (!/^[a-zA-Z\s'-]+$/.test(cleanName)) {
        return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
    }

    return { isValid: true };
}

/**
 * Format card number for display (groups of 4, or 4-6-5 for Amex)
 */
export function formatCardNumber(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\D/g, '');
    const cardType = detectCardType(cleanNumber);

    if (cardType === 'amex') {
        // Amex format: 4-6-5
        const match = cleanNumber.match(/^(\d{0,4})(\d{0,6})(\d{0,5})$/);
        if (match) {
            return [match[1], match[2], match[3]].filter(Boolean).join(' ');
        }
    }

    // Default format: groups of 4
    const groups = cleanNumber.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleanNumber;
}

/**
 * Format expiry date for display (MM/YY)
 */
export function formatExpiry(expiry: string): string {
    const cleanExpiry = expiry.replace(/\D/g, '');

    if (cleanExpiry.length >= 2) {
        return `${cleanExpiry.slice(0, 2)}/${cleanExpiry.slice(2, 4)}`;
    }

    return cleanExpiry;
}

/**
 * Mask card number for display (show only last 4 digits)
 */
export function maskCardNumber(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\D/g, '');

    if (cleanNumber.length < 4) {
        return cleanNumber;
    }

    const lastFour = cleanNumber.slice(-4);
    const masked = '*'.repeat(cleanNumber.length - 4);

    return `${masked}${lastFour}`;
}

/**
 * Get last 4 digits of card number
 */
export function getLastFourDigits(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\D/g, '');
    return cleanNumber.slice(-4);
}

/**
 * Complete card validation
 */
export function validateCard(card: {
    number: string;
    expiry: string;
    cvv: string;
    name: string;
}): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    const numberResult = validateCardNumber(card.number);
    if (!numberResult.isValid && numberResult.error) {
        errors.number = numberResult.error;
    }

    const expiryResult = validateExpiry(card.expiry);
    if (!expiryResult.isValid && expiryResult.error) {
        errors.expiry = expiryResult.error;
    }

    const cardType = detectCardType(card.number);
    const cvvResult = validateCVV(card.cvv, cardType);
    if (!cvvResult.isValid && cvvResult.error) {
        errors.cvv = cvvResult.error;
    }

    const nameResult = validateCardholderName(card.name);
    if (!nameResult.isValid && nameResult.error) {
        errors.name = nameResult.error;
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

// Test card numbers for demonstration
export const TEST_CARDS = {
    visa: '4111111111111111',
    mastercard: '5500000000000004',
    amex: '340000000000009',
    discover: '6011000000000004',
    invalidLuhn: '4111111111111112',
};
