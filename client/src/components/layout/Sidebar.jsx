import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router';
import { MENUS } from './menus.js';
import { fetchBadges } from '../../redux/badgesSlice.js';

export default function Sidebar({ open, onNavigate }) {
  const user = useSelector((state) => state.auth.user);
  const badges = useSelector((state) => state.badges);
  const dispatch = useDispatch();
  const { pathname } = useLocation();

  // Refresh the counts whenever the user moves to another page.
  useEffect(() => {
    dispatch(fetchBadges());
  }, [dispatch, pathname]);

  return (
    <nav id="app-sidebar" className={`app-sidebar${open ? ' open' : ''}`} aria-label="Main">
      <ul className="nav flex-column gap-1">
        {(MENUS[user.role] ?? []).map(({ to, label, icon: Icon, badge, end }) => (
          <li key={to} className="nav-item">
            <NavLink to={to} end={end} className="sidebar-link" onClick={onNavigate}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
              {badge && badges[badge] > 0 && (
                <span className="badge rounded-pill text-bg-danger ms-auto" aria-label={`${badges[badge]} open`}>
                  {badges[badge]}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
