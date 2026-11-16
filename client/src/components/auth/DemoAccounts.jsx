import { ROLE_LABELS } from '../../constants.js';

/** Shown on the login page whenever the demo data is loaded (built-in demo database or `npm run seed`). */
export default function DemoAccounts({ accounts, resetsOnRestart, onPick }) {
  if (!accounts?.length) return null;
  return (
    <div className="card demo-accounts mt-4">
      <div className="card-body pb-2">
        <h2 className="h6 mb-1">Demo accounts</h2>
        <p className="small-muted mb-2">
          Click one to fill in the form. Password for all: <code>{accounts[0].password}</code>
        </p>
      </div>
      <ul className="list-group list-group-flush">
        {accounts.map((account) => (
          <li key={account.email} className="list-group-item list-group-item-action p-0">
            <button
              type="button"
              className="btn w-100 text-start d-flex justify-content-between align-items-center px-3 py-2"
              onClick={() => onPick(account)}
            >
              <span>
                <strong>{account.label}</strong>
                <br />
                <span className="small-muted">{account.email}</span>
              </span>
              <span className="badge text-bg-light border">{ROLE_LABELS[account.role]}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="card-body pt-2">
        <p className="small-muted mb-0">
          {resetsOnRestart
            ? 'Demo data resets whenever the server restarts.'
            : 'These accounts share demo data, so other visitors may change it.'}
        </p>
      </div>
    </div>
  );
}
