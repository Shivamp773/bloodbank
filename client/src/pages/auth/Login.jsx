import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router';
import { toast } from 'react-toastify';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import DemoAccounts from '../../components/auth/DemoAccounts.jsx';
import RolePicker from '../../components/auth/RolePicker.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { useApi } from '../../hooks/useApi.js';
import { login } from '../../redux/authSlice.js';
import { displayName } from '../../utils/format.js';

const ROLES = ['donor', 'admin', 'hospital', 'organisation'];

export default function Login() {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ email: '', password: '', role: 'donor' });
  const [submitting, setSubmitting] = useState(false);
  const { data: meta } = useApi('/meta');

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { user } = await dispatch(login(form)).unwrap();
      toast.success(`Welcome, ${displayName(user)}!`);
      // PublicRoute sends the user to their home page as soon as they are stored.
    } catch (message) {
      toast.error(message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      banner="/assets/images/banner1.jpg"
      bannerAlt="An arm after giving blood, with the words: Donate blood. Make a difference. Save a life."
      bannerBackground="linear-gradient(#fefdfb 50%, #f8f4f1 50%)"
    >
      <form onSubmit={handleSubmit}>
        <h1 className="h3 mb-1">Log in</h1>
        <p className="text-muted mb-4">Choose your role and sign in to your account.</p>

        <RolePicker roles={ROLES} value={form.role} onChange={(role) => setForm({ ...form, role })} />
        <FormField
          label="Email"
          type="email"
          name="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          required
        />
        <FormField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={form.password}
          onChange={update('password')}
          required
        />

        <button type="submit" className="btn btn-primary w-100 py-2" disabled={submitting}>
          {submitting && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          Log in
        </button>
        <p className="text-center mt-3 mb-0">
          Not registered yet? <Link to="/register">Create an account</Link>
        </p>
      </form>

      {meta?.demoAccounts?.length > 0 && (
        <DemoAccounts
          accounts={meta.demoAccounts}
          resetsOnRestart={meta.demoMode}
          onPick={({ email, password, role }) => setForm({ email, password, role })}
        />
      )}
    </AuthLayout>
  );
}
