import { describe, expect, it } from 'vitest';
import { HEADER_NAV, isActive, tabBarItems } from './nav';

const [find, roommates, landlord] = HEADER_NAV;

describe('isActive', () => {
  it('marks Find a room on the home page and on a listing', () => {
    expect(isActive(find, '/')).toBe(true);
    expect(isActive(find, '/listing/abc')).toBe(true);
    expect(isActive(find, '/roommates')).toBe(false);
  });

  it('matches a section and its sub-pages only', () => {
    expect(isActive(landlord, '/landlord')).toBe(true);
    expect(isActive(landlord, '/landlord/listings/new')).toBe(true);
    expect(isActive(roommates, '/roommates-old')).toBe(false);
  });
});

describe('tabBarItems', () => {
  it('shows Reservations to tenants and Dashboard to landlords', () => {
    expect(tabBarItems(false)[3].label).toBe('Reservations');
    expect(tabBarItems(true)[3].label).toBe('Dashboard');
  });
});
