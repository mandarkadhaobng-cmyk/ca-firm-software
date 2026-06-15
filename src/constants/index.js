export const APP_NAME = import.meta.env.VITE_APP_NAME || 'CA Practice Manager';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

export const TIMESHEET_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FINAL_APPROVED: 'final_approved',
};

export const TIMESHEET_STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  final_approved: 'Final Approved',
};

export const TIMESHEET_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  final_approved: 'bg-purple-100 text-purple-700',
};

export const ASSIGNMENT_STATUS = {
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  UNDER_REVIEW: 'under_review',
  COMPLETED: 'completed',
  CLOSED: 'closed',
  ON_HOLD: 'on_hold',
};

export const ASSIGNMENT_STATUS_LABELS = {
  assigned: 'Assigned',
  in_progress: 'In Progress',
  under_review: 'Under Review',
  completed: 'Completed',
  closed: 'Closed',
  on_hold: 'On Hold',
};

export const ASSIGNMENT_STATUS_COLORS = {
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  under_review: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
  on_hold: 'bg-orange-100 text-orange-700',
};

export const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'paid', label: 'Paid Leave' },
  { value: 'work_from_home', label: 'Work From Home' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'other', label: 'Other' },
];

export const LEAVE_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ON_LEAVE: 'on_leave',
  RESIGNED: 'resigned',
};

export const NOTIFICATION_TYPES = {
  TIMESHEET_REMINDER: 'timesheet_reminder',
  TIMESHEET_SUBMITTED: 'timesheet_submitted',
  TIMESHEET_APPROVED: 'timesheet_approved',
  TIMESHEET_REJECTED: 'timesheet_rejected',
  ASSIGNMENT_ASSIGNED: 'assignment_assigned',
  ASSIGNMENT_DUE: 'assignment_due',
  LEAVE_APPLIED: 'leave_applied',
  LEAVE_APPROVED: 'leave_approved',
  LEAVE_REJECTED: 'leave_rejected',
  APPROVAL_PENDING: 'approval_pending',
  SYSTEM_ALERT: 'system_alert',
};

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 15,
  PAGE_SIZE_OPTIONS: [10, 15, 25, 50],
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
export const MAX_DAILY_HOURS = 12;

// Helper: current date as ISO string YYYY-MM-DD
export const isoDate = (d = new Date()) => {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().split('T')[0];
};
