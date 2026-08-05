# Implementation Plan: Super Admin Business Page Redesign

## Overview

This plan transforms the existing `/platform/business` page into a modern analytics dashboard with export capabilities and pinned ticket management. The implementation follows a component-based architecture using TypeScript, TanStack Start, and shadcn/ui components. The work is organized into discrete, incremental steps that build upon each other, with property-based tests and unit tests integrated throughout.

## Tasks

- [-] 1. Set up core types and database schema extensions
  - Create TypeScript interfaces for RevenueAnalytics, HardwareOrders, PinnedTickets, ExportData
  - Define AnalyticsCardProps, DataTableProps, ExportButtonGroupProps interfaces
  - Create SQL migration file for pinned tickets schema (pinned_by, pinned_at columns)
  - Define type guards and validators using Zod schemas
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ] 2. Implement server functions for pinned tickets
  - [~] 2.1 Create pinTicket server function
    - Implement POST endpoint with UUID validation
    - Add super_admin role verification
    - Update field_tickets table with pinned_by and pinned_at
    - Return success/error response
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 15.2_
  
  - [ ]* 2.2 Write property test for pinTicket
    - **Property 27: Pin Operation User ID Storage**
    - **Validates: Requirements 12.2**
  
  - [ ]* 2.3 Write property test for pinTicket timestamp
    - **Property 28: Pin Operation Timestamp Storage**
    - **Validates: Requirements 12.3**
  
  - [~] 2.4 Create unpinTicket server function
    - Implement POST endpoint with UUID validation
    - Add super_admin role verification
    - Clear pinned_by and pinned_at fields to NULL
    - Return success/error response
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 15.3_
  
  - [ ]* 2.5 Write property test for unpinTicket
    - **Property 29: Unpin Operation Field Clearing**
    - **Validates: Requirements 13.1, 13.2, 13.3**
  
  - [~] 2.6 Create listPinnedTickets server function
    - Implement GET endpoint with super_admin verification
    - Query field_tickets WHERE pinned_by IS NOT NULL
    - Order by pinned_at DESC, limit 5
    - Return enriched ticket data with admin info
    - _Requirements: 11.2, 11.4, 15.4_

- [~] 3. Checkpoint - Ensure server functions work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Build reusable UI components
  - [~] 4.1 Create AnalyticsCard component
    - Implement card shell with title, value, subtitle slots
    - Add optional trend indicator with up/down arrow and color coding
    - Support variant prop for default/success/warning/danger styling
    - Add optional icon slot
    - _Requirements: 2.1, 2.2, 2.5, 2.6_
  
  - [ ]* 4.2 Write property tests for AnalyticsCard
    - **Property 1: Currency Formatting Consistency**
    - **Property 4: Trend Indicator Color Coding**
    - **Validates: Requirements 2.1, 2.2, 2.5, 2.6**
  
  - [~] 4.3 Create ExportButtonGroup component
    - Implement three buttons: CSV, PDF, HTML
    - Add loading states for each export type
    - Handle disabled state when no data
    - Trigger onExport callbacks with format parameter
    - _Requirements: 5.7, 6.7, 7.7_
  
  - [ ]* 4.4 Write unit tests for ExportButtonGroup
    - Test button rendering and click handlers
    - Test disabled state behavior
    - _Requirements: 5.7, 6.7, 7.7_
  
  - [~] 4.5 Create DataTable component with column definitions
    - Implement generic table with ColumnDef interface
    - Render header row with column labels
    - Render data rows with custom cell renderers
    - Add empty state message when no data
    - Integrate ExportButtonGroup above table
    - _Requirements: 5.1, 6.1, 7.1_
  
  - [ ]* 4.6 Write unit tests for DataTable
    - Test table rendering with mock data
    - Test empty state display
    - Test export button integration
    - _Requirements: 5.1, 6.1, 7.1_

