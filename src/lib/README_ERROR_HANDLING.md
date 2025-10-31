# Error Handling Implementation Guide

This document describes the comprehensive error handling system implemented for the admin dashboard.

## Overview

The error handling system provides:
- **Automatic retry with exponential backoff** for network errors
- **User-friendly error messages** for all error types
- **Network status detection** and visual indicators
- **Toast notifications** for all success/error scenarios
- **Loading indicators** for all async operations
- **Retry mechanisms** for failed data fetches

## Core Components

### 1. Error Handling Utilities (`src/lib/error-handling.ts`)

#### `isNetworkError(error)`
Detects if an error is network-related by checking:
- Error messages containing network keywords
- Browser's `navigator.onLine` status
- Common network error codes

#### `getUserFriendlyErrorMessage(error, context)`
Converts technical errors into user-friendly messages:
- Network errors → "No internet connection..."
- Auth errors → "Your session has expired..."
- Permission errors → "You don't have permission..."
- Database errors → "This action conflicts with existing data..."
- Timeout errors → "The request took too long..."

#### `retryWithBackoff(fn, config)`
Retries failed operations with exponential backoff:
- Default: 3 attempts with 1s initial delay
- Exponential backoff: 1s → 2s → 4s
- Max delay: 10 seconds
- Smart retry logic: only retries network/timeout errors

#### `withErrorHandling(fn, options)`
Wraps async functions with comprehensive error handling:
```typescript
const data = await withErrorHandling(
  async () => {
    // Your async operation
  },
  {
    context: 'loading data',
    retry: true, // Enable retry with backoff
    onError: (error) => {
      // Custom error handler
    }
  }
);
```

### 2. Network Status Indicator (`src/components/NetworkStatusIndicator.tsx`)

Visual component that:
- Shows when user goes offline
- Shows "Connection restored" when back online
- Auto-hides after 3 seconds when reconnected
- Fixed position at top of screen
- Uses browser's online/offline events

### 3. Enhanced Query Functions (`src/lib/admin-queries.ts`)

All query functions now use `withErrorHandling`:
- `fetchAllDentists()` - Retry enabled
- `fetchDentistAppointments()` - Retry enabled
- `fetchDentistAvailability()` - Retry enabled
- `addAvailability()` - No retry (validation errors)
- `updateAvailability()` - No retry (validation errors)
- `deleteAvailability()` - No retry

## Error Handling by Component

### Admin Dashboard (`src/pages/Admin.tsx`)

**Features:**
- Network status indicator at top
- Loading state with spinner
- Error state with retry button
- User-friendly error messages
- Toast notifications for all errors

**Error Scenarios:**
1. Network error → Shows connection error message
2. Permission error → Redirects to home
3. Data fetch error → Shows error state with retry

### Availability Manager (`src/components/admin/AvailabilityManager.tsx`)

**Features:**
- Loading indicators for all operations
- Toast notifications for success/error
- Validation error messages
- Retry button in error state

**Error Scenarios:**
1. Load error → Shows error with retry
2. Add slot error → Toast with specific message
3. Update error → Toast with specific message
4. Delete error → Toast with specific message
5. Validation error → Toast with validation message

### Patient List (`src/components/admin/PatientList.tsx`)

**Features:**
- Loading skeleton
- Error state with retry button
- Empty state when no data
- User-friendly error messages

**Error Scenarios:**
1. Load error → Shows error state with retry
2. Network error → Shows connection error

### Dentist Details (`src/components/admin/DentistDetails.tsx`)

**Features:**
- Loading skeleton
- Error state with retry button
- User-friendly error messages

**Error Scenarios:**
1. Stats load error → Shows error state with retry
2. Network error → Shows connection error

### Authentication (`src/pages/Auth.tsx`)

**Features:**
- Network status indicator
- Comprehensive error messages
- Network error detection
- User-friendly error messages

**Error Scenarios:**
1. Network error → "No internet connection..."
2. Invalid credentials → "Invalid email or password..."
3. Email not verified → "Please check your email..."
4. Expired link → "Your verification link has expired..."
5. Generic errors → User-friendly message from utility

## Toast Notification Standards

### Success Messages
- Duration: 3 seconds
- Variant: default (green)
- Examples:
  - "Availability slot added successfully"
  - "Availability enabled"
  - "Connection restored"

### Error Messages
- Duration: 5-8 seconds (longer for important errors)
- Variant: destructive (red)
- Examples:
  - "No internet connection. Please check your network..."
  - "Failed to load dentists. Please try again."
  - "End time must be after start time"

### Validation Errors
- Duration: 4 seconds
- Variant: destructive (red)
- Examples:
  - "Please fill in all fields"
  - "End time must be after start time"
  - "This time slot overlaps with an existing slot"

## Best Practices

### 1. Always Use Error Handling Wrapper
```typescript
// ✅ Good
const data = await withErrorHandling(
  async () => supabase.from('table').select(),
  { context: 'loading data', retry: true }
);

// ❌ Bad
try {
  const { data } = await supabase.from('table').select();
} catch (error) {
  console.error(error);
}
```

### 2. Show Loading States
```typescript
// ✅ Good
const [isLoading, setIsLoading] = useState(false);

const loadData = async () => {
  setIsLoading(true);
  try {
    // Load data
  } finally {
    setIsLoading(false);
  }
};

if (isLoading) return <Skeleton />;
```

### 3. Provide Retry Mechanisms
```typescript
// ✅ Good
if (error) {
  return (
    <ErrorState 
      error={error} 
      onRetry={loadData} 
    />
  );
}
```

### 4. Use User-Friendly Messages
```typescript
// ✅ Good
const errorMessage = getUserFriendlyErrorMessage(error, 'loading data');
toast({ description: errorMessage });

// ❌ Bad
toast({ description: error.toString() });
```

### 5. Handle Network Errors Specially
```typescript
// ✅ Good
if (isNetworkError(error)) {
  toast({
    title: "Connection Error",
    description: "No internet connection...",
    duration: 8000
  });
}
```

## Testing Error Scenarios

### Simulate Network Error
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Try any operation
4. Should see network error message and retry option

### Simulate Slow Network
1. Open DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Try loading data
4. Should see loading indicators and eventual success/retry

### Simulate Validation Error
1. Try adding availability slot with end time before start time
2. Should see validation error toast
3. Should not make API call

### Simulate Permission Error
1. Try accessing admin dashboard as non-admin
2. Should redirect to home
3. Should show "Access Denied" toast

## Future Enhancements

1. **Error Logging Service**
   - Send errors to logging service (e.g., Sentry)
   - Track error frequency and patterns

2. **Offline Mode**
   - Cache data for offline viewing
   - Queue operations when offline
   - Sync when back online

3. **Rate Limiting**
   - Detect rate limit errors
   - Show appropriate message
   - Implement backoff strategy

4. **Error Analytics**
   - Track which errors occur most
   - Identify problematic operations
   - Improve based on data
