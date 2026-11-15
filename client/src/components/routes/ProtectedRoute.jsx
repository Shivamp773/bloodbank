import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router';
import Spinner from '../ui/Spinner.jsx';
import { fetchCurrentUser, logout } from '../../redux/authSlice.js';

/**
 * Renders its children only for a logged-in user. Loads the user once per session and waits for it,
 * so pages never run with an empty user (in v1, pages fetched data before the user was known).
 */
export default function ProtectedRoute({ children }) {
  const { token, user, userStatus, userError } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();

  useEffect(() => {
    if (token && !user && userStatus === 'idle') dispatch(fetchCurrentUser());
  }, [token, user, userStatus, dispatch]);

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user) return children;

  if (userStatus === 'failed') {
    // A network problem shouldn't silently log the user out; let them retry instead.
    return (
      <div className="loader-page">
        <div className="card p-4 text-center" style={{ maxWidth: 420 }}>
          <h1 className="h5">Couldn&apos;t load your account</h1>
          <p className="text-muted">{userError}</p>
          <div className="d-flex justify-content-center gap-2">
            <button type="button" className="btn btn-primary" onClick={() => dispatch(fetchCurrentUser())}>
              Try again
            </button>
            <button type="button" className="btn btn-light" onClick={() => dispatch(logout())}>
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Spinner fullPage label="Loading your account…" />;
}