- [ ] 5. Implement export engine utilities
  - [~] 5.1 Create CSV export generator
    - Implement function to convert table data to CSV string
    - Add RFC 4180 compliant escaping for commas, quotes, newlines
    - Prepend UTF-8 BOM for Excel compatibility
    - Generate filename with format: {table-name}-{date}.csv
    - Trigger browser download using blob URL
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 5.2 Write property tests for CSV export
    - **Property 14: CSV Special Character Escaping**
    - **Property 15: CSV BOM Inclusion**
    - **Property 16: Export Filename Format**
    - **Validates: Requirements 8.2, 8.3, 8.4**
  
  - [~] 5.3 Create PDF export generator
    - Implement function using pdf-lib to generate PDF documents
    - Add header section with title and export date
    - Render table with alternating row colors
    - Implement multi-page support with page breaks for large datasets
    - Format currency values with PKR symbol
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ]* 5.4 Write property tests for PDF export
    - **Property 17: PDF Header Inclusion**
    - **Property 18: PDF Alternating Row Colors**
    - **Property 19: PDF Multi-Page Support**
    - **Validates: Requirements 9.3, 9.4, 9.5**
  
  - [~] 5.5 Create HTML export generator
    - Implement function to generate self-contained HTML document
    - Add inline CSS for table styling
    - Include header with title and export date
    - Sanitize user content to prevent XSS (escape HTML entities)
    - Validate and sanitize filename to prevent path traversal
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [ ]* 5.6 Write property tests for HTML export
    - **Property 20: HTML Self-Contained Structure**
    - **Property 21: HTML Content Sanitization**
    - **Property 22: HTML Style Tag Inclusion**
    - **Property 23: Filename Path Traversal Prevention**
    - **Validates: Requirements 10.2, 10.4, 10.5, 10.6**

- [~] 6. Checkpoint - Ensure export utilities work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Build chart visualization components
  - [~] 7.1 Create RevenueChart component
    - Implement line chart using Recharts LineChart component
    - Map revenueSeries data to XAxis (month) and YAxis (revenue)
    - Format Y-axis with PKR currency and comma separators
    - Add Tooltip with formatted values
    - Style with emerald color for line
    - Make chart responsive with ResponsiveContainer
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.7_
  
  - [ ]* 7.2 Write property test for RevenueChart
    - **Property 1: Currency Formatting Consistency**
    - **Validates: Requirements 4.5**
  
  - [~] 7.3 Create PlanDistributionChart component
    - Implement bar chart using Recharts BarChart component
    - Map planSeries data to bars with plan names
    - Calculate percentage for each plan's MRR contribution
    - Format Y-axis with PKR currency
    - Add legend with color coding per plan
    - _Requirements: 4.2, 4.3, 4.5_
  
  - [ ]* 7.4 Write unit tests for PlanDistributionChart
    - Test chart renders with plan data
    - Test legend displays correctly
    - _Requirements: 4.2, 4.3_

- [ ] 8. Implement pinned tickets section
  - [~] 8.1 Create PinnedTicketsSection component
    - Query listPinnedTickets using TanStack Query with 30s refetch
    - Render ticket cards in horizontal grid layout
    - Display ticket title, priority badge, reporter name, created date
    - Implement pin/unpin toggle buttons per ticket
    - Add color-coded priority badges (high=red, medium=amber, low=slate)
    - Show empty state when no tickets pinned
    - Handle loading and error states
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 11.6, 11.7, 11.8_
  
  - [ ]* 8.2 Write property tests for PinnedTicketsSection
    - **Property 24: Pinned Ticket Display Completeness**
    - **Property 25: Pinned Tickets Display Limit**
    - **Property 26: Priority Badge Color Mapping**
    - **Validates: Requirements 11.3, 11.4, 11.5, 11.6, 11.7**
  
  - [~] 8.3 Implement pin/unpin mutations with optimistic updates
    - Create useMutation hooks for pinTicket and unpinTicket
    - Implement optimistic updates to show immediate UI changes
    - Invalidate queries on success to refetch pinned tickets
    - Revert optimistic updates on error
    - Show success/error toast notifications
    - _Requirements: 12.5, 12.6, 12.7, 13.5, 13.6, 13.7_
  
  - [ ]* 8.4 Write integration tests for pin/unpin operations
    - Test pin operation updates DB and UI
    - Test unpin operation clears fields
    - Test optimistic update rollback on error
    - _Requirements: 12.1, 12.5, 12.7, 13.1, 13.5, 13.7_

