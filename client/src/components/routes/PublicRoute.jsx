import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router';
import ProtectedRoute from './ProtectedRoute.jsx';
import { ROLE_HOME } from '../../constants.js';

function GoHome() {
  const user = useSelector((state) => state.auth.user);
  const location = useLocation();
  return <Navigate to={location.state?.from ?? ROLE_HOME[user.role]} replace />;
}

/** Login/Register: logged-in users go straight to their own home page (v1 always sent them to "/"). */
export default function PublicRoute({ children }) {
  const token = useSelector((state) => state.auth.token);
  if (!token) return children;
  return (
    <ProtectedRoute>
      <GoHome />
    </ProtectedRoute>
  );
}
