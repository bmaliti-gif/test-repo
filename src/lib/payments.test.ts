import { describe, expect, it } from 'vitest';
import { whatsappLink } from './payments';

describe('whatsappLink', () => {
  it('uses digits only and encodes the message', () => {
    expect(whatsappLink('+260971234567', 'Hi, ref CH-100001?')).toBe(
      'https://wa.me/260971234567?text=Hi%2C%20ref%20CH-100001%3F',
    );
  });
});
