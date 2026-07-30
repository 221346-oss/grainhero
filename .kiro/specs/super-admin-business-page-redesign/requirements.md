# Requirements Document

## Introduction

This document specifies the functional and non-functional requirements for the Super Admin Business Page Redesign. The feature transforms the existing subscription analytics page into a modern, data-rich dashboard with export capabilities and pinned ticket management. All requirements are derived from the approved design document and follow the EARS (Easy Approach to Requirements Syntax) pattern.

## Glossary

- **System**: The Super Admin Business Page web application component
- **Super_Admin**: A user with super_admin role privileges
- **Analytics_Card**: A UI component displaying a single KPI metric
- **Data_Table**: A tabular display component with export capabilities
- **Pinned_Ticket**: A field ticket marked as important by a super admin
- **Export_Engine**: The subsystem responsible for generating export files
- **Chart_Component**: A visual data representation using Recharts library
- **Revenue_Analytics**: Data structure containing subscription and revenue metrics
- **Hardware_Order**: A record of IoT device purchase by a tenant
- **KPI**: Key Performance Indicator metric displayed on the dashboard
- **CSV**: Comma-Separated Values file format
- **PDF**: Portable Document Format file
- **HTML**: HyperText Markup Language formatted export

## Requirements

### Requirement 1: Page Layout and Visual Design

**User Story:** As a super admin, I want a modern analytics-style dashboard layout, so that I can quickly understand business metrics at a glance.

#### Acceptance Criteria

1. THE System SHALL render a card-based grid layout with minimal spacing
2. THE System SHALL display KPI metrics in a 4-column grid on large screens
3. THE System SHALL use responsive breakpoints for mobile and tablet views
4. THE System SHALL apply consistent spacing using 20-24px gaps between cards
5. THE System SHALL use shadcn/ui components for consistent visual styling
6. THE System SHALL eliminate excessive whitespace present in the current design

### Requirement 2: KPI Metric Display

**User Story:** As a super admin, I want to see key revenue metrics with trend indicators, so that I can monitor business health.

#### Acceptance Criteria

1. THE System SHALL display MRR (Monthly Recurring Revenue) in PKR currency format
2. THE System SHALL display ARR (Annual Recurring Revenue) in PKR currency format
3. THE System SHALL display active subscription count as an integer
4. THE System SHALL display churn rate as a percentage with one decimal place
5. WHEN a metric has increased from the previous period, THE System SHALL display a green upward trend indicator
6. WHEN a metric has decreased from the previous period, THE System SHALL display a red downward trend indicator
7. THE System SHALL format large currency values with comma separators

### Requirement 3: Data Fetching and State Management

**User Story:** As a super admin, I want real-time data updates with proper loading states, so that I always see current business metrics.

#### Acceptance Criteria

1. THE System SHALL fetch revenue analytics data using TanStack Query
2. THE System SHALL cache revenue data for 60 seconds
3. THE System SHALL cache pinned tickets data for 30 seconds
4. WHEN data is loading, THE System SHALL display skeleton loading states
5. WHEN data fetch fails, THE System SHALL display an error toast notification
6. THE System SHALL provide a manual refresh button to reload data
7. WHEN an error occurs, THE System SHALL auto-retry the request after 10 seconds

### Requirement 4: Chart Visualizations

**User Story:** As a super admin, I want visual charts showing revenue trends and plan distribution, so that I can identify patterns and opportunities.

#### Acceptance Criteria

1. THE System SHALL display a line chart showing 12 months of revenue trends
2. THE System SHALL display a bar chart showing plan distribution by MRR contribution
3. THE System SHALL use Recharts library for all chart visualizations
4. WHEN a user hovers over a chart data point, THE System SHALL display a tooltip with formatted values
5. THE System SHALL format currency values on chart axes with PKR symbol
6. THE System SHALL use emerald color for positive metrics and red for warnings
7. THE System SHALL render charts responsively for different screen sizes

