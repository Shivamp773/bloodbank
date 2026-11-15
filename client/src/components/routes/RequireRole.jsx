import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router';
import { ROLE_HOME } from '../../constants.js';

/** Route guard: users without one of `roles` are sent to their own home page. */
export default function RequireRole({ roles }) {
  const user = useSelector((state) => state.auth.user);
  if (!roles.includes(user?.role)) return <Navigate to={ROLE_HOME[user?.role] ?? '/login'} replace />;
  return <Outlet />;
}
