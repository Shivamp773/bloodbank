import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import ProtectedRoute from '../components/routes/ProtectedRoute.jsx';
import PublicRoute from '../components/routes/PublicRoute.jsx';
import RequireRole from '../components/routes/RequireRole.jsx';
import { makeStore } from '../redux/store.js';

const signedIn = (role) => ({
  auth: { token: 'token', user: { _id: '1', role, name: 'Test' }, userStatus: 'succeeded', userError: null },
});

function renderAt(path, preloadedState) {
  return render(
    <Provider store={makeStore(preloadedState)}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<PublicRoute><p>Login page</p></PublicRoute>} />
          <Route element={<ProtectedRoute><RequireRole roles={['organisation']} /></ProtectedRoute>}>
            <Route path="/" element={<p>Inventory page</p>} />
          </Route>
          <Route element={<ProtectedRoute><RequireRole roles={['donor', 'hospital']} /></ProtectedRoute>}>
            <Route path="/organisation" element={<p>Organisations page</p>} />
          </Route>
          <Route element={<ProtectedRoute><RequireRole roles={['admin']} /></ProtectedRoute>}>
            <Route path="/admin" element={<p>Admin page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('route guards', () => {
  it('sends visitors without a session to the login page', () => {
    renderAt('/admin');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('shows a page to a user with the right role', () => {
    renderAt('/', signedIn('organisation'));
    expect(screen.getByText('Inventory page')).toBeInTheDocument();
  });

  it('sends a user away from pages for other roles, to their own home', () => {
    renderAt('/admin', signedIn('donor'));
    expect(screen.getByText('Organisations page')).toBeInTheDocument();
    expect(screen.queryByText('Admin page')).not.toBeInTheDocument();
  });

  it('sends a logged-in user from the login page to their home page', () => {
    renderAt('/login', signedIn('admin'));
    expect(screen.getByText('Admin page')).toBeInTheDocument();
  });
});
