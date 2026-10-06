import { describe, expect, it } from 'vitest';
import { pointsFor, pts } from './points';

describe('pointsFor', () => {
  it('turns Kwacha into points at the set rate', () => {
    expect(pointsFor(5000, 2)).toBe(100); // K50 → 100 points
    expect(pointsFor(2000, 2)).toBe(40);
    expect(pointsFor(20000, 3)).toBe(600);
  });
  it('ignores ngwee', () => {
    expect(pointsFor(5099, 2)).toBe(100);
  });
});

describe('pts', () => {
  it('reads naturally', () => {
    expect(pts(1)).toBe('1 point');
    expect(pts(20)).toBe('20 points');
    expect(pts(1200)).toBe('1,200 points');
  });
});