- [ ] 9. Build data table implementations for business metrics
  - [~] 9.1 Create PlanBreakdownTable component
    - Define columns: Plan name, Subscribers, MRR, Share percentage
    - Calculate subscriber count using formula: round((plan.mrr / total.mrr) * activeCount)
    - Render progress bar for share percentage using div with dynamic width
    - Format MRR values with PKR currency
    - Capitalize plan names
    - Show empty state if no planSeries data
    - Integrate ExportButtonGroup with CSV, PDF, HTML handlers
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [ ]* 9.2 Write property tests for PlanBreakdownTable
    - **Property 5: Subscriber Count Calculation Accuracy**
    - **Property 6: Progress Bar Width Accuracy**
    - **Property 7: Plan Name Capitalization**
    - **Validates: Requirements 5.2, 5.3, 5.5**
  
  - [~] 9.3 Create ExpiringSubscriptionsTable component
    - Define columns: Plan name, Expires date
    - Conditionally render only if expiring.length > 0
    - Sort expiring subscriptions by end_date ascending
    - Format dates using toLocaleDateString()
    - Use amber color scheme for border and header
    - Integrate ExportButtonGroup
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [ ]* 9.4 Write property test for ExpiringSubscriptionsTable
    - **Property 8: Expiring Subscriptions Sort Order**
    - **Property 9: Date Formatting Consistency**
    - **Validates: Requirements 6.4, 6.5**
  
  - [~] 9.5 Create HardwareOrdersTable component
    - Define columns: Order ID, Admin, Quantity, Total, Status
    - Filter orders to exclude 'cancelled' and 'pending_payment' statuses
    - Format hardware_total with PKR currency
    - Render status badges with color coding (delivered=green, shipped=blue, etc.)
    - Truncate admin email if longer than 30 characters
    - Limit display to first 20 orders
    - Integrate ExportButtonGroup
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  
  - [ ]* 9.6 Write property tests for HardwareOrdersTable
    - **Property 10: Hardware Orders Status Filtering**
    - **Property 11: Order Status Badge Color Mapping**
    - **Property 12: Email Truncation**
    - **Property 13: Table Row Limiting**
    - **Validates: Requirements 7.2, 7.4, 7.5, 7.6**

- [~] 10. Checkpoint - Ensure table components work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement main page component
  - [~] 11.1 Create PlatformBusinessPage route component
    - Set up TanStack Query hooks for revenue, orders, pinnedTickets
    - Configure refetchInterval: 60s for revenue, 30s for tickets
    - Handle loading states with skeleton components
    - Handle error states with toast notifications and retry buttons
    - Implement manual refresh button
    - Auto-retry failed requests after 10 seconds
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [ ]* 11.2 Write integration tests for data fetching
    - Test TanStack Query configuration
    - Test loading state displays skeletons
    - Test error state displays toast
    - Test manual refresh triggers refetch
    - Test auto-retry after 10s
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [~] 11.3 Build KPI cards section
    - Render 4-column grid on large screens (grid-cols-4)
    - Use 2-column grid on medium screens (md:grid-cols-2)
    - Use 1-column grid on small screens
    - Create AnalyticsCard for MRR with trend indicator
    - Create AnalyticsCard for ARR with trend indicator
    - Create AnalyticsCard for Active Subscriptions with trend
    - Create AnalyticsCard for Churn Rate with trend
    - Apply 20px gap between cards
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_
  
  - [ ]* 11.4 Write property tests for KPI formatting
    - **Property 1: Currency Formatting Consistency**
    - **Property 2: Integer Subscription Counts**
    - **Property 3: Percentage Format Consistency**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
  
  - [~] 11.5 Build charts section
    - Render 2-column grid for charts (grid-cols-1 lg:grid-cols-2)
    - Add RevenueChart with revenueSeries data
    - Add PlanDistributionChart with planSeries data
    - Apply consistent card styling and spacing
    - _Requirements: 4.1, 4.2, 4.7_
  
  - [~] 11.6 Integrate PinnedTicketsSection
    - Render above data tables
    - Pass tickets data and pin/unpin handlers
    - Handle empty state and loading states
    - _Requirements: 11.1, 11.2_
  
  - [~] 11.7 Integrate data tables
    - Render PlanBreakdownTable with planSeries data
    - Conditionally render ExpiringSubscriptionsTable if expiring.length > 0
    - Render HardwareOrdersTable with orders data
    - Connect export handlers to each table
    - Apply consistent spacing (space-y-5)
    - _Requirements: 5.1, 6.1, 6.2, 7.1_

- [ ] 12. Implement export handlers and error handling
  - [~] 12.1 Wire export button handlers to export engine
    - Create handleExportCSV function per table
    - Create handleExportPDF function per table
    - Create handleExportHTML function per table
    - Show toast notification on export failure
    - Catch and log export errors
    - _Requirements: 8.1, 8.7, 9.1, 9.8, 10.1, 10.8_
  
  - [ ]* 12.2 Write integration tests for export handlers
    - Test CSV export triggers download
    - Test PDF export generates valid file
    - Test HTML export generates valid file
    - Test error toast on export failure
    - _Requirements: 8.1, 8.7, 9.1, 9.8, 10.1, 10.8_
  
  - [~] 12.3 Implement rate limiting for exports
    - Add client-side rate limit tracking (5 exports per minute)
    - Show error toast when limit exceeded
    - Reset counters after 60 seconds
    - Log rate limit violations
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_
  
  - [~] 12.4 Add error handling and recovery
    - Implement error boundary for page component
    - Add retry logic for failed mutations
    - Show contextual empty state messages
    - Log errors to console
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

