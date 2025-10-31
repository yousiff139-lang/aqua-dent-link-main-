# Implementation Plan

- [ ] 1. Fix dentist profile image display issue
  - Fix the CSS object-fit issue in DentistProfile.tsx where images are duplicated or not filling the container properly
  - Replace the current img element with a properly structured container using aspect-square and absolute positioning
  - Add fallback handling for missing images
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 2. Create user dashboard sidebar navigation
  - [ ] 2.1 Create UserSidebar component with icon-based navigation
    - Implement sidebar component matching admin design (80px width, gradient background)
    - Add navigation items: Dashboard, My Appointments, AI Assistant, Medical Records, Profile Settings
    - Implement active state styling with gradient and shadow effects
    - Add hover tooltips for each navigation icon
    - Include sign out button at bottom of sidebar
    - _Requirements: 1.1, 1.3, 1.4_
  
  - [ ] 2.2 Create UserDashboardLayout wrapper component
    - Build layout component that wraps dashboard pages with UserSidebar
    - Implement flex layout with sidebar and main content area
    - Add proper overflow handling for scrollable content
    - Match admin DashboardLayout structure
    - _Requirements: 1.1, 1.3_

- [ ] 3. Redesign user dashboard to use new layout
  - [ ] 3.1 Refactor Dashboard.tsx to use UserDashboardLayout
    - Remove Navbar and Footer components from Dashboard page
    - Wrap dashboard content in UserDashboardLayout component
    - Adjust padding and spacing for sidebar layout
    - Update navigation handlers to work with sidebar
    - _Requirements: 1.1, 1.2, 1.5_
  
  - [ ] 3.2 Reorganize dashboard content sections
    - Keep existing stats cards (Total Appointments, Upcoming, Completed)
    - Maintain appointments list with current functionality
    - Update quick actions to integrate with sidebar navigation
    - Preserve AI assistant chat functionality
    - _Requirements: 1.2, 1.5_

- [ ] 4. Create services page and routing
  - [ ] 4.1 Create Services landing page component
    - Build hero section with title and description
    - Create grid layout for four service cards (General Checkups, Teeth Cleaning, Cavity Treatment, Cosmetic Dentistry)
    - Add navigation links to individual service detail pages
    - Include Navbar and Footer components
    - Style cards with hover effects and gradients matching site theme
    - _Requirements: 3.1, 3.5_
  
  - [ ] 4.2 Create ServiceDetail page component
    - Implement dynamic routing with service ID parameter
    - Create service data model with all required fields (overview, benefits, procedure, FAQs)
    - Build detailed service content sections (overview, what to expect, benefits, procedure, FAQs)
    - Add CTA button to book appointment
    - Include breadcrumb navigation back to services page
    - Handle invalid service IDs with redirect to services page
    - _Requirements: 3.1, 3.3_
  
  - [ ] 4.3 Add service content data
    - Create detailed content for General Checkups service
    - Create detailed content for Teeth Cleaning service
    - Create detailed content for Cavity Treatment service
    - Create detailed content for Cosmetic Dentistry service
    - Include duration, benefits, procedure steps, and FAQs for each service
    - _Requirements: 3.1, 3.3_

- [ ] 5. Update footer with service links
  - Modify Footer.tsx to convert static service text to Link components
  - Add routing to /services/:serviceId for each service
  - Maintain existing footer styling and layout
  - Test navigation from footer to service pages
  - _Requirements: 3.2, 3.4_

- [ ] 6. Add service routes to application
  - Update App.tsx to include /services route for Services page
  - Add /services/:serviceId route for ServiceDetail page
  - Ensure routes are positioned correctly in route hierarchy
  - Verify routing works with existing navigation
  - _Requirements: 3.2, 3.5_
