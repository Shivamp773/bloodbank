import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../services/api.js';
import Login from '../pages/auth/Login.jsx';
import { makeStore } from '../redux/store.js';

vi.mock('../services/api.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, default: { get: vi.fn(), post: vi.fn() } };
});

const demoAccount = {
  role: 'organisation',
  label: 'City Blood Bank',
  email: 'city@bloodbank.test',
  password: 'Demo@1234',
};

function renderLogin(store = makeStore()) {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('Login page', () => {
  beforeEach(() => {
    vi.mocked(API.get).mockResolvedValue({ data: { success: true, demoMode: true, demoAccounts: [demoAccount] } });
    vi.mocked(API.post).mockReset();
  });

  it('lists demo accounts and fills the form when one is picked', async () => {
    renderLogin();
    await userEvent.click(await screen.findByRole('button', { name: /City Blood Bank/ }));

    expect(screen.getByLabelText('Email')).toHaveValue('city@bloodbank.test');
    expect(screen.getByLabelText('Password')).toHaveValue('Demo@1234');
    expect(screen.getByLabelText('Organisation')).toBeChecked();
  });

  it('logs in with the chosen role and stores the session', async () => {
    vi.mocked(API.post).mockResolvedValue({
      data: { success: true, token: 'jwt-token', user: { _id: '1', role: 'hospital', hospitalName: 'St. Mary' } },
    });
    const store = renderLogin();

    await userEvent.click(screen.getByLabelText('Hospital'));
    await userEvent.type(screen.getByLabelText('Email'), 'h@test.dev');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(API.post).toHaveBeenCalledWith('/auth/login', {
      email: 'h@test.dev',
      password: 'Password123',
      role: 'hospital',
    });
    expect(store.getState().auth.user.role).toBe('hospital');
    expect(localStorage.getItem('token')).toBe('jwt-token');
  });

  it('keeps what the user typed when the login fails', async () => {
    vi.mocked(API.post).mockRejectedValue({ response: { status: 401, data: { message: 'Invalid email or password' } } });
    renderLogin();

    await userEvent.type(screen.getByLabelText('Email'), 'donor@test.dev');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('button', { name: 'Log in' })).toBeEnabled();
    expect(screen.getByLabelText('Email')).toHaveValue('donor@test.dev');
  });
});
