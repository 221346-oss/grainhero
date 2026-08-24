/**
 * Canonical list of incident title suggestions a manager can report,
 * split by the target role they'd be routed to.
 *
 * Used in:
 *   - ReportTicketDialog  (title combobox)
 *   - platform.field-incidents page (search bar suggestions)
 */

export const INCIDENT_SUGGESTIONS: Record<"technician" | "admin" | "manager", string[]> = {
  technician: [
    "Conveyor Motor Overheating",
    "Silo Temperature Sensor Malfunction",
    "Grain Moisture Level Exceeds Threshold",
    "Aeration Fan Not Functioning",
    "Pest / Rodent Infestation Detected",
    "Mold Growth Observed in Silo",
    "Structural Crack in Silo Wall",
    "Leakage / Water Ingress in Storage Area",
    "Dust Extraction System Failure",
    "Weigh-Bridge / Scale Calibration Error",
    "Loading / Unloading Equipment Breakdown",
    "Electrical Trip in Field Panel",
    "Fire Suppression System Fault",
  ],
  admin: [
    "Procurement Delay — Grain Supply Shortage",
    "Staffing Gap — Technician Unavailable",
    "Budget Approval Required for Equipment Repair",
    "Supplier Non-Compliance — Quality Dispute",
    "Insurance Claim Needs to Be Filed",
    "Regulatory Inspection Notice Received",
    "Customer Complaint — Delivery Issue",
    "Contract Renewal Deadline Approaching",
    "Safety Incident — Formal Report Required",
    "Unauthorised Access to Storage Area",
    "Inventory Discrepancy — Stock Count Mismatch",
    "Payment / Invoice Dispute with Vendor",
    "New Hire Onboarding Request",
    "IT / System Access Issue for Field Staff",
    "Policy Violation — Requires HR Escalation",
  ],
  manager: [
    "Operational Inefficiency — Process Review Needed",
    "Team Performance Issue — Staff Evaluation",
    "Quality Control Failure — Batch Rejection",
    "Schedule Conflict — Resource Allocation",
    "Training Gap — Staff Development Needed",
    "Equipment Maintenance Schedule Overdue",
    "Production Target Shortfall",
    "Health & Safety Protocol Violation",
    "Cost Overrun — Budget Review Required",
    "Customer Service Escalation",
    "Workflow Bottleneck Identification",
    "Technology Upgrade Recommendation",
    "Cross-Department Coordination Issue",
  ],
};

/** Flat deduplicated list of all suggestions (all roles). */
export const ALL_SUGGESTIONS: string[] = Array.from(
  new Set([
    ...INCIDENT_SUGGESTIONS.technician, 
    ...INCIDENT_SUGGESTIONS.admin, 
    ...INCIDENT_SUGGESTIONS.manager
  ]),
);
