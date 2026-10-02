import { describe, expect, it } from 'vitest';
import { distanceKm, formatKm } from './geo';

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm({ lat: -15.4, lng: 28.3 }, { lat: -15.4, lng: 28.3 })).toBe(0);
  });

  it('measures about 1.1 km per 0.01° of latitude', () => {
    const d = distanceKm({ lat: -15.4, lng: 28.3 }, { lat: -15.41, lng: 28.3 });
    expect(d).toBeGreaterThan(1.1);
    expect(d).toBeLessThan(1.12);
  });
});

describe('formatKm', () => {
  it('uses one decimal for short distances', () => {
    expect(formatKm(0.84)).toBe('0.8');
    expect(formatKm(2.06)).toBe('2.1');
    expect(formatKm(12.4)).toBe('12');
  });
});
