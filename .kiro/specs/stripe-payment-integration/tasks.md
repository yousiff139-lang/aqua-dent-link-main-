# Implementation Plan

- [ ] 1. Install Stripe dependencies and configure environment
  - Install `stripe` package in backend and `@stripe/stripe-js` and `@stripe/react-stripe-js` in frontend
  - Add Stripe environment variables to backend `.env` file (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_CONNECT_CLIENT_ID)
  - Create Stripe client initialization in backend config
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Create database schema for payment system
  - [ ] 2.1 Create migration file for payment tables
    - Write SQL migration to create `stripe_accounts`, `payment_configurations`, `payment_transactions`, and `payment_methods` tables
    - Add appropriate indexes for performance optimization
    - _Requirements: 1.3, 2.3, 3.4, 5.2_
  
  - [ ] 2.2 Implement Row Level Security policies
    - Create RLS policies for stripe_accounts table (users can only access their own accounts)
    - Create RLS policies for payment_configurations table (dentists can only access their own config)
    - Create RLS policies for payment_transactions table (users can view their own transactions, admins can view all)
    - Create RLS policies for payment_methods table (dentists can only access their own methods)
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 3. Implement backend payment service layer
  - [ ] 3.1 Create PaymentService class with Stripe Connect methods
    - Implement `createConnectAccount` method to create Stripe Connect accounts for patients
    - Implement `createOnboardingLink` method to generate Stripe Connect onboarding URLs
    - Implement `getAccountStatus` method to retrieve account verification status
    - Implement `disconnectAccount` method to remove Stripe account connection
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 3.2 Implement payment configuration methods
    - Implement `getPaymentConfig` method to retrieve dentist payment settings
    - Implement `updatePaymentConfig` method to save payment amounts
    - Add validation for positive payment amounts
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 3.3 Implement payment method management
    - Implement `addPaymentMethod` method to attach payment methods to dentist Stripe customer
    - Implement `listPaymentMethods` method to retrieve saved payment methods
    - Implement `removePaymentMethod` method to detach payment methods
    - Implement `setDefaultPaymentMethod` method to update default payment method
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 3.4 Implement payment processing methods
    - Implement `processPayment` method to orchestrate payment flow during booking
    - Implement `createPaymentIntent` method to create Stripe payment intents
    - Implement `confirmPayment` method to confirm and execute payments
    - Add logic to transfer funds to patient connected account
    - Handle payment failures and store failure reasons
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 3.5 Implement transaction query methods
    - Implement `getTransaction` method to retrieve transaction details
    - Implement `listTransactions` method with filtering by status, date range, and user
    - Add pagination support for transaction lists
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3_

- [ ] 4. Create backend API endpoints
  - [ ] 4.1 Implement Stripe Connect endpoints
    - Create POST `/api/payments/connect/onboarding` endpoint to generate onboarding links
    - Create GET `/api/payments/connect/status` endpoint to check account status
    - Create DELETE `/api/payments/connect/disconnect` endpoint to remove connection
    - Add authentication middleware to verify user identity
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 4.2 Implement payment configuration endpoints
    - Create GET `/api/payments/config` endpoint to retrieve dentist payment settings
    - Create PUT `/api/payments/config` endpoint to update payment amounts
    - Add role-based authorization to ensure only dentists can access
    - Add input validation for payment amounts
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 4.3 Implement payment method endpoints
    - Create POST `/api/payments/methods` endpoint to add payment methods
    - Create GET `/api/payments/methods` endpoint to list payment methods
    - Create DELETE `/api/payments/methods/:id` endpoint to remove payment methods
    - Create PUT `/api/payments/methods/:id/default` endpoint to set default method
    - Add dentist role verification
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 4.4 Implement transaction endpoints
    - Create GET `/api/payments/transactions` endpoint with filtering and pagination
    - Create GET `/api/payments/transactions/:id` endpoint for transaction details
    - Add role-based filtering (patients see their transactions, dentists see theirs, admins see all)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3_
  
  - [ ] 4.5 Implement receipt generation endpoint
    - Create GET `/api/payments/transactions/:id/receipt` endpoint to generate PDF receipts
    - Use a PDF generation library to create formatted receipts
    - Include transaction details, patient/dentist info, and Stripe transaction ID
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 5. Implement Stripe webhook handler
  - [ ] 5.1 Create webhook endpoint and signature verification
    - Create POST `/api/payments/webhooks/stripe` endpoint
    - Implement webhook signature verification using Stripe webhook secret
    - Add error handling for invalid signatures
    - _Requirements: 3.4, 3.5_
  
  - [ ] 5.2 Handle payment-related webhook events
    - Handle `payment_intent.succeeded` event to update transaction status
    - Handle `payment_intent.payment_failed` event to mark transactions as failed
    - Handle `account.updated` event to update Stripe account status
    - Handle `payment_method.attached` and `payment_method.detached` events
    - Implement idempotency to prevent duplicate processing
    - _Requirements: 3.4, 3.5, 7.1, 7.2_

