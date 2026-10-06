import { Building2, CalendarCheck, Coins, Heart, Info, LayoutDashboard, Search, User, Users, type LucideIcon } from 'lucide-react';
import type { Role } from '../lib/database.types';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Other path prefixes that count as "this tab" (e.g. a listing counts as Find). */
  match: string[];
};

const FIND: NavItem = { to: '/', label: 'Find a room', icon: Search, match: ['/listing'] };
const ROOMMATES: NavItem = { to: '/roommates', label: 'Roommates', icon: Users, match: [] };
const LANDLORDS: NavItem = { to: '/landlord', label: 'For landlords', icon: Building2, match: [] };
const ABOUT: NavItem = { to: '/about', label: 'About', icon: Info, match: [] };

/**
 * Desktop header nav. Each account has one fixed role, so members only see their side:
 * room-seekers get Roommates, landlords get their properties. Visitors see everything.
 */
export function headerNav(role: Role | null): NavItem[] {
  if (role === 'tenant') return [FIND, ROOMMATES, ABOUT];
  if (role === 'landlord') return [FIND, { ...LANDLORDS, label: 'Your properties' }, ABOUT];
  return [FIND, ROOMMATES, LANDLORDS, ABOUT];
}

/** Kept for tests and simple callers: the visitor's header. */
export const HEADER_NAV: NavItem[] = headerNav(null);

/** Phone tab bar: five tabs for each kind of account. */
export function tabBarItems(isLandlord: boolean): NavItem[] {
  const account: NavItem = { to: '/account', label: 'Account', icon: User, match: ['/welcome', '/signin', '/signup', '/reset-password'] };
  return isLandlord
    ? [
        { ...FIND, label: 'Find' },
        { to: '/landlord', label: 'Dashboard', icon: LayoutDashboard, match: [] },
        { to: '/saved', label: 'Saved', icon: Heart, match: [] },
        { to: '/wallet', label: 'Points', icon: Coins, match: [] },
        account,
      ]
    : [
        { ...FIND, label: 'Find' },
        { ...ROOMMATES },
        { to: '/saved', label: 'Saved', icon: Heart, match: [] },
        { to: '/reservations', label: 'Reservations', icon: CalendarCheck, match: [] },
        account,
      ];
}

export function isActive(item: NavItem, pathname: string): boolean {
  const prefixes = item.to === '/' ? item.match : [item.to, ...item.match];
  if (item.to === '/' && pathname === '/') return true;
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
