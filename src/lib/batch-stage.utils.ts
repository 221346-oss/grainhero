/**
 * Utility functions for batch quality check traceability stages.
 * Maps internal batch status values to user-friendly stage labels.
 */

export type BatchStatus =
  | "pending_approval"
  | "pending_qc"
  | "qc_submitted"
  | "qc_passed"
  | "qc_failed"
  | "stored"
  | "admin_rejected"
  | "active"
  | "ready"
  | "dispatched"
  | "completed"
  | "damaged"
  | "on_hold";

export type BatchStage =
  | "In Process"
  | "Test Passed"
  | "Wait for Admin Approval"
  | "Batch Saved"
  | "Test Failed"
  | "Batch Failed to Save"
  | "Pending Admin Review"
  | "Active"
  | "Ready"
  | "Dispatched"
  | "Completed"
  | "Damaged"
  | "On Hold";

/**
 * Maps batch status to user-friendly stage label.
 * Handles the 6-hour admin approval timeout logic.
 *
 * @param status - Current batch status
 * @param qcPassedAt - ISO timestamp when QC was passed (optional)
 * @returns User-friendly stage label
 */
export function getBatchStageLabel(status: string, qcPassedAt?: string | null): BatchStage {
  switch (status) {
    // QC Process Stages
    case "pending_qc":
    case "qc_submitted":
      return "In Process";

    case "qc_passed":
      // Check if 6 hours have passed since QC was passed
      if (qcPassedAt) {
        const passedTime = new Date(qcPassedAt).getTime();
        const sixHoursInMs = 6 * 60 * 60 * 1000;
        const elapsedTime = Date.now() - passedTime;

        if (elapsedTime >= sixHoursInMs) {
          return "Wait for Admin Approval";
        }
      }
      return "Test Passed";

    case "stored":
      return "Batch Saved";

    case "qc_failed":
      return "Test Failed";

    case "admin_rejected":
      return "Batch Failed to Save";

    case "pending_approval":
      return "Pending Admin Review";

    // Other batch lifecycle stages
    case "active":
      return "Active";

    case "ready":
      return "Ready";

    case "dispatched":
      return "Dispatched";

    case "completed":
      return "Completed";

    case "damaged":
      return "Damaged";

    case "on_hold":
      return "On Hold";

    default:
      // Return the status as-is if not mapped
      return status as BatchStage;
  }
}

/**
 * Gets the appropriate badge variant/color for a batch stage.
 * Used for consistent visual representation across the UI.
 *
 * @param status - Current batch status
 * @returns CSS color class or variant name
 */
export function getBatchStageBadgeVariant(
  status: string,
): "default" | "success" | "warning" | "destructive" | "secondary" {
  switch (status) {
    case "pending_qc":
    case "qc_submitted":
    case "pending_approval":
      return "secondary"; // Gray/neutral for in-progress

    case "qc_passed":
      return "success"; // Green for passed

    case "stored":
    case "completed":
      return "success"; // Green for successful completion

    case "qc_failed":
    case "admin_rejected":
      return "destructive"; // Red for failures

    case "active":
    case "ready":
      return "default"; // Blue for active states

    case "dispatched":
      return "warning"; // Amber for dispatched

    case "damaged":
    case "on_hold":
      return "warning"; // Amber for issues

    default:
      return "default";
  }
}

/**
 * Checks if manager can override admin approval (6-hour timeout check).
 *
 * @param status - Current batch status
 * @param qcPassedAt - ISO timestamp when QC was passed
 * @returns true if manager can override, false otherwise
 */
export function canManagerOverride(status: string, qcPassedAt?: string | null): boolean {
  if (status !== "qc_passed") return false;
  if (!qcPassedAt) return false;

  const passedTime = new Date(qcPassedAt).getTime();
  const sixHoursInMs = 6 * 60 * 60 * 1000;
  const elapsedTime = Date.now() - passedTime;

  return elapsedTime >= sixHoursInMs;
}

/**
 * Gets remaining time until manager can override (in minutes).
 * Returns 0 if manager can already override.
 *
 * @param qcPassedAt - ISO timestamp when QC was passed
 * @returns Remaining minutes until override is allowed
 */
export function getRemainingTimeForOverride(qcPassedAt?: string | null): number {
  if (!qcPassedAt) return 0;

  const passedTime = new Date(qcPassedAt).getTime();
  const sixHoursInMs = 6 * 60 * 60 * 1000;
  const elapsedTime = Date.now() - passedTime;

  if (elapsedTime >= sixHoursInMs) return 0;

  return Math.ceil((sixHoursInMs - elapsedTime) / (60 * 1000));
}

/**
 * Formats time remaining in a human-readable format.
 *
 * @param minutes - Minutes remaining
 * @returns Formatted string like "2h 30m" or "45m"
 */
export function formatRemainingTime(minutes: number): string {
  if (minutes <= 0) return "Available now";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  return `${mins}m`;
}

/**
 * Gets detailed stage information including description and next steps.
 * Useful for tooltips and help text.
 *
 * @param status - Current batch status
 * @param qcPassedAt - ISO timestamp when QC was passed (optional)
 * @returns Object with stage info
 */
export function getBatchStageInfo(
  status: string,
  qcPassedAt?: string | null,
): {
  stage: BatchStage;
  description: string;
  nextStep?: string;
  canManagerOverride?: boolean;
} {
  const stage = getBatchStageLabel(status, qcPassedAt);
  const canOverride = canManagerOverride(status, qcPassedAt);

  switch (status) {
    case "pending_qc":
      return {
        stage,
        description: "Batch is awaiting quality check by technician",
        nextStep: "Technician needs to submit QC values",
      };

    case "qc_submitted":
      return {
        stage,
        description: "Quality check values submitted, awaiting manager review",
        nextStep: "Manager needs to pass or fail the QC test",
      };

    case "qc_passed":
      return {
        stage,
        description: canOverride
          ? "Admin approval timeout exceeded. Manager can now approve."
          : "Quality check passed, awaiting admin final approval",
        nextStep: canOverride
          ? "Manager can approve or wait for admin"
          : "Admin needs to approve for batch to be stored",
        canManagerOverride: canOverride,
      };

    case "stored":
      return {
        stage,
        description: "Batch successfully saved and added to silo inventory",
      };

    case "qc_failed":
      return {
        stage,
        description: "Quality check failed by manager",
        nextStep: "Batch returned to QC queue for resubmission",
      };

    case "admin_rejected":
      return {
        stage,
        description: "Batch rejected by admin",
        nextStep: "Admin can resend to manager or mark as damaged",
      };

    case "pending_approval":
      return {
        stage,
        description: "Manager-created batch awaiting admin initial approval",
        nextStep: "Admin needs to approve before QC process begins",
      };

    default:
      return {
        stage,
        description: `Batch is in ${stage} status`,
      };
  }
}