- [ ] 6. Integrate payment processing into booking flow
  - [ ] 6.1 Update booking API to include payment processing
    - Modify booking creation endpoint to check for patient Stripe account
    - Add payment processing step after booking confirmation
    - Handle case where patient doesn't have Stripe account connected
    - Update booking record with payment transaction ID
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 6.2 Add payment validation to booking flow
    - Verify dentist has payment configuration set up
    - Verify dentist has valid payment method
    - Return appropriate error messages if payment prerequisites are not met
    - _Requirements: 3.3, 3.5_

- [ ] 7. Implement notification system for payments
  - [ ] 7.1 Create NotificationService for payment events
    - Implement `sendPaymentSuccessNotification` method for successful payments
    - Implement `sendPaymentFailureNotification` method for failed payments
    - Implement `sendReceiptEmail` method to email receipts
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.5_
  
  - [ ] 7.2 Integrate notifications into payment flow
    - Trigger success notification when payment completes
    - Trigger failure notification when payment fails
    - Send receipt email to dentist after successful payment
    - Add in-app notification badges for pending payments
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8. Build frontend Stripe Connect components
  - [ ] 8.1 Create StripeConnectButton component
    - Build button component to initiate Stripe Connect onboarding
    - Call backend API to generate onboarding link
    - Redirect user to Stripe onboarding flow
    - Handle return from Stripe and refresh account status
    - _Requirements: 1.1, 1.2_
  
  - [ ] 8.2 Create StripeAccountStatus component
    - Display current Stripe account connection status
    - Show verification status (charges enabled, payouts enabled)
    - Provide option to disconnect account
    - Show loading states during API calls
    - _Requirements: 1.5_

- [ ] 9. Build frontend payment configuration components
  - [ ] 9.1 Create PaymentConfigForm component for dentists
    - Build form to set default payment amount
    - Add fields for custom amounts per appointment type
    - Implement form validation for positive amounts
    - Call backend API to save configuration
    - Display success/error messages
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 9.2 Create PaymentMethodManager component
    - Display list of saved payment methods with masked details
    - Integrate Stripe Elements to add new payment methods
    - Implement remove payment method functionality
    - Implement set default payment method functionality
    - Show loading and error states
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 10. Build frontend transaction history components
  - [ ] 10.1 Create PaymentHistory component for patients
    - Display list of payment transactions with date, amount, dentist, and status
    - Implement filtering by date range and status
    - Add pagination controls
    - Show transaction details modal on row click
    - Display total amount received
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ] 10.2 Create PaymentReceipts component for dentists
    - Display list of payment receipts
    - Implement download receipt functionality
    - Show receipt details including transaction ID
    - Add filtering and search capabilities
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 10.3 Create PaymentDashboard component for admins
    - Display all payment transactions across platform
    - Implement advanced filtering (status, date, patient, dentist)
    - Add export to CSV functionality
    - Show payment failure reasons
    - Display transaction details with Stripe metadata
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 11. Update booking flow UI to handle payments
  - [ ] 11.1 Add payment prerequisite checks to booking UI
    - Check if patient has Stripe account before allowing booking
    - Show prompt to connect Stripe account if not connected
    - Display payment amount patient will receive during booking
    - _Requirements: 3.3_
  
  - [ ] 11.2 Add payment confirmation to booking success
    - Display payment confirmation message after successful booking
    - Show payment amount and expected payout timeline
    - Provide link to view transaction details
    - _Requirements: 3.4, 7.1_

- [ ] 12. Implement notification UI components
  - [ ] 12.1 Create payment notification components
    - Build notification toast for successful payments
    - Build notification toast for failed payments
    - Add notification badge for pending payments
    - Integrate with existing notification system
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 13. Add payment settings pages to user dashboards
  - [ ] 13.1 Create payment settings page for patients
    - Add navigation link to payment settings in patient dashboard
    - Include StripeAccountStatus component
    - Include StripeConnectButton component
    - Include PaymentHistory component
    - _Requirements: 1.1, 1.5, 4.1_
  
  - [ ] 13.2 Create payment settings page for dentists
    - Add navigation link to payment settings in dentist dashboard
    - Include PaymentConfigForm component
    - Include PaymentMethodManager component
    - Include PaymentReceipts component
    - _Requirements: 2.1, 5.1, 8.1_
  
  - [ ] 13.3 Add payment dashboard to admin interface
    - Add navigation link to payment dashboard in admin interface
    - Include PaymentDashboard component
    - Add summary statistics (total transactions, success rate, total volume)
    - _Requirements: 6.1_

- [ ] 14. Write integration tests for payment flow
  - Create test suite for complete booking with payment flow
  - Test payment failure scenarios and error handling
  - Test Stripe Connect onboarding flow
  - Test webhook event processing
  - Mock Stripe API calls for testing
  - _Requirements: All requirements_

- [ ] 15. Configure Stripe webhook in production
  - Register webhook endpoint URL in Stripe Dashboard
  - Configure webhook to listen for relevant events (payment_intent.succeeded, payment_intent.payment_failed, account.updated)
  - Test webhook delivery with Stripe CLI
  - Set up monitoring and alerts for webhook failures
  - _Requirements: 3.4, 3.5_
