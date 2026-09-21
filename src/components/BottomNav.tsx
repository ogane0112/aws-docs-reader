import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'ホーム', icon: '🏠', end: true },
  { to: '/guides', label: 'ガイド', icon: '📚', end: false },
  { to: '/review', label: '復習', icon: '🔁', end: false },
  { to: '/settings', label: '設定', icon: '⚙️', end: false },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
