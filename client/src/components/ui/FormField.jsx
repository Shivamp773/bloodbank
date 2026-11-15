import { useId } from 'react';
import { BLOOD_GROUPS } from '../../constants.js';

/** Label + input. Any extra props (type, required, min, autoComplete, ...) go to the <input>. */
export function FormField({ label, hint, className = 'mb-3', ...inputProps }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="form-label fw-semibold">
        {label}
      </label>
      <input id={id} className="form-control" {...inputProps} />
      {hint && <div className="form-text">{hint}</div>}
    </div>
  );
}

export function TextAreaField({ label, hint, className = 'mb-3', ...props }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="form-label fw-semibold">
        {label}
      </label>
      <textarea id={id} className="form-control" rows={2} {...props} />
      {hint && <div className="form-text">{hint}</div>}
    </div>
  );
}

export function SelectField({ label, hint, className = 'mb-3', children, ...props }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="form-label fw-semibold">
        {label}
      </label>
      <select id={id} className="form-select" {...props}>
        {children}
      </select>
      {hint && <div className="form-text">{hint}</div>}
    </div>
  );
}

export function BloodGroupSelect({ label = 'Blood group', placeholder = 'Choose a blood group', ...props }) {
  return (
    <SelectField label={label} {...props}>
      <option value="">{placeholder}</option>
      {BLOOD_GROUPS.map((group) => (
        <option key={group} value={group}>
          {group}
        </option>
      ))}
    </SelectField>
  );
}
