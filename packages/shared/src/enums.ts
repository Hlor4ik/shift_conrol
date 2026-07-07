export const UserRole = {
  SUPERADMIN: 'SUPERADMIN',
  MANAGER: 'MANAGER',
  FOREMAN: 'FOREMAN',
  WORKER: 'WORKER',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export const ShiftStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const ApplicationStatus = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  COMPLETED: 'COMPLETED',
} as const;

export const AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  LEFT_EARLY: 'LEFT_EARLY',
  FULL_SHIFT: 'FULL_SHIFT',
} as const;

export const PaymentStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;

export const WorkerListType = {
  FAVORITE: 'FAVORITE',
  BLACKLIST: 'BLACKLIST',
  WHITELIST: 'WHITELIST',
} as const;

export const DEFAULT_RATING_RULES = {
  ON_TIME: 2,
  GOOD_RATING: 3,
  BEST_WORKER: 5,
  LATE: -5,
  CANCEL_LESS_24H: -10,
  NO_SHOW: -30,
  BAD_RATING: -10,
} as const;

export const RATING_DEFAULT = 100;
export const RATING_MIN = 0;
export const RATING_MAX = 200;

export const REMINDER_HOURS = [24, 12, 3, 1] as const;
