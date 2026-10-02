import { Link, useLocation } from 'react-router';
import { isActive, tabBarItems } from './nav';

/** Fixed bottom tab bar, shown below 768px in place of the header nav. */
export function TabBar({ isLandlord }: { isLandlord: boolean }) {
  const { pathname } = useLocation();

  return (
    <nav className="tabbar" aria-label="Main">
      {tabBarItems(isLandlord).map((item) => {
        const active = isActive(item, pathname);
        const Icon = item.icon;
        return (
          <Link key={item.to} to={item.to} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>
            <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
