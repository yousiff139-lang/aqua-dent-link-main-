# Implementation Plan

- [x] 1. Set up Dentist Portal project structure


  - Create new dentist-portal directory with Vite + React + TypeScript
  - Configure Vite to run on port 5173
  - Set up TailwindCSS and PostCSS configuration
  - Install required dependencies (react-router-dom, axios, lucide-react, etc.)
  - Create base folder structure (components, pages, services, hooks, contexts, types, utils)
  - Configure path aliases in tsconfig.json and vite.config.ts
  - Create .env file with VITE_API_URL variable
  - _Requirements: 8.1_



- [ ] 2. Implement TypeScript type definitions
  - Create dentist.types.ts with Dentist interface
  - Create appointment.types.ts with Appointment and AppointmentFilters interfaces
  - Create auth.types.ts with AuthSession and AuthContextType interfaces


  - Create availability.types.ts with AvailabilitySlot interface
  - _Requirements: 2.1, 4.3, 5.1_



- [ ] 3. Create utility functions and helpers
  - Implement storage.ts with localStorage helper functions (getAuthSession, setAuthSession, clearAuthSession)
  - Implement date.ts with date formatting utilities
  - _Requirements: 1.5, 7.3_

- [ ] 4. Set up API service layer
  - Create api.ts with configured Axios instance
  - Add request interceptor to attach JWT token to headers


  - Add response interceptor to handle 401 errors and redirect to login
  - Implement auth.service.ts with login and validateSession methods
  - Implement dentist.service.ts with getByEmail and getPatients methods
  - Implement appointment.service.ts with updateStatus method
  - Implement availability.service.ts with getByDentistId and updateSlots methods


  - _Requirements: 1.2, 1.3, 2.2, 4.2, 5.2, 3.3_

- [ ] 5. Implement authentication context and hooks
  - Create AuthContext.tsx with authentication state management
  - Implement login, logout, and session validation logic
  - Create useAuth.ts hook to consume AuthContext
  - Handle token storage and retrieval from localStorage


  - _Requirements: 1.5, 7.2, 7.3_

- [ ] 6. Build Login page
  - Create Login.tsx page component
  - Implement email input field with validation
  - Add submit button with loading state


  - Display error messages for failed login attempts
  - Redirect to dashboard on successful authentication
  - Style with TailwindCSS for clean modern design
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.2, 8.3_

- [ ] 7. Implement protected route component
  - Create ProtectedRoute.tsx component


  - Check authentication status from AuthContext
  - Redirect to /login if user is not authenticated
  - Validate session on component mount
  - Render child routes if authenticated
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 8. Create dashboard layout components



  - Implement DashboardLayout.tsx with responsive container
  - Create Sidebar.tsx with navigation links (Profile, Available Times, Patients)
  - Add active route highlighting to sidebar
  - Implement logout button in sidebar
  - Add mobile menu toggle functionality
  - Style with TailwindCSS for responsive design
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.4_




- [ ] 9. Set up routing structure
  - Configure React Router in App.tsx
  - Define /login route for Login page
  - Create protected routes wrapped with ProtectedRoute component
  - Set up nested routes under DashboardLayout (/profile, /availability, /patients)
  - Add redirect from / to /profile for authenticated users
  - Add 404 NotFound route
  - _Requirements: 6.1, 7.1_




- [ ] 10. Implement Profile section
  - Create useDentist.ts hook to fetch dentist data
  - Create ProfileCard.tsx component to display dentist information
  - Display profile photo, name, specialization, email, and additional metadata
  - Add loading skeleton while fetching data
  - Handle and display error messages if fetch fails
  - Create Profile.tsx page that uses ProfileCard component
  - Style with TailwindCSS cards and typography
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 8.5_

- [ ] 11. Implement Available Times section
  - Create useAvailability.ts hook to fetch and manage availability data
  - Create AvailabilityList.tsx component to display time slots
  - Create TimeSlotEditor.tsx component for editing availability
  - Implement date picker and time range selector
  - Add validation for time conflicts


  - Display slots in chronological order with clear date/time formatting
  - Handle save and cancel actions
  - Create AvailableTimes.tsx page that integrates components
  - Add loading states and error handling
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.5_

- [ ] 12. Implement Patient List section
  - Create usePatients.ts hook to fetch appointments data
  - Create AppointmentCard.tsx component for individual appointments
  - Display patient name, appointment time, and status badge
  - Add "Mark as Completed" button for pending appointments
  - Implement visual distinction between pending and completed appointments
  - Create PatientList.tsx component with filters and sorting
  - Sort appointments chronologically
  - Add search functionality by patient name
  - Create Patients.tsx page that uses PatientList component
  - Handle optimistic updates when marking appointments complete
  - Display success/error toast notifications
  - Add loading states and error handling
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 8.5_

- [ ] 13. Add backend endpoints for dentist portal
  - Create dentist.routes.ts in backend with new routes
  - Implement POST /api/auth/dentist/login endpoint to validate email and generate JWT
  - Implement GET /api/dentists/:email endpoint to fetch dentist profile
  - Implement GET /api/dentists/:email/patients endpoint to fetch appointments with patient details
  - Create dentist.service.ts in backend with business logic
  - Create dentist.repository.ts for database queries
  - Add JWT authentication middleware for protected endpoints
  - Update backend routes index to include dentist routes
  - _Requirements: 1.2, 2.2, 4.2_

- [ ] 14. Add error boundary and global error handling
  - Create ErrorBoundary.tsx component to catch React errors
  - Create ErrorPage.tsx for displaying error states
  - Wrap App component with ErrorBoundary
  - Add toast notification system for API errors
  - _Requirements: 1.4, 2.4, 5.4_

- [ ] 15. Implement responsive design enhancements
  - Test and refine mobile layouts for all pages
  - Ensure sidebar collapses properly on mobile
  - Convert tables to card layouts on small screens
  - Verify touch-friendly button sizes (min 44px)
  - Test on multiple screen sizes and devices
  - _Requirements: 6.4, 8.4_

- [ ] 16. Add loading states and skeletons
  - Create skeleton components for profile, availability, and patient list
  - Implement loading spinners for buttons during async operations
  - Add progress indicators for data fetching
  - _Requirements: 8.5_

- [ ] 17. Implement form validation
  - Add Zod schemas for email validation on login
  - Add validation for time slot editor
  - Display inline validation errors
  - Implement real-time validation feedback
  - _Requirements: 1.1, 3.3_

- [ ] 18. Add UI polish and accessibility
  - Ensure consistent spacing and typography across all pages
  - Add hover states to interactive elements
  - Implement keyboard navigation support
  - Add ARIA labels for screen readers
  - Test color contrast for accessibility
  - _Requirements: 8.2, 8.3_
