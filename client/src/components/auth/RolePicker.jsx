import { Fragment } from 'react';
import { ROLE_LABELS } from '../../constants.js';

/** Segmented control for choosing a role (radio inputs under the hood, so it works with the keyboard). */
export default function RolePicker({ roles, value, onChange, name = 'role' }) {
  return (
    <fieldset className="mb-3">
      <legend className="form-label fw-semibold fs-6">I am a</legend>
      <div className="btn-group w-100 role-picker" role="group">
        {roles.map((role) => {
          const id = `${name}-${role}`;
          return (
            <Fragment key={role}>
              <input
                type="radio"
                className="btn-check"
                name={name}
                id={id}
                value={role}
                checked={value === role}
                onChange={() => onChange(role)}
              />
              <label className="btn btn-outline-primary" htmlFor={id}>
                {ROLE_LABELS[role]}
              </label>
            </Fragment>
          );
        })}
      </div>
    </fieldset>
  );
}