### Requirement 5: Plan Breakdown Table

**User Story:** As a super admin, I want to see a detailed breakdown of subscriptions by plan, so that I can understand revenue composition.

#### Acceptance Criteria

1. THE System SHALL display a table with columns: Plan name, Subscribers, MRR, Share percentage
2. THE System SHALL calculate subscriber count proportionally from MRR per plan
3. THE System SHALL display a progress bar visualization for share percentage
4. THE System SHALL format MRR values in PKR currency with comma separators
5. THE System SHALL capitalize plan names in the display
6. WHEN no active subscriptions exist, THE System SHALL display an empty state message
7. THE System SHALL include an export button group above the table

### Requirement 6: Expiring Subscriptions Table

**User Story:** As a super admin, I want to see subscriptions expiring within 7 days, so that I can proactively address churn risk.

#### Acceptance Criteria

1. THE System SHALL display a table with columns: Plan name, Expires date
2. WHEN one or more subscriptions expire within 7 days, THE System SHALL render the expiring subscriptions table
3. WHEN no subscriptions expire within 7 days, THE System SHALL hide the expiring subscriptions table
4. THE System SHALL sort expiring subscriptions by expiration date (earliest first)
5. THE System SHALL format expiration dates in localized date format
6. THE System SHALL use amber color scheme to highlight the urgency
7. THE System SHALL include an export button group above the table

### Requirement 7: Hardware Orders Display

**User Story:** As a super admin, I want to see recent hardware orders in a table, so that I can track IoT device sales.

#### Acceptance Criteria

1. THE System SHALL display a table with columns: Order ID, Admin, Quantity, Total, Status
2. THE System SHALL exclude hardware orders with status 'cancelled' or 'pending_payment'
3. THE System SHALL format hardware total values in PKR currency
4. THE System SHALL display order status with color-coded badges
5. THE System SHALL truncate admin email addresses for display
6. THE System SHALL limit the display to the 20 most recent orders
7. THE System SHALL include an export button group above the table

### Requirement 8: CSV Export Functionality

**User Story:** As a super admin, I want to export table data as CSV files, so that I can analyze data in spreadsheet applications.

#### Acceptance Criteria

1. WHEN a super admin clicks the CSV export button, THE System SHALL generate a CSV file
2. THE System SHALL escape commas, quotes, and newlines in cell values
3. THE System SHALL include a BOM (Byte Order Mark) for Excel compatibility
4. THE System SHALL use descriptive filenames with format: `{table-name}-{date}.csv`
5. THE System SHALL trigger a browser download of the generated CSV file
6. THE System SHALL complete CSV export within 200 milliseconds
7. WHEN export fails, THE System SHALL display an error toast notification

### Requirement 9: PDF Export Functionality

**User Story:** As a super admin, I want to export table data as PDF files, so that I can share formatted reports with stakeholders.

#### Acceptance Criteria

1. WHEN a super admin clicks the PDF export button, THE System SHALL generate a PDF file
2. THE System SHALL use the pdf-lib library for PDF generation
3. THE System SHALL include a header with table title and export date
4. THE System SHALL format tables with alternating row colors for readability
5. THE System SHALL support multi-page tables for datasets exceeding one page
6. THE System SHALL format currency values with PKR symbol
7. THE System SHALL complete PDF export within 2 seconds for 100 rows
8. WHEN export fails, THE System SHALL display an error toast notification

### Requirement 10: HTML Export Functionality

**User Story:** As a super admin, I want to export table data as HTML files, so that I can embed reports in emails or web pages.

#### Acceptance Criteria

1. WHEN a super admin clicks the HTML export button, THE System SHALL generate an HTML file
2. THE System SHALL create a self-contained HTML document with inline CSS
3. THE System SHALL include a header section with table title and export date
4. THE System SHALL sanitize user-generated content to prevent XSS attacks
5. THE System SHALL format the HTML table with consistent styling
6. THE System SHALL validate filenames to prevent path traversal attacks
7. THE System SHALL complete HTML export within 300 milliseconds
8. WHEN export fails, THE System SHALL display an error toast notification

