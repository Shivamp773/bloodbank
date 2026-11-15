import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import RegisterAside from '../../components/auth/RegisterAside.jsx';
import RolePicker from '../../components/auth/RolePicker.jsx';
import { BloodGroupSelect, FormField } from '../../components/ui/FormField.jsx';
import { register } from '../../redux/authSlice.js';

// Admin accounts are created by the seed or `npm run create-admin`, not from this page.
const ROLES = ['donor', 'hospital', 'organisation'];

const NAME_FIELD = {
  donor: { field: 'name', label: 'Full name', placeholder: 'Your name' },
  hospital: { field: 'hospitalName', label: 'Hospital name', placeholder: 'e.g. City General Hospital' },
  organisation: { field: 'organisationName', label: 'Organisation name', placeholder: 'e.g. City Blood Bank' },
};

const EMPTY = {
  role: 'donor',
  name: '',
  hospitalName: '',
  organisationName: '',
  bloodGroup: '',
  email: '',
  password: '',
  website: '',
  address: '',
  phone: '',
};

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const nameField = NAME_FIELD[form.role];

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const { field } = nameField;
    // Send only the name field that belongs to the chosen role.
    const payload = {
      role: form.role,
      [field]: form[field],
      email: form.email,
      password: form.password,
      website: form.website,
      address: form.address,
      phone: form.phone,
      ...(form.role === 'donor' && { bloodGroup: form.bloodGroup }),
    };
    try {
      const { message } = await dispatch(register(payload)).unwrap();
      toast.success(message);
      navigate('/login');
    } catch (message) {
      toast.error(message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout aside={<RegisterAside />}>
      <form onSubmit={handleSubmit}>
        <h1 className="h3 mb-1">Create an account</h1>
        <p className="text-muted mb-4">Register as a donor, a hospital or a blood bank organisation.</p>

        <RolePicker roles={ROLES} value={form.role} onChange={(role) => setForm({ ...form, role })} />

        <FormField
          key={nameField.field}
          label={nameField.label}
          placeholder={nameField.placeholder}
          value={form[nameField.field]}
          onChange={update(nameField.field)}
          maxLength={120}
          required
        />
        {form.role === 'donor' && (
          <BloodGroupSelect
            label="Blood group (optional)"
            placeholder="I don't know yet"
            value={form.bloodGroup}
            onChange={update('bloodGroup')}
          />
        )}
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update('email')}
          required
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          minLength={8}
          maxLength={72}
          value={form.password}
          onChange={update('password')}
          required
        />
        <div className="row g-3">
          <FormField
            className="col-sm-6"
            label="Phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={update('phone')}
            required
          />
          <FormField
            className="col-sm-6"
            label="Website (optional)"
            placeholder="www.example.com"
            value={form.website}
            onChange={update('website')}
          />
        </div>
        <FormField
          className="my-3"
          label="Address"
          autoComplete="street-address"
          value={form.address}
          onChange={update('address')}
          maxLength={200}
          required
        />

        <button type="submit" className="btn btn-primary w-100 py-2" disabled={submitting}>
          {submitting && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          Register
        </button>
        <p className="text-center mt-3 mb-0">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
