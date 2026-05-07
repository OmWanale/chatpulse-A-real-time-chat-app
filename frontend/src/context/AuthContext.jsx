import { createContext, useContext, useMemo, useState } from "react";
import { loginRequest, registerRequest } from "../services/api.js";
import { disconnectSocket } from "../services/socket.js";

const AuthContext = createContext(null);

const USER_KEY = "chat_user";
const TOKEN_KEY = "chat_token";

function getInitialSession() {
  const savedUser = localStorage.getItem(USER_KEY);
  const savedToken = localStorage.getItem(TOKEN_KEY);

  if (!savedUser || !savedToken) {
    return { user: null, token: "" };
  }

  try {
    return {
      user: JSON.parse(savedUser),
      token: savedToken
    };
  } catch {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    return { user: null, token: "" };
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getInitialSession().user);
  const [token, setToken] = useState(() => getInitialSession().token);

  const saveSession = (payload) => {
    setUser(payload.user);
    setToken(payload.token);
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    localStorage.setItem(TOKEN_KEY, payload.token);
  };

  const login = async (credentials) => {
    const data = await loginRequest(credentials);
    saveSession({
      user: {
        _id: data._id,
        name: data.name,
        email: data.email,
        profilePic: data.profilePic
      },
      token: data.token
    });
  };

  const register = async (payload) => {
    const data = await registerRequest(payload);
    saveSession({
      user: {
        _id: data._id,
        name: data.name,
        email: data.email,
        profilePic: data.profilePic
      },
      token: data.token
    });
  };

  const logout = () => {
    disconnectSocket();
    setUser(null);
    setToken("");
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout
    }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

