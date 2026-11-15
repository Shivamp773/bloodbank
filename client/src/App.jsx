import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { ToastContainer } from 'react-toastify';
import Spinner from './components/ui/Spinner.jsx';
import ProtectedRoute from './components/routes/ProtectedRoute.jsx';
import PublicRoute from './components/routes/PublicRoute.jsx';
import RequireRole from './components/routes/RequireRole.jsx';
import Layout from './components/layout/Layout.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Inventory from './pages/organisation/Inventory.jsx';
import Donors from './pages/organisation/Donors.jsx';
import Hospitals from './pages/organisation/Hospitals.jsx';
import Requests from './pages/requests/Requests.jsx';
import Appointments from './pages/appointments/Appointments.jsx';
import Organisations from './pages/common/Organisations.jsx';
import Donations from './pages/donor/Donations.jsx';
import Received from './pages/hospital/Received.jsx';
import UserList from './pages/admin/UserList.jsx';
import About from './pages/common/About.jsx';
import NotFound from './pages/common/NotFound.jsx';

// The dashboards pull in the charting library, so they load on demand.
const Analytics = lazy(() => import('./pages/organisation/Analytics.jsx'));
const AdminHome = lazy(() => import('./pages/admin/AdminHome.jsx'));

const withSuspense = (element) => <Suspense fallback={<Spinner />}>{element}</Suspense>;

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route element={<RequireRole roles={['organisation']} />}>
            <Route index element={<Inventory />} />
            <Route path="donor" element={<Donors />} />
            <Route path="hospital" element={<Hospitals />} />
            <Route path="analytics" element={withSuspense(<Analytics />)} />
          </Route>
          <Route element={<RequireRole roles={['organisation', 'hospital']} />}>
            <Route path="requests" element={<Requests />} />
          </Route>
          <Route element={<RequireRole roles={['organisation', 'donor']} />}>
            <Route path="appointments" element={<Appointments />} />
          </Route>
          <Route element={<RequireRole roles={['donor', 'hospital']} />}>
            <Route path="organisation" element={<Organisations />} />
          </Route>
          <Route element={<RequireRole roles={['donor']} />}>
            <Route path="donation" element={<Donations />} />
          </Route>
          <Route element={<RequireRole roles={['hospital']} />}>
            <Route path="consumer" element={<Received />} />
          </Route>
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="admin" element={withSuspense(<AdminHome />)} />
            <Route path="donor-list" element={<UserList role="donor" />} />
            <Route path="hospital-list" element={<UserList role="hospital" />} />
            <Route path="org-list" element={<UserList role="organisation" />} />
          </Route>
          <Route path="about" element={<About />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3500} newestOnTop />
    </>
  );
}
