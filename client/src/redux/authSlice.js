import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import API, { getErrorMessage, tokenStorage } from '../services/api.js';

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await API.post('/auth/login', credentials);
    tokenStorage.set(data.token);
    return data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const register = createAsyncThunk('auth/register', async (form, { rejectWithValue }) => {
  try {
    const { data } = await API.post('/auth/register', form);
    return data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await API.get('/auth/current-user');
      return data.user;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
  // Never run two lookups at once (React StrictMode runs effects twice in development).
  { condition: (_, { getState }) => getState().auth.userStatus !== 'loading' },
);

const signedOut = { token: null, user: null, userStatus: 'idle', userError: null };

const authSlice = createSlice({
  name: 'auth',
  initialState: { ...signedOut, token: tokenStorage.get() },
  reducers: {
    loggedOut: () => signedOut,
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.fulfilled, (state, { payload }) => {
        state.token = payload.token;
        state.user = payload.user;
        state.userStatus = 'succeeded';
        state.userError = null;
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.userStatus = 'loading';
        state.userError = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, { payload }) => {
        state.user = payload;
        state.userStatus = 'succeeded';
      })
      .addCase(fetchCurrentUser.rejected, (state, { payload }) => {
        state.userStatus = 'failed';
        state.userError = payload ?? 'Could not load your account';
      });
  },
});

export const { loggedOut } = authSlice.actions;

/** Ends the session: forgets the token and clears the store. */
export const logout = () => (dispatch) => {
  tokenStorage.clear();
  dispatch(loggedOut());
};

export default authSlice.reducer;
