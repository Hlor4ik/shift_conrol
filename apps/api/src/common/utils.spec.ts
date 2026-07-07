import { validateTelegramInitData, haversineDistance, computeShiftDuration } from './utils';

describe('utils', () => {
  it('computeShiftDuration', () => {
    expect(computeShiftDuration('08:00', '17:00')).toBe(540);
    expect(computeShiftDuration('09:30', '12:00')).toBe(150);
  });

  it('haversineDistance', () => {
    const d = haversineDistance(55.751244, 37.618423, 55.752244, 37.619423);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(200);
  });

  it('validateTelegramInitData returns null for invalid data', () => {
    expect(validateTelegramInitData('invalid', 'token')).toBeNull();
  });
});
