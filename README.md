# Blood Bank

A blood bank management web app built on the MERN stack (MongoDB, Express, React, Node.js).
Blood bank **organisations** manage their blood stock, **donors** book donation appointments,
**hospitals** request blood, and **admins** oversee everything.

It runs on any laptop with **no configuration**: without a database URL the server starts a temporary
built-in MongoDB and fills it with demo accounts and ten months of sample activity.

## Quick start

You need **Node.js 22.13+ or 24 LTS** ([download](https://nodejs.org)). Then:

```bash
npm install     # installs the server and the client (one command for both)
npm run dev     # starts the API on :8080 and the web app on :5173
```

Open **http://localhost:5173** and pick one of the demo accounts shown on the login page.

> The first `npm install` also downloads MongoDB for the built-in demo database
> (about 780 MB on Windows, 80–120 MB on macOS/Linux). It is cached, so this happens once.

### Demo accounts

All demo accounts use the password **`Demo@1234`**. Select the matching role on the login page
(clicking an account in the "Demo accounts" panel fills everything in).

| Role | Email | Try this |
|---|---|---|
| Organisation | `city@bloodbank.test` | Approve the urgent O+ request, try the AB- one (not enough stock), record a donation, complete an appointment, open Analytics |
| Hospital | `stmarys@bloodbank.test` | Request blood (organisations are listed with their stock), cancel a pending request, see received blood |
| Donor | `aarav@bloodbank.test` | Check eligibility and book a donation appointment |
| Admin | `admin@bloodbank.test` | System dashboard; browse and delete donors, hospitals and organisations |

Demo data is regenerated every time the server restarts. More accounts exist (e.g. `hope@bloodbank.test`,
`greenvalley@bloodbank.test`); every donor is `<first name>@bloodbank.test`.

## Screenshots

<p align="center">
  <img src="images%20folder/login.png" alt="Login page with the demo accounts panel" width="49%">
  <img src="images%20folder/register.png" alt="Register page" width="49%">
  <img src="images%20folder/inventory.png" alt="Organisation inventory with filters and low-stock alert" width="49%">
  <img src="images%20folder/blood-requests.png" alt="Blood requests from hospitals, with stock next to each request" width="49%">
  <img src="images%20folder/analytics.png" alt="Analytics dashboard with stock and 30-day trend charts" width="49%">
  <img src="images%20folder/admin-dashboard.png" alt="Admin dashboard with system-wide numbers" width="49%">
  <img src="images%20folder/appointments.png" alt="Donor appointments with eligibility and booking" width="49%">
  <img src="images%20folder/about.png" alt="About page" width="49%">
</p>

## Features

**Organisations (blood banks)**
- Inventory: record blood received from donors (IN) and issued to hospitals (OUT), with filters, search and paging.
  Stock is checked before every issue and can never go negative, even with simultaneous requests.
- Donors and hospitals they work with, with totals and last activity.
- **Blood requests:** approve (issues the blood automatically) or reject with a reason.
- **Appointments:** see booked donations; mark them completed (recorded as stock), no-show or cancelled.
- **Analytics:** stock by blood group, 30-day received/issued trend, low-stock alerts with an adjustable threshold.

**Hospitals**
- **Blood requests:** ask any organisation for blood, seeing how much each one holds; track status; cancel.
- Received blood and the organisations that supplied it.

**Donors**
- **Appointments:** book a slot with any organisation. Donations must be at least **90 days** apart; the app
  shows the next eligible date and blocks earlier bookings or donations.
- Donation history and totals.

**Admins**
- Dashboard with system-wide counts, stock and activity.
- Lists of donors, hospitals and organisations, with delete (past records are kept, open requests and
  appointments are closed). Admin accounts can't be created from the Register page.

## Scripts

Run from the repository root.

| Command | What it does |
|---|---|
| `npm run dev` | API (auto-restarts on changes) + web app with hot reload |
| `npm test` | API tests (in-memory MongoDB) and client tests |
| `npm run lint` | ESLint for the server and the client |
| `npm run build` | Production build of the client into `client/dist` |
| `npm start` | Runs the API; after `npm run build` it also serves the app on http://localhost:8080 |
| `npm run seed` | Loads demo data into the database at `MONGO_URL` (`-- --reset` wipes it first) |
| `npm run create-admin -- --email a@b.com --password "..."` | Creates an admin account in the database at `MONGO_URL` |

## Configuration

Nothing is required. To change a default, copy `.env.example` to `.env` in the repository root.

| Variable | Default | Notes |
|---|---|---|
| `MONGO_URL` | built-in demo database | Set it to keep data between restarts (local MongoDB or Atlas) |
| `JWT_SECRET` | random per start | Set it so logins survive restarts; required in production |
| `PORT` | `8080` | API port; the dev web app proxies `/api` to it automatically |
| `NODE_ENV` | `development` | `production` requires `MONGO_URL` and `JWT_SECRET` |

**Using your own MongoDB:** set `MONGO_URL`, then optionally `npm run seed` for demo data and
`npm run create-admin -- --email you@example.com --password "a-strong-password"` for an admin.
Databases created by version 1 of this app are upgraded automatically on start.
If you will always use your own MongoDB, you can skip the demo-database download with
`MONGOMS_DISABLE_POSTINSTALL=1 npm install`.

## Project structure

```
├── client/                 React 19 + Vite + Redux Toolkit + React Router + Bootstrap 5
│   └── src/
│       ├── components/     layout, route guards, shared UI, charts (Recharts)
│       ├── pages/          one folder per role, plus requests/ and appointments/
│       ├── redux/          auth and sidebar-badge state
│       ├── hooks/useApi.js data fetching with loading/error/reload
│       └── services/api.js axios instance (token, 401 handling, error messages)
├── server/                 Express 5 + Mongoose 9 (ES modules)
│   ├── app.js / server.js  app setup / startup (database, demo data, graceful shutdown)
│   ├── config/             environment defaults, database connection, constants
│   ├── models/             User, Inventory, BloodRequest, Appointment
│   ├── controllers/        request handlers
│   ├── routes/             URL → controller, with auth and role checks
│   ├── services/           stock and donor-eligibility rules
│   ├── validation/         zod schemas for every input
│   ├── seed/               demo data, v1 migration, CLI scripts
│   └── tests/              API tests (node:test + supertest + in-memory MongoDB)
└── .github/workflows/      CI: lint, test and build on every push
```

## API overview

All endpoints are under `/api/v1` and return JSON `{ success, message?, ... }`. Authenticated endpoints need
`Authorization: Bearer <token>` from the login response.

| Area | Endpoints | Who |
|---|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/current-user` | everyone |
| Inventory | `POST /inventory`, `GET /inventory`, `GET /inventory/recent`, `GET /inventory/donors`, `GET /inventory/hospitals` | organisation |
| | `GET /inventory/history`, `GET /inventory/organisations` | donor, hospital |
| | `GET /inventory/availability?bloodGroup=` | hospital, organisation |
| Requests | `POST /requests`, `PATCH /requests/:id/cancel` | hospital |
| | `PATCH /requests/:id/approve`, `PATCH /requests/:id/reject` | organisation |
| | `GET /requests`, `GET /requests/stats` | hospital, organisation |
| Appointments | `GET /appointments/eligibility`, `POST /appointments` | donor |
| | `PATCH /appointments/:id/complete`, `PATCH /appointments/:id/no-show` | organisation |
| | `GET /appointments`, `GET /appointments/stats`, `PATCH /appointments/:id/cancel` | donor, organisation |
| Analytics | `GET /analytics/blood-groups`, `GET /analytics/overview`, `PATCH /analytics/settings` | organisation |
| Admin | `GET /admin/overview`, `GET /admin/users?role=`, `DELETE /admin/users/:id` | admin |
| Other | `GET /organisations`, `GET /meta`, `GET /meta/health` | logged in / public |

## Deployment

### Vercel

[`vercel.json`](vercel.json) builds the client into `client/dist` and runs the API as a serverless function
([`api/index.mjs`](api/index.mjs)). The built-in demo database can't run on Vercel, so in the Vercel project
open **Settings → Environment Variables** and add, for Production and Preview:

- `MONGO_URL`: a MongoDB connection string, e.g. from a free [MongoDB Atlas](https://www.mongodb.com/atlas)
  cluster. In Atlas, allow network access from anywhere (`0.0.0.0/0`), because Vercel has no fixed IPs.
- `JWT_SECRET`: a long random string, e.g. the output of
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

Then redeploy. Until both are set, the API answers with a message naming what is missing.
To give the live site demo accounts, put the same `MONGO_URL` in a local `.env` and run `npm run seed`:
the login page then lists the demo accounts (anyone visiting the site can use them).

### Single Node server (e.g. Render)

The server also serves the built client, so one web service is enough:

- **Build command:** `npm ci --include=dev && npm run build`
- **Start command:** `npm start`
- **Environment:** `NODE_ENV=production`, `MONGO_URL=<your MongoDB URL>`, `JWT_SECRET=<long random string>`

## Tech stack

React 19, React Router 7, Redux Toolkit 2, Vite 8, Bootstrap 5, Recharts 3, react-toastify, dayjs ·
Node.js, Express 5, Mongoose 9, zod, JSON Web Tokens, bcrypt, helmet, express-rate-limit ·
node:test, supertest, mongodb-memory-server, Vitest, Testing Library, ESLint, GitHub Actions.

See [CHANGELOG.md](CHANGELOG.md) for everything that changed from version 1.
