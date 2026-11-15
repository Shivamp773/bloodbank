import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice.js';
import badges from './badgesSlice.js';

/** Creates a store; tests pass `preloadedState` to start from a given user. */
export const makeStore = (preloadedState) => configureStore({ reducer: { auth, badges }, preloadedState });

export const store = makeStore();
