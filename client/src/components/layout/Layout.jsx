import { useState } from 'react';
import { Outlet } from 'react-router';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';

/** Header + sidebar around every logged-in page. On small screens the sidebar slides in. */
export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <Header menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((open) => !open)} />
      <div className="app-body">
        <Sidebar open={menuOpen} onNavigate={closeMenu} />
        {menuOpen && <div className="sidebar-backdrop d-lg-none" onClick={closeMenu} aria-hidden="true" />}
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
