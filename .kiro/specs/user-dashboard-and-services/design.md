# Design Document

## Overview

This design document outlines the implementation approach for three key enhancements to the DentalCare Connect application:

1. **User Dashboard Redesign**: Transform the current user dashboard to match the admin dashboard's professional left sidebar layout with icon-based navigation
2. **Dentist Profile Image Fix**: Correct the CSS object-fit issue causing profile images to appear duplicated or improperly sized
3. **Services Page Creation**: Build a comprehensive services page with detailed information about dental services, accessible from footer links

## Architecture

### Component Structure

```
src/
├── components/
│   ├── UserSidebar.tsx          (NEW - Left sidebar for user dashboard)
│   ├── UserDashboardLayout.tsx  (NEW - Layout wrapper with sidebar)
│   └── Footer.tsx               (MODIFIED - Add routing to services)
├── pages/
│   ├── Dashboard.tsx            (MODIFIED - Use new layout)
│   ├── DentistProfile.tsx       (MODIFIED - Fix image CSS)
│   ├── Services.tsx             (NEW - Services landing page)
│   └── ServiceDetail.tsx        (NEW - Individual service details)
└── App.tsx                      (MODIFIED - Add services routes)
```

### Design Patterns

- **Layout Component Pattern**: Reuse the admin's DashboardLayout pattern for consistency
- **Icon-Based Navigation**: Implement tooltip-enabled icon navigation matching admin sidebar
- **Responsive Design**: Maintain mobile-first approach with collapsible sidebar
- **Route-Based Navigation**: Use React Router for service detail pages

## Components and Interfaces

### 1. UserSidebar Component

**Purpose**: Provide icon-based navigation for authenticated patients

**Props**:
```typescript
interface UserSidebarProps {
  // No props needed - uses auth context internally
}
```

**Navigation Items**:
- Dashboard (Home icon)
- My Appointments (Calendar icon)
- AI Assistant (MessageSquare icon)
- Medical Records (FileText icon)
- Profile Settings (User icon)
- Sign Out (LogOut icon)

**Styling**:
- Width: 80px (w-20)
- Background: Gradient from blue-50 to white
- Active state: Gradient from primary to accent with shadow
- Hover tooltips on right side
- Matches admin sidebar visual design

### 2. UserDashboardLayout Component

**Purpose**: Wrap dashboard pages with sidebar navigation

**Props**:
```typescript
interface UserDashboardLayoutProps {
  children: ReactNode;
}
```

**Structure**:
```tsx
<div className="flex h-screen">
  <UserSidebar />
  <main className="flex-1 overflow-auto">
    <div className="p-8">{children}</div>
  </main>
</div>
```

### 3. Services Page

**Purpose**: Display all dental services with navigation to detail pages

**Structure**:
- Hero section with title and description
- Grid of service cards (4 services)
- Each card links to detailed service page
- Includes Navbar and Footer

**Services**:
1. General Checkups
2. Teeth Cleaning
3. Cavity Treatment
4. Cosmetic Dentistry

### 4. ServiceDetail Page

**Purpose**: Show comprehensive information about a specific service

**Route Pattern**: `/services/:serviceId`

**Content Structure**:
- Service title and hero image
- Overview section
- What to expect section
- Benefits list
- Procedure details
- FAQ section
- CTA to book appointment

**Service Data Model**:
```typescript
interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  overview: string;
  whatToExpect: string[];
  benefits: string[];
  procedure: string[];
  faqs: { question: string; answer: string }[];
  duration: string;
  price: string;
}
```

## Data Models

### Service Content

**General Checkups**:
- Overview: Comprehensive oral examination and preventive care
- Duration: 30-45 minutes
- Includes: Visual examination, X-rays, cleaning, oral cancer screening
- Benefits: Early detection, prevention, professional advice

**Teeth Cleaning**:
- Overview: Professional removal of plaque and tartar
- Duration: 45-60 minutes
- Includes: Scaling, polishing, fluoride treatment
- Benefits: Prevents cavities, freshens breath, removes stains

**Cavity Treatment**:
- Overview: Restoration of teeth damaged by decay
- Duration: 30-90 minutes (depending on severity)
- Includes: Examination, numbing, removal of decay, filling
- Benefits: Stops decay progression, restores function, prevents pain

**Cosmetic Dentistry**:
- Overview: Aesthetic improvements to smile appearance
- Duration: Varies by procedure
- Includes: Whitening, veneers, bonding, contouring
- Benefits: Enhanced confidence, improved appearance, modern techniques

## Error Handling

### Image Loading
- Implement fallback placeholder for missing dentist images
- Use onError handler to catch failed image loads
- Display default avatar if image fails

### Navigation
- 404 handling for invalid service routes
- Redirect to services page if service ID not found
- Breadcrumb navigation for easy back navigation

### Authentication
- Protect dashboard routes with ProtectedRoute wrapper
- Redirect unauthenticated users to /auth
- Maintain auth state across page refreshes

## Testing Strategy

### Component Testing
- UserSidebar: Test navigation item rendering and active states
- UserDashboardLayout: Verify children render correctly
- Services page: Test service card links
- ServiceDetail: Test dynamic route parameters

### Visual Testing
- Verify dentist profile image object-fit correction
- Confirm sidebar matches admin design
- Test responsive behavior on mobile devices
- Validate tooltip positioning and visibility

### Integration Testing
- Test navigation flow from footer to services
- Verify service detail page routing
- Test dashboard layout with different content
- Confirm authentication redirects work correctly

### User Acceptance Testing
- Patient can navigate dashboard using sidebar icons
- Dentist images display correctly without duplication
- Service links in footer navigate to correct pages
- Service detail pages display complete information
- Booking CTA buttons work from service pages

## Implementation Notes

### CSS Fix for Dentist Profile Image

Current issue in `DentistProfile.tsx`:
```tsx
<img src={dentist.image} alt={dentist.name} className="w-full h-80 object-cover" />
```

The image container needs proper aspect ratio and object-fit:
```tsx
<div className="relative w-full aspect-square overflow-hidden">
  <img 
    src={dentist.image} 
    alt={dentist.name} 
    className="absolute inset-0 w-full h-full object-cover"
  />
</div>
```

### Footer Modifications

Convert static service list items to Link components:
```tsx
<Link to="/services/general-checkups" className="hover:text-primary transition-smooth">
  General Checkup
</Link>
```

### Dashboard Layout Migration

Replace current Dashboard page structure:
- Remove Navbar (sidebar provides navigation)
- Remove Footer (not needed in dashboard view)
- Wrap content in UserDashboardLayout
- Adjust spacing and padding for sidebar layout
- Keep existing appointment and stats functionality

### Routing Updates

Add new routes to `App.tsx`:
```tsx
<Route path="/services" element={<Services />} />
<Route path="/services/:serviceId" element={<ServiceDetail />} />
```

## Accessibility Considerations

- Sidebar icons include aria-labels and tooltips
- Service cards have descriptive alt text
- Keyboard navigation support for sidebar
- Focus indicators on interactive elements
- Semantic HTML structure throughout
- Color contrast meets WCAG AA standards

## Performance Considerations

- Lazy load service detail pages
- Optimize dentist profile images with proper sizing
- Use React.memo for sidebar component
- Implement route-based code splitting
- Cache service content data
- Minimize re-renders in dashboard layout

## Mobile Responsiveness

- Sidebar collapses to hamburger menu on mobile
- Service cards stack vertically on small screens
- Dashboard stats grid adjusts to single column
- Touch-friendly button sizes (minimum 44x44px)
- Responsive typography scaling
- Mobile-optimized image sizes
