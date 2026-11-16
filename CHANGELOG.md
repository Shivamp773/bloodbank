# Changelog

## 2.0.0

A rewrite of version 1 that keeps every existing feature, fixes its bugs and security problems, and adds
three features. Nothing needs configuring to run it locally.

### New features
- **Blood requests.** Hospitals request blood from an organisation, choosing from a list that shows how much
  each one holds. Organisations approve (the blood is issued through the normal stock check) or reject with
  a reason; hospitals can cancel while a request is pending. Sidebar badges count open requests.
- **Donation appointments.** Donors book a slot with any organisation. Organisations complete it (recorded as
  an IN entry), mark a no-show (only after the time has passed) or cancel. A 90-day minimum gap between
  donations is enforced for bookings, completed appointments and manual IN entries, and donors see their
  next eligible date.
- **Analytics dashboard.** Organisations get summary tiles, a stock-by-blood-group chart with their low-stock
  alert level, a 30-day received/issued chart and low-stock alerts with an adjustable threshold. The admin
  home page became a system-wide dashboard. Charts have tooltips and a table view.
- **Zero-config demo mode.** Without `MONGO_URL` the server starts a built-in MongoDB with demo accounts and
  realistic data; the login page lists the accounts.

### Security fixes
- Anyone could register as an admin. Admins now come only from the seed or `npm run create-admin`.
- Password hashes were sent to the browser (login, register, current user and every populated list).
  They are never serialised now.
- New inventory records trusted the `organisation` id sent by the browser. It now always comes from the
  logged-in account, and only organisations can create records.
- `POST /inventory/get-inventory-hospital` passed browser-supplied filters straight to MongoDB, so any
  logged-in user could read every record. History is now scoped on the server.
- After a page refresh, the Donation and Consumer pages requested records before the user had loaded; the
  empty filter was dropped and every user's records came back. Pages now wait for the user.
- Every input is validated with zod, which also blocks query-operator injection such as `{"$ne": null}`.
- Login checked the role before the password, revealing which role an email had; failed logins now look
  the same whether or not the account exists.
- Added helmet security headers and rate limiting on login/register; user-entered websites can no longer
  become `javascript:` links.
- `.env` is no longer tracked by git, and every variable is optional.

### Bug fixes
- The client called the API without the `/api/v1` prefix (the hard-coded Render URL could not reach this
  server's routes). It now calls `/api/v1` on the same origin.
- Two simultaneous OUT entries could oversell stock; now at most one succeeds.
- Approving a request or completing an appointment twice (double click) can no longer issue or record blood twice.
- Admins could delete themselves or other admins; deleting a user now keeps their history and closes their
  open requests and appointments.
- The server kept running without a database when MongoDB was unreachable; it now stops with a clear message.
- Unknown API routes returned the React page instead of a JSON 404.
- Wrong status codes everywhere (500 for bad passwords, 200 for duplicates); errors now use 400/401/403/404/409.
- `quantity` was not actually required (`require:` typo); donor names weren't required (the check looked for
  a non-existent `"user"` role); emails were case-sensitive.
- Analytics ran 16 queries and returned the blood groups in a random order (cards changed colour on reload).
- Client: `getCurrentUser` read `rejectWithValue` from the wrong argument; the register reducer crashed on
  success; the current user was refetched on every render; `alert()` was called during render on several
  pages; `navigate()` was called during render on the home page; a failed login wiped the form; any network
  error logged the user out.
- Client: the loading spinner never spun (missing `@keyframes`); the Consumer page's Website column was
  always empty; `class` instead of `className`; `<hr>` inside `<p>`; global CSS overrode Bootstrap classes;
  the fixed 350px sidebar broke on small screens; the About page email said `gamil.com`.
- Pages are now restricted by role (a donor could open admin pages).

### Behaviour changes
- IN entries accept only donor emails and OUT entries only hospital emails (v1 had these checks commented
  out), so organisation-to-organisation entries are no longer possible.
- The `donar` spelling is now `donor` everywhere (role value, field names, URLs such as `/donor-list`).
  Existing databases are migrated automatically on start.
- API routes were renamed to consistent REST paths (see the README); the client was updated to match.
- `alert()`/`prompt()` and full-page reloads were replaced with toasts, confirmation dialogs and in-place updates.

### Tooling
- Create React App (deprecated) → Vite 8; React 18 → 19, React Router 6 → 7, Redux Toolkit 1 → 2.
- Express 4 → 5, Mongoose 7 → 9, CommonJS → ES modules; nodemon and dotenv replaced by Node's built-in
  `--watch` and `.env` loading; unused dependencies (`vite` on the server, `body-parser`, `colors`,
  `punycode`, `moment` on the server, `toastify`) removed.
- npm workspaces: one `npm install` for everything; lockfile committed for reproducible installs.
- 54 API tests and 13 client tests, ESLint, and a GitHub Actions workflow.
- Bootstrap and icons are installed from npm instead of CDNs; images were compressed (1.4 MB → 80 KB), and the
  Register page's watermarked wallpaper banner was replaced with an original brand panel.