### Requirement 11: Pinned Tickets Display

**User Story:** As a super admin, I want to see pinned high-priority tickets on the business page, so that I am immediately aware of critical issues.

#### Acceptance Criteria

1. THE System SHALL display a dedicated section for pinned tickets above data tables
2. THE System SHALL fetch pinned tickets data every 30 seconds
3. THE System SHALL display ticket title, priority badge, reporter name, and created date
4. THE System SHALL limit the display to 5 most recently pinned tickets
5. WHEN a ticket has priority 'high', THE System SHALL display a red priority badge
6. WHEN a ticket has priority 'medium', THE System SHALL display an amber priority badge
7. WHEN a ticket has priority 'low', THE System SHALL display a slate priority badge
8. WHEN no tickets are pinned, THE System SHALL display an empty state message

### Requirement 12: Pin Ticket Functionality

**User Story:** As a super admin, I want to pin important tickets, so that they are highlighted on the business dashboard.

#### Acceptance Criteria

1. WHEN a super admin clicks the pin button on a ticket, THE System SHALL update the ticket's pinned status
2. THE System SHALL store the pinning user ID in the pinned_by field
3. THE System SHALL store the pinning timestamp in the pinned_at field
4. THE System SHALL verify super admin role before allowing pin operation
5. WHEN pin operation succeeds, THE System SHALL refresh the pinned tickets display
6. WHEN pin operation fails, THE System SHALL display an error toast notification
7. THE System SHALL update the UI optimistically before server confirmation

### Requirement 13: Unpin Ticket Functionality

**User Story:** As a super admin, I want to unpin tickets that are no longer critical, so that the pinned section stays relevant.

#### Acceptance Criteria

1. WHEN a super admin clicks the unpin button on a pinned ticket, THE System SHALL clear the ticket's pinned status
2. THE System SHALL set the pinned_by field to NULL
3. THE System SHALL set the pinned_at field to NULL
4. THE System SHALL verify super admin role before allowing unpin operation
5. WHEN unpin operation succeeds, THE System SHALL remove the ticket from the pinned section
6. WHEN unpin operation fails, THE System SHALL display an error toast notification
7. THE System SHALL revert optimistic UI update if server operation fails

### Requirement 14: Database Schema for Pinned Tickets

**User Story:** As a system administrator, I want the database schema to support pinned tickets, so that pin state persists across sessions.

#### Acceptance Criteria

1. THE System SHALL add a pinned_by column of type UUID to the field_tickets table
2. THE System SHALL add a pinned_at column of type TIMESTAMPTZ to the field_tickets table
3. THE System SHALL create a foreign key constraint from pinned_by to profiles(id)
4. THE System SHALL create an index on (pinned_by, pinned_at) for efficient queries
5. THE System SHALL filter pinned tickets using WHERE pinned_by IS NOT NULL
6. THE System SHALL order pinned tickets by pinned_at descending

### Requirement 15: Role-Based Access Control

**User Story:** As a security administrator, I want only super admins to access the business page and pin tickets, so that sensitive data is protected.

#### Acceptance Criteria

1. THE System SHALL verify super_admin role for all business page requests
2. THE System SHALL verify super_admin role for pinTicket server function
3. THE System SHALL verify super_admin role for unpinTicket server function
4. THE System SHALL verify super_admin role for listPinnedTickets server function
5. WHEN a non-super-admin user attempts access, THE System SHALL return a 403 Forbidden error
6. THE System SHALL use the existing resolveRole function for role verification
7. THE System SHALL log unauthorized access attempts

### Requirement 16: Performance Optimization

**User Story:** As a super admin, I want the dashboard to load quickly and remain responsive, so that I can efficiently monitor business metrics.

#### Acceptance Criteria

