import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Provider } from 'react-redux';
import { toast } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App.jsx';
import { store } from './redux/store.js';
import { logout } from './redux/authSlice.js';
import { installAuthInterceptor } from './services/api.js';

// Any 401 from the API (expired token, deleted account, server restarted in demo mode) ends the session.
installAuthInterceptor(() => {
  store.dispatch(logout());
  toast.info('Your session has ended. Please log in again.', { toastId: 'session-ended' });
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
