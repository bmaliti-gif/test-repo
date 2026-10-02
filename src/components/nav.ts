import { Building2, CalendarCheck, Heart, LayoutDashboard, Search, User, Users, type LucideIcon } from 'lucide-react';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Other path prefixes that count as "this tab" (e.g. a listing counts as Find). */
  match: string[];
};

// Desktop header nav, as in the design.
export const HEADER_NAV: NavItem[] = [
  { to: '/', label: 'Find a room', icon: Search, match: ['/listing'] },
  { to: '/roommates', label: 'Roommates', icon: Users, match: [] },
  { to: '/landlord', label: 'For landlords', icon: Building2, match: [] },
];

// Phone tab bar (PLAN.md §6). Landlords get Dashboard in place of Reservations;
// that switch needs sign-in, so it arrives in Block 3.
export function tabBarItems(isLandlord: boolean): NavItem[] {
  return [
    { to: '/', label: 'Find', icon: Search, match: ['/listing'] },
    { to: '/roommates', label: 'Roommates', icon: Users, match: [] },
    { to: '/saved', label: 'Saved', icon: Heart, match: [] },
    isLandlord
      ? { to: '/landlord', label: 'Dashboard', icon: LayoutDashboard, match: [] }
      : { to: '/reservations', label: 'Reservations', icon: CalendarCheck, match: [] },
    { to: '/account', label: 'Account', icon: User, match: ['/welcome', '/signin', '/signup', '/reset-password'] },
  ];
}

export function isActive(item: NavItem, pathname: string): boolean {
  const prefixes = item.to === '/' ? item.match : [item.to, ...item.match];
  if (item.to === '/' && pathname === '/') return true;
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
