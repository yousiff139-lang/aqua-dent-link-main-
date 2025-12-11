/**
 * Card Payment Form Component
 * 
 * A conceptual/demonstration card payment form with:
 * - Card number input with auto-formatting
 * - Dynamic card type detection and icon display
 * - Expiry date and CVV inputs
 * - Cardholder name input
 * - Real-time validation feedback
 * 
 * IMPORTANT: This is for demonstration purposes only.
 * No real payment processing occurs.
 */

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, CreditCard, Loader2 } from 'lucide-react';
import {
    detectCardType,
    getCardInfo,
    formatCardNumber,
    formatExpiry,
    validateCardNumber,
    validateExpiry,
    validateCVV,
    validateCardholderName,
    getLastFourDigits,
    CardType,
} from '@/utils/cardValidator';

// Card brand icons as SVG components
const VisaIcon = () => (
    <svg viewBox="0 0 48 48" className="h-8 w-12">
        <rect fill="#1A1F71" width="48" height="32" rx="4" />
        <path
            fill="#FFFFFF"
            d="M19.5 21.5l-1.4-6.8h-2.3l2.1 9.3h2.5l3.7-9.3h-2.4l-2.2 6.8zm7.3-6.8h-2.2l-1.4 9.3h2.2l1.4-9.3zm5.6 5.8c0-.6-.4-1-1.4-1.4l-.6-.2c-.5-.2-.6-.3-.6-.5s.2-.4.6-.4c.5 0 .9.2 1.1.3l.3-1.8c-.4-.2-.9-.3-1.6-.3-1.7 0-2.8.9-2.8 2.2 0 1 .6 1.6 1.7 2l.6.2c.5.2.7.4.7.6s-.3.5-.8.5c-.6 0-1.2-.2-1.6-.4l-.3 1.8c.5.2 1.2.4 2 .4 1.8 0 2.9-.9 2.9-2.3 0-1-.5-1.6-1.6-2l-.6-.2zm6.9-5.8l-2.8 9.3h2.3l.4-1.4h2.9l.2 1.4h2.1l-1.8-9.3h-3.3zm.8 5.9l.9-3.4.5 3.4h-1.4z"
        />
    </svg>
);

const MastercardIcon = () => (
    <svg viewBox="0 0 48 48" className="h-8 w-12">
        <rect fill="#F7F7F7" width="48" height="32" rx="4" />
        <circle cx="18" cy="16" r="8" fill="#EB001B" />
        <circle cx="30" cy="16" r="8" fill="#F79E1B" />
        <path
            fill="#FF5F00"
            d="M24 10.5c-1.8 1.4-3 3.5-3 5.5s1.2 4.1 3 5.5c1.8-1.4 3-3.5 3-5.5s-1.2-4.1-3-5.5z"
        />
    </svg>
);

const AmexIcon = () => (
    <svg viewBox="0 0 48 48" className="h-8 w-12">
        <rect fill="#006FCF" width="48" height="32" rx="4" />
        <text x="24" y="20" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="Arial">
            AMEX
        </text>
    </svg>
);

const DiscoverIcon = () => (
    <svg viewBox="0 0 48 48" className="h-8 w-12">
        <rect fill="#FF6000" width="48" height="32" rx="4" />
        <text x="24" y="20" fill="white" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="Arial">
            DISCOVER
        </text>
    </svg>
);

const GenericCardIcon = () => (
    <CreditCard className="h-8 w-12 text-gray-400" />
);

// Map card type to icon component
const cardIcons: Record<CardType, React.ReactNode> = {
    visa: <VisaIcon />,
    mastercard: <MastercardIcon />,
    amex: <AmexIcon />,
    discover: <DiscoverIcon />,
    unknown: <GenericCardIcon />,
};

export interface CardPaymentData {
    cardNumber: string;
    cardholderName: string;
    expiryDate: string;
    cvv: string;
    cardType: CardType;
    lastFourDigits: string;
}

