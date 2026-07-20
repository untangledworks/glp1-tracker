import { describe, it, expect } from 'vitest';
import { getGreeting, getInjectionCycleDay } from './greeting';

describe('getGreeting', () => {
  it('returns morning greeting with name before noon', () => {
    const result = getGreeting('Marlena', new Date('2026-07-20T09:00:00'));
    expect(result).toBe('Good morning, Marlena');
  });

  it('returns afternoon greeting with name between noon and 5pm', () => {
    const result = getGreeting('Marlena', new Date('2026-07-20T14:00:00'));
    expect(result).toBe('Good afternoon, Marlena');
  });

  it('returns evening greeting with name after 5pm', () => {
    const result = getGreeting('Marlena', new Date('2026-07-20T19:00:00'));
    expect(result).toBe('Good evening, Marlena');
  });

  it('returns greeting without name when null', () => {
    const result = getGreeting(null, new Date('2026-07-20T09:00:00'));
    expect(result).toBe('Good morning!');
  });
});

describe('getInjectionCycleDay', () => {
  it('returns null when no injection day configured', () => {
    expect(getInjectionCycleDay(null)).toBeNull();
  });

  it('returns day 0 on injection day', () => {
    // 2026-07-20 is a Monday
    const result = getInjectionCycleDay('monday', new Date('2026-07-20T10:00:00'));
    expect(result).toEqual({ dayNumber: 0, isInjectionDay: true });
  });

  it('returns day 3 three days after injection', () => {
    // 2026-07-20 is Monday, Thursday = 3 days later
    const result = getInjectionCycleDay('monday', new Date('2026-07-23T10:00:00'));
    expect(result).toEqual({ dayNumber: 3, isInjectionDay: false });
  });

  it('returns day 6 one day before next injection', () => {
    // 2026-07-20 is Monday, Sunday = 6 days later
    const result = getInjectionCycleDay('monday', new Date('2026-07-26T10:00:00'));
    expect(result).toEqual({ dayNumber: 6, isInjectionDay: false });
  });
});
