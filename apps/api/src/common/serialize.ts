export function parseApiErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const msg = (body as { message: unknown }).message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  }
  return fallback;
}

export function decimalToString(value: { toString(): string } | string | number | null | undefined): string {
  if (value == null) return '0';
  return value.toString();
}

export function serializeShift<T extends { cost: { toString(): string }; date: Date }>(shift: T) {
  const { cost, date, ...rest } = shift;
  return { ...rest, cost: cost.toString(), date: date.toISOString() };
}

export function serializePayment<T extends { amount: { toString(): string } }>(payment: T) {
  return { ...payment, amount: payment.amount.toString() };
}
