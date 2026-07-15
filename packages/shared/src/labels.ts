export const CANCEL_LESS_24H_PENALTY = 10;

export const userStatusLabel: Record<string, string> = {
  ACTIVE: 'Активен',
  BLOCKED: 'Заблокирован',
  PENDING_VERIFICATION: 'На проверке',
};

export const userRoleLabel: Record<string, string> = {
  SUPERADMIN: 'Суперадмин',
  MANAGER: 'Менеджер',
  FOREMAN: 'Бригадир',
  WORKER: 'Работник',
};

export function getUserStatusLabel(status: string): string {
  return userStatusLabel[status] ?? status;
}

export function getUserRoleLabel(role: string): string {
  return userRoleLabel[role] ?? role;
}

export const documentStatusLabel: Record<string, string> = {
  PENDING: 'На проверке',
  APPROVED: 'Подтверждён',
  REJECTED: 'Отклонён',
};

export function getDocumentStatusLabel(status: string): string {
  return documentStatusLabel[status] ?? status;
}

export const shiftStatusLabel: Record<string, string> = {
  DRAFT: 'Черновик',
  PUBLISHED: 'Опубликована',
  IN_PROGRESS: 'В процессе',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
};

export const applicationStatusLabel: Record<string, string> = {
  CONFIRMED: 'Подтверждена',
  CANCELLED: 'Отменена',
  NO_SHOW: 'Неявка',
  COMPLETED: 'Завершена',
};

export const paymentStatusLabel: Record<string, string> = {
  PENDING: 'Ожидает',
  PROCESSING: 'В обработке',
  PAID: 'Выплачено',
  CANCELLED: 'Отменено',
};

export const attendanceStatusLabel: Record<string, string> = {
  PRESENT: 'Присутствует',
  ABSENT: 'Отсутствует',
  LATE: 'Опоздание',
  LEFT_EARLY: 'Ушёл раньше',
  FULL_SHIFT: 'Полная смена',
};

export const RATING_RULE_LABELS: Record<string, string> = {
  ON_TIME: 'Приход вовремя',
  GOOD_RATING: 'Хорошая оценка',
  BEST_WORKER: 'Лучший работник смены',
  LATE: 'Опоздание',
  CANCEL_LESS_24H: 'Отмена менее чем за 24 ч',
  NO_SHOW: 'Неявка',
  BAD_RATING: 'Плохая оценка',
};

export function getShiftStatusLabel(status: string): string {
  return shiftStatusLabel[status] ?? status;
}

export function getApplicationStatusLabel(status: string): string {
  return applicationStatusLabel[status] ?? status;
}

export function getPaymentStatusLabel(status: string): string {
  return paymentStatusLabel[status] ?? status;
}

export function getAttendanceStatusLabel(status: string): string {
  return attendanceStatusLabel[status] ?? status;
}
