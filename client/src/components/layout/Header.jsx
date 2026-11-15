import { BiDonateBlood, BiUserCircle } from 'react-icons/bi';
import { FaBars, FaRightFromBracket } from 'react-icons/fa6';
import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { logout } from '../../redux/authSlice.js';
import { ROLE_HOME, ROLE_LABELS } from '../../constants.js';
import { displayName } from '../../utils/format.js';

export default function Header({ menuOpen, onToggleMenu }) {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <header className="app-header navbar bg-white border-bottom sticky-top px-2 px-md-3">
      <div className="container-fluid px-0 flex-nowrap">
        <div className="d-flex align-items-center gap-1">
          <button
            type="button"
            className="btn btn-link text-body d-lg-none"
            onClick={onToggleMenu}
            aria-label="Toggle menu"
            aria-controls="app-sidebar"
            aria-expanded={menuOpen}
          >
            <FaBars aria-hidden="true" />
          </button>
          <Link to={ROLE_HOME[user.role]} className="navbar-brand text-body">
            <BiDonateBlood className="text-primary" size={26} aria-hidden="true" />
            Blood Bank
          </Link>
        </div>

        <div className="d-flex align-items-center gap-2 gap-md-3">
          <span className="d-none d-md-flex align-items-center gap-2 text-muted">
            <BiUserCircle size={20} aria-hidden="true" />
            Welcome, <strong className="text-body">{displayName(user)}</strong>
            <span className="badge text-bg-light border">{ROLE_LABELS[user.role]}</span>
          </span>
          <NavLink to="/about" className="nav-link px-2">
            About
          </NavLink>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleLogout}>
            <FaRightFromBracket aria-hidden="true" /> <span className="d-none d-sm-inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