- [~] 13. Checkpoint - Ensure full page integration works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Apply styling and responsive design
  - [~] 14.1 Implement responsive grid layouts
    - Apply responsive breakpoints to KPI cards grid
    - Make charts stack vertically on mobile
    - Make tables horizontally scrollable on small screens
    - Ensure touch targets are 44x44px minimum
    - Test at 375px (mobile), 768px (tablet), 1024px (desktop)
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_
  
  - [ ]* 14.2 Write responsive design tests
    - Test layout at different viewport sizes
    - Verify grid column counts change correctly
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
  
  - [~] 14.3 Apply color palette and typography
    - Use slate colors for text and borders
    - Use emerald for positive metrics, red for warnings
    - Apply amber scheme to expiring subscriptions section
    - Use defined typography scales (text-3xl for values, text-xs for labels)
    - Apply consistent padding (p-6) and gaps (gap-5)
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 6.6_
  
  - [~] 14.4 Add accessibility features
    - Add ARIA labels to all interactive elements
    - Use semantic HTML (header, section, table)
    - Ensure focus indicators are visible
    - Test color contrast ratios (WCAG AA)
    - Add screen reader announcements for dynamic updates
    - Provide descriptive button text (not just icons)
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_
  
  - [ ]* 14.5 Write accessibility tests
    - Run axe accessibility checker
    - Test keyboard navigation
    - Test screen reader compatibility
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_

- [ ] 15. Implement performance optimizations
  - [~] 15.1 Add lazy loading for charts
    - Use React.lazy to defer chart component loading
    - Implement Suspense boundary with loading fallback
    - Defer pdf-lib import until export triggered
    - _Requirements: 16.3, 16.6_
  
  - [~] 15.2 Add memoization for expensive calculations
    - Memoize chart data transformations using useMemo
    - Memoize subscriber count calculations
    - Memoize export data preparation
    - _Requirements: 16.4_
  
  - [~] 15.3 Optimize TanStack Query configuration
    - Set staleTime to reduce refetch frequency
    - Use query prefetching for predictable navigation
    - Implement background refetching
    - _Requirements: 16.7_
  
  - [ ]* 15.4 Write performance tests
    - Measure initial page load time (target < 2s)
    - Measure data refresh time (target < 500ms)
    - Measure CSV export time (target < 200ms)
    - Measure PDF export time for 100 rows (target < 2s)
    - Measure HTML export time (target < 300ms)
    - _Requirements: 16.1, 16.2, 8.6, 9.7, 10.7_

- [ ] 16. Add role-based access control verification
  - [~] 16.1 Implement super_admin guard on page route
    - Use existing resolveRole function
    - Redirect non-super-admins to dashboard
    - Show 403 error for direct access attempts
    - Log unauthorized access attempts
    - _Requirements: 15.1, 15.7_
  
  - [ ]* 16.2 Write integration tests for RBAC
    - Test super_admin can access page
    - Test admin role is redirected
    - Test manager role is denied access
    - Test pin/unpin require super_admin
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [~] 17. Final checkpoint - End-to-end testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- Integration tests verify server functions, database operations, and cross-component interactions
- TypeScript is used throughout for type safety and better developer experience
- All components use shadcn/ui primitives for consistent styling
- Export functionality uses existing pdf-lib dependency, no new libraries required
- Pinned tickets feature extends existing ticketing system with minimal schema changes

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1"]
    },
    {
      "id": 1,
      "tasks": ["2.1", "2.4", "2.6"]
    },
    {
      "id": 2,
      "tasks": ["2.2", "2.3", "2.5", "4.1", "4.3"]
    },
    {
      "id": 3,
      "tasks": ["4.2", "4.4", "4.5", "5.1", "5.3", "5.5"]
    },
    {
      "id": 4,
      "tasks": ["4.6", "5.2", "5.4", "5.6", "7.1", "7.3"]
    },
    {
      "id": 5,
      "tasks": ["7.2", "7.4", "8.1"]
    },
    {
      "id": 6,
      "tasks": ["8.2", "8.3", "9.1", "9.3", "9.5"]
    },
    {
      "id": 7,
      "tasks": ["8.4", "9.2", "9.4", "9.6"]
    },
    {
      "id": 8,
      "tasks": ["11.1", "11.3", "11.5"]
    },
    {
      "id": 9,
      "tasks": ["11.2", "11.4", "11.6", "11.7"]
    },
    {
      "id": 10,
      "tasks": ["12.1", "12.3", "12.4"]
    },
    {
      "id": 11,
      "tasks": ["12.2", "14.1", "14.3"]
    },
    {
      "id": 12,
      "tasks": ["14.2", "14.4", "15.1", "15.2", "15.3"]
    },
    {
      "id": 13,
      "tasks": ["14.5", "15.4", "16.1"]
    },
    {
      "id": 14,
      "tasks": ["16.2"]
    }
  ]
}
```
