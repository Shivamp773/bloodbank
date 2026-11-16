import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import API from '../services/api.js';
import { loggedOut } from './authSlice.js';

/** Counts shown next to sidebar items: pending blood requests and scheduled appointments. */
export const fetchBadges = createAsyncThunk('badges/fetch', async (_, { getState }) => {
  const role = getState().auth.user?.role;
  const counts = {};
  if (role === 'organisation' || role === 'hospital') {
    const { data } = await API.get('/requests/stats');
    counts.requests = data.stats.pending;
  }
  if (role === 'organisation' || role === 'donor') {
    const { data } = await API.get('/appointments/stats');
    counts.appointments = data.stats.scheduled;
  }
  return counts;
});

const empty = { requests: 0, appointments: 0 };

const badgesSlice = createSlice({
  name: 'badges',
  initialState: empty,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBadges.fulfilled, (state, { payload }) => ({ ...state, ...payload }))
      .addCase(loggedOut, () => empty);
  },
});

export default badgesSlice.reducer;
