import { describe, expect, it } from 'vitest';
import { fitWithin } from './images';

describe('fitWithin', () => {
  it('shrinks big photos to 1600 px on the long side', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it('never enlarges small photos', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