interface CardPaymentFormProps {
    onCardDataChange: (data: CardPaymentData, isValid: boolean) => void;
    disabled?: boolean;
    isProcessing?: boolean;
}

export function CardPaymentForm({
    onCardDataChange,
    disabled = false,
    isProcessing = false,
}: CardPaymentFormProps) {
    // Form state
    const [cardNumber, setCardNumber] = useState('');
    const [cardholderName, setCardholderName] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cvv, setCvv] = useState('');

    // Validation state
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Derived state
    const cardType = detectCardType(cardNumber);
    const cardInfo = getCardInfo(cardNumber);

    // Validate and notify parent
    const updateParent = useCallback(() => {
        const numberValid = validateCardNumber(cardNumber);
        const nameValid = validateCardholderName(cardholderName);
        const expiryValid = validateExpiry(expiryDate);
        const cvvValid = validateCVV(cvv, cardType);

        const isAllValid =
            numberValid.isValid &&
            nameValid.isValid &&
            expiryValid.isValid &&
            cvvValid.isValid;

        onCardDataChange(
            {
                cardNumber: cardNumber.replace(/\s/g, ''),
                cardholderName,
                expiryDate,
                cvv,
                cardType,
                lastFourDigits: getLastFourDigits(cardNumber),
            },
            isAllValid
        );
    }, [cardNumber, cardholderName, expiryDate, cvv, cardType, onCardDataChange]);

    // Update parent when any field changes
    useEffect(() => {
        updateParent();
    }, [updateParent]);

    // Handle card number input
    const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        const formatted = formatCardNumber(value);
        setCardNumber(formatted);

        if (touched.cardNumber) {
            const result = validateCardNumber(value);
            setErrors((prev) => ({
                ...prev,
                cardNumber: result.error || '',
            }));
        }
    };

    // Handle expiry date input
    const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 4) {
            const formatted = formatExpiry(value);
            setExpiryDate(formatted);

            if (touched.expiry && value.length >= 4) {
                const result = validateExpiry(formatted);
                setErrors((prev) => ({
                    ...prev,
                    expiry: result.error || '',
                }));
            }
        }
    };

    // Handle CVV input
    const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        const maxLength = cardInfo.cvvLength;

        if (value.length <= maxLength) {
            setCvv(value);

            if (touched.cvv) {
                const result = validateCVV(value, cardType);
                setErrors((prev) => ({
                    ...prev,
                    cvv: result.error || '',
                }));
            }
        }
    };

    // Handle name input
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCardholderName(e.target.value);

        if (touched.name) {
            const result = validateCardholderName(e.target.value);
            setErrors((prev) => ({
                ...prev,
                name: result.error || '',
            }));
        }
    };

    // Mark field as touched on blur
    const handleBlur = (field: string) => {
        setTouched((prev) => ({ ...prev, [field]: true }));

        // Validate on blur
        switch (field) {
            case 'cardNumber':
                const numberResult = validateCardNumber(cardNumber);
                setErrors((prev) => ({ ...prev, cardNumber: numberResult.error || '' }));
                break;
            case 'expiry':
                const expiryResult = validateExpiry(expiryDate);
                setErrors((prev) => ({ ...prev, expiry: expiryResult.error || '' }));
                break;
            case 'cvv':
                const cvvResult = validateCVV(cvv, cardType);
                setErrors((prev) => ({ ...prev, cvv: cvvResult.error || '' }));
                break;
            case 'name':
                const nameResult = validateCardholderName(cardholderName);
                setErrors((prev) => ({ ...prev, name: nameResult.error || '' }));
                break;
        }
    };

    // Get validation status icon
    const getFieldStatus = (field: string, value: string) => {
        if (!touched[field]) return null;
        if (errors[field]) {
            return <AlertCircle className="h-4 w-4 text-red-500" />;
        }
        if (value) {
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        }
        return null;
    };

    return (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
            <CardContent className="pt-6 space-y-4">
                {/* Card Header with Icon */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-lg">Card Payment</span>
                    </div>
                    <div className="transition-all duration-300">
                        {cardIcons[cardType]}
                    </div>
                </div>

                {/* Processing Overlay */}
                {isProcessing && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center rounded-lg z-10">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-sm font-medium">Processing payment...</span>
                        </div>
                    </div>
                )}

                {/* Card Number */}
                <div className="space-y-2">
                    <Label htmlFor="cardNumber" className="flex items-center gap-2">
                        Card Number
                        {getFieldStatus('cardNumber', cardNumber)}
                    </Label>
                    <Input
                        id="cardNumber"
                        type="text"
                        inputMode="numeric"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        onBlur={() => handleBlur('cardNumber')}
                        disabled={disabled || isProcessing}
                        className={`font-mono text-lg tracking-wider ${errors.cardNumber && touched.cardNumber ? 'border-red-500' : ''
                            }`}
                        maxLength={cardType === 'amex' ? 17 : 19}
                        autoComplete="cc-number"
                    />
                    {errors.cardNumber && touched.cardNumber && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.cardNumber}
                        </p>
                    )}
                    {cardType !== 'unknown' && !errors.cardNumber && touched.cardNumber && (
                        <p className="text-sm text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {cardInfo.displayName} detected
                        </p>
                    )}
                </div>

                {/* Cardholder Name */}
                <div className="space-y-2">
                    <Label htmlFor="cardholderName" className="flex items-center gap-2">
                        Cardholder Name
                        {getFieldStatus('name', cardholderName)}
                    </Label>
                    <Input
                        id="cardholderName"
                        type="text"
                        placeholder="John Doe"
                        value={cardholderName}
                        onChange={handleNameChange}
                        onBlur={() => handleBlur('name')}
                        disabled={disabled || isProcessing}
                        className={errors.name && touched.name ? 'border-red-500' : ''}
                        autoComplete="cc-name"
                    />
                    {errors.name && touched.name && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.name}
                        </p>
                    )}
                </div>

                {/* Expiry and CVV Row */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Expiry Date */}
                    <div className="space-y-2">
                        <Label htmlFor="expiryDate" className="flex items-center gap-2">
                            Expiry Date
                            {getFieldStatus('expiry', expiryDate)}
                        </Label>
                        <Input
                            id="expiryDate"
                            type="text"
                            inputMode="numeric"
                            placeholder="MM/YY"
                            value={expiryDate}
                            onChange={handleExpiryChange}
                            onBlur={() => handleBlur('expiry')}
                            disabled={disabled || isProcessing}
                            className={`font-mono ${errors.expiry && touched.expiry ? 'border-red-500' : ''
                                }`}
                            maxLength={5}
                            autoComplete="cc-exp"
                        />
                        {errors.expiry && touched.expiry && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.expiry}
                            </p>
                        )}
                    </div>

                    {/* CVV */}
                    <div className="space-y-2">
                        <Label htmlFor="cvv" className="flex items-center gap-2">
                            CVV
                            {getFieldStatus('cvv', cvv)}
                        </Label>
                        <Input
                            id="cvv"
                            type="password"
                            inputMode="numeric"
                            placeholder={cardType === 'amex' ? '1234' : '123'}
                            value={cvv}
                            onChange={handleCvvChange}
                            onBlur={() => handleBlur('cvv')}
                            disabled={disabled || isProcessing}
                            className={`font-mono ${errors.cvv && touched.cvv ? 'border-red-500' : ''
                                }`}
                            maxLength={cardType === 'amex' ? 4 : 3}
                            autoComplete="cc-csc"
                        />
                        {errors.cvv && touched.cvv && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.cvv}
                            </p>
                        )}
                    </div>
                </div>

                {/* Test Card Hint */}
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                        <strong>Demo Mode:</strong> Use test card{' '}
                        <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">4111 1111 1111 1111</code>
                        {' '}(Visa) with any future expiry and any 3-digit CVV.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

export default CardPaymentForm;
