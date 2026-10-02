import { describe, expect, it } from 'vitest';
import { formatKwacha, formatKwachaShort, kwachaToNgwee } from './money';

describe('formatKwacha', () => {
  it('shows whole Kwacha with thousands separators', () => {
    expect(formatKwacha(180000)).toBe('K 1,800');
    expect(formatKwacha(50000)).toBe('K 500');
    expect(formatKwacha(2000000)).toBe('K 20,000');
    expect(formatKwacha(0)).toBe('K 0');
  });

  it('shows ngwee only when there are some', () => {
    expect(formatKwacha(52550)).toBe('K 525.50');
    expect(formatKwacha(2505)).toBe('K 25.05');
  });
});

describe('formatKwachaShort', () => {
  it('makes short pin labels', () => {
    expect(formatKwachaShort(180000)).toBe('1.8k');
    expect(formatKwachaShort(420000)).toBe('4.2k');
    expect(formatKwachaShort(200000)).toBe('2k');
    expect(formatKwachaShort(95000)).toBe('950');
  });
});

describe('kwachaToNgwee', () => {
  it('converts Kwacha to whole ngwee', () => {
    expect(kwachaToNgwee(1800)).toBe(180000);
    expect(kwachaToNgwee(25.5)).toBe(2550);
  });
});
