import { describe, expect, it } from 'vitest';
import { HEADER_NAV, headerNav, isActive, tabBarItems } from './nav';

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
    expect(tabBarItems(false)[1].label).toBe('Roommates');
    expect(tabBarItems(true)[1].label).toBe('Dashboard');
    expect(tabBarItems(true).map((t) => t.label)).not.toContain('Roommates');
  });
});

describe('headerNav', () => {
  it('shows each role only its own side', () => {
    expect(headerNav('tenant').map((i) => i.label)).toEqual(['Find a room', 'Roommates', 'About']);
    expect(headerNav('landlord').map((i) => i.label)).toEqual(['Find a room', 'Your properties', 'About']);
    expect(headerNav(null).map((i) => i.label)).toContain('For landlords');
  });
});
