import { describe, expect, it } from 'vitest';
import { detectProvider, formatPhone, providerMismatch, toE164 } from './phone';

describe('toE164', () => {
  it('accepts the ways people type Zambian numbers', () => {
    expect(toE164('0971234567')).toBe('+260971234567');
    expect(toE164('097 123 4567')).toBe('+260971234567');
    expect(toE164('+260 97 123 4567')).toBe('+260971234567');
    expect(toE164('260761234567')).toBe('+260761234567');
    expect(toE164('961234567')).toBe('+260961234567');
  });

  it('rejects numbers that are not Zambian mobiles', () => {
    expect(toE164('12345')).toBeNull();
    expect(toE164('0211234567')).toBeNull(); // landline
    expect(toE164('09712345678')).toBeNull(); // too long
    expect(toE164('')).toBeNull();
  });
});

describe('detectProvider', () => {
  it('guesses the network from the prefix', () => {
    expect(detectProvider('0961234567')).toBe('mtn');
    expect(detectProvider('0761234567')).toBe('mtn');
    expect(detectProvider('0971234567')).toBe('airtel');
    expect(detectProvider('0771234567')).toBe('airtel');
    expect(detectProvider('0951234567')).toBe('zamtel');
    expect(detectProvider('0751234567')).toBeNull();
  });
});

describe('formatPhone', () => {
  it('shows E.164 the local way', () => {
    expect(formatPhone('+260971234567')).toBe('097 123 4567');
    expect(formatPhone(null)).toBe('');
  });
});

describe('providerMismatch', () => {
  it('warns only when the number looks like another network', () => {
    expect(providerMismatch('0971234567', 'mtn')).toMatch(/Airtel Money/);
    expect(providerMismatch('0961234567', 'mtn')).toBeNull();
    expect(providerMismatch('0751234567', 'mtn')).toBeNull();
  });
});