1. THE System SHALL load the initial page within 2 seconds
2. THE System SHALL refresh data within 500 milliseconds
3. THE System SHALL lazy load chart components until they are visible
4. THE System SHALL memoize expensive chart data transformations
5. THE System SHALL limit table rows to 20 by default to prevent DOM bloat
6. THE System SHALL defer PDF library import until export is triggered
7. THE System SHALL use TanStack Query caching to reduce redundant API calls

### Requirement 17: Error Handling and Recovery

**User Story:** As a super admin, I want clear error messages and recovery options, so that I can resolve issues quickly.

#### Acceptance Criteria

1. WHEN a data fetch fails, THE System SHALL display a toast notification with error details
2. WHEN an export operation fails, THE System SHALL display an error toast with retry option
3. WHEN a pin/unpin operation fails, THE System SHALL revert the optimistic UI update
4. THE System SHALL log all errors to the browser console for debugging
5. THE System SHALL provide a manual refresh button for data fetch errors
6. THE System SHALL auto-retry failed requests once after 10 seconds
7. WHEN an empty data set is encountered, THE System SHALL display a contextual empty state message

### Requirement 18: Export Rate Limiting

**User Story:** As a security administrator, I want export operations to be rate-limited, so that the system is protected from abuse.

#### Acceptance Criteria

1. THE System SHALL limit export operations to 5 per minute per super admin
2. WHEN rate limit is exceeded, THE System SHALL display an error toast notification
3. THE System SHALL implement rate limiting using TanStack Query throttling
4. THE System SHALL reset rate limit counters after 60 seconds
5. THE System SHALL track rate limits per user session
6. THE System SHALL log rate limit violations for security monitoring

### Requirement 19: Responsive Design

**User Story:** As a super admin using various devices, I want the dashboard to adapt to different screen sizes, so that I can access it on any device.

#### Acceptance Criteria

1. THE System SHALL use a 4-column grid for KPI cards on large screens (≥1024px)
2. THE System SHALL use a 2-column grid for KPI cards on medium screens (768-1023px)
3. THE System SHALL use a 1-column grid for KPI cards on small screens (<768px)
4. THE System SHALL make tables horizontally scrollable on small screens
5. THE System SHALL stack chart visualizations vertically on mobile devices
6. THE System SHALL maintain readable text sizes across all screen sizes
7. THE System SHALL ensure touch targets are at least 44x44 pixels on mobile

### Requirement 20: Accessibility Compliance

**User Story:** As a super admin with accessibility needs, I want the dashboard to be accessible, so that I can use assistive technologies.

#### Acceptance Criteria

1. THE System SHALL use semantic HTML elements for all components
2. THE System SHALL provide ARIA labels for all interactive elements
3. THE System SHALL ensure color contrast ratios meet WCAG AA standards
4. THE System SHALL support keyboard navigation for all interactive elements
5. THE System SHALL announce dynamic content updates to screen readers
6. THE System SHALL provide focus indicators for all focusable elements
7. THE System SHALL use descriptive text for icon-only buttons

## Validation and Testing

All requirements in this document are testable through:
- **Unit tests**: Component rendering, data transformations, export generation
- **Integration tests**: Server function calls, database operations, role verification
- **End-to-end tests**: Full user workflows including pin/unpin, export operations
- **Visual regression tests**: Layout consistency across screen sizes
- **Performance tests**: Load time measurements, export speed benchmarks
- **Security tests**: Role-based access control, XSS prevention, rate limiting

## Traceability

All requirements map directly to design components and features:
- Requirements 1-2 → Analytics Card components and KPI display
- Requirements 3-7 → Data fetching, tables, and state management
- Requirements 4 → Chart visualizations
- Requirements 8-10 → Export functionality
- Requirements 11-14 → Pinned tickets feature
- Requirement 15 → Security and access control
- Requirements 16-20 → Non-functional requirements (performance, errors, responsive, accessibility)
