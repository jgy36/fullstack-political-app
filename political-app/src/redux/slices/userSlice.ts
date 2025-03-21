/* eslint-disable @typescript-eslint/no-explicit-any */
// Enhanced: political-app/src/redux/slices/userSlice.ts

import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { getCookie, setCookie, deleteCookie } from "cookies-next";

// Define the RootState type (to fix the RootState error)
interface RootState {
  user: UserState;
  // Add other state slices as needed
}

// Define the initial state
interface UserState {
  id: number | null;
  token: string | null;
  username: string | null;
  email: string | null; // Add this line to include email
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  id: null,
  token: null,
  username: null,
  email: null, // Initialize email as null
  loading: false,
  error: null,
};

// Restore auth state from local storage/cookies
export const restoreAuthState = createAsyncThunk(
  "user/restoreAuthState",
  async (_, { rejectWithValue }) => {
    try {
      // First try to get token from localStorage (for better persistence)
      let token = null;
      let username = null;
      let userId = null;
      let email = null;

      // Try localStorage first (better persistence)
      if (typeof window !== "undefined") {
        token = localStorage.getItem("token");
        username = localStorage.getItem("username");
        email = localStorage.getItem("email");
        const storedId = localStorage.getItem("userId");
        userId = storedId ? parseInt(storedId) : null;
      }

      // If not in localStorage, try cookies
      if (!token && typeof getCookie === "function") {
        try {
          token = (getCookie("token") as string) || null;
          username = (getCookie("username") as string) || null;
          email = (getCookie("email") as string) || null;
          const cookieId = getCookie("userId");
          userId = cookieId ? Number(cookieId) : null;
        } catch (cookieError) {
          console.error("Error reading cookies:", cookieError);
        }
      }

      // Return the auth data
      return {
        id: userId,
        token,
        username: username || "User",
        email: email || null,
      };
    } catch (error) {
      console.error("Uncaught error in restoreAuthState:", error);
      return rejectWithValue("Failed to restore authentication state");
    }
  }
);

// Define async login
export const loginUser = createAsyncThunk(
  "user/login",
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.user) {
        throw new Error(data.message || "Login failed");
      }

      // Persist data immediately after successful login
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.user.username || "User");
        localStorage.setItem("userId", String(data.user.id));
        localStorage.setItem("email", email); // Store the email too

        // Also set cookies as fallback
        setCookie("token", data.token, { path: "/" });
        setCookie("username", data.user.username || "User", { path: "/" });
        setCookie("userId", String(data.user.id), { path: "/" });
        setCookie("email", email, { path: "/" }); // Store email in cookie too
      }

      return {
        id: data.user?.id || null,
        username: data.user?.username || "Unknown",
        email: email, // Return the email in the result
        token: data.token || null,
      };
    } catch (error) {
      console.error("Login error:", error);
      return rejectWithValue((error as Error).message);
    }
  }
);

// Define async register
export const registerUser = createAsyncThunk(
  "user/register",
  async (
    {
      username,
      email,
      password,
    }: { username: string; email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch("http://localhost:8080/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Add this new thunk to update the username
export const updateUserProfile = createAsyncThunk(
  "user/updateProfile",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      if (!state.user.token) {
        throw new Error("Not authenticated");
      }

      // Get the latest user profile from the API
      const response = await fetch("http://localhost:8080/api/users/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.user.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to refresh user profile");
      }

      const userData = await response.json();

      // Update localStorage and cookies with newest data
      if (typeof window !== "undefined") {
        localStorage.setItem("username", userData.username || "User");

        // Also set cookies as fallback
        setCookie("username", userData.username || "User", { path: "/" });
      }

      return {
        id: userData.id || state.user.id,
        username: userData.username || "Unknown",
        token: state.user.token, // Keep existing token
      };
    } catch (error) {
      console.error("Profile refresh error:", error);
      return rejectWithValue((error as Error).message);
    }
  }
);

// Persist auth data helper function
const persistAuthData = (id: number | null, token: string | null, username: string | null, email: string | null) => {
  if (typeof window !== "undefined") {
    try {
      if (token && username && id !== null) {
        // Persist to localStorage (better for persistence)
        localStorage.setItem("token", token);
        localStorage.setItem("username", username);
        localStorage.setItem("userId", String(id));
        if (email) {
          localStorage.setItem("email", email);
        }
        
        // Also set cookies as fallback
        setCookie("token", token, { path: "/" });
        setCookie("username", username, { path: "/" });
        setCookie("userId", String(id), { path: "/" });
        if (email) {
          setCookie("email", email, { path: "/" });
        }
      } else {
        // Clear data
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("userId");
        localStorage.removeItem("email");
        deleteCookie("token");
        deleteCookie("username");
        deleteCookie("userId");
        deleteCookie("email");
      }
    } catch (error) {
      console.error('Error persisting auth data:', error);
    }
  }
};

// Create slice
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    logoutUser: (state) => {
      state.id = null;
      state.token = null;
      state.username = null;
      state.email = null; // Clear email field
      state.loading = false;
      state.error = null;

      // Clear persisted data
      persistAuthData(null, null, null, null); // Update this function to handle email
    },
  },

  extraReducers: (builder) => {
    // Login states
    builder.addCase(loginUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(
      loginUser.fulfilled,
      (
        state,
        action: PayloadAction<{
          id: number;
          token: string;
          username: string;
          email: string;
        }>
      ) => {
        state.id = action.payload.id;
        state.token = action.payload.token;
        state.username = action.payload.username;
        state.email = action.payload.email;
        state.loading = false;
        state.error = null;
      }
    );

    builder.addCase(loginUser.rejected, (state, action) => {
      state.loading = false;
      state.error = (action.payload as string) || "Login failed";
    });

    // Restore auth state
    builder.addCase(restoreAuthState.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(
      restoreAuthState.fulfilled,
      (
        state,
        action: PayloadAction<{
          id: number | null;
          token: string | null;
          username: string | null;
          email: string | null;
        }>
      ) => {
        state.id = action.payload.id;
        state.token = action.payload.token;
        state.username = action.payload.username;
        state.email = action.payload.email;
        state.loading = false;
        state.error = null;
      }
    );

    builder.addCase(restoreAuthState.rejected, (state, action) => {
      state.id = null;
      state.token = null;
      state.username = null;
      state.email = null;
      state.loading = false;
      state.error =
        (action.payload as string) || "Failed to restore auth state";
    });

    // Handle updateUserProfile
    builder.addCase(updateUserProfile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(
      updateUserProfile.fulfilled,
      (
        state,
        action: PayloadAction<{
          id: number;
          token: string;
          username: string;
          email?: string;
        }>
      ) => {
        state.id = action.payload.id;
        state.username = action.payload.username;
        // Only update email if it's provided
        if (action.payload.email) {
          state.email = action.payload.email;
        }
        // Don't change the token
        state.loading = false;
        state.error = null;
      }
    );

    builder.addCase(updateUserProfile.rejected, (state, action) => {
      state.loading = false;
      state.error = (action.payload as string) || "Failed to update profile";
    });
  },
});

export const { logoutUser } = userSlice.actions;
export default userSlice.reducer;
