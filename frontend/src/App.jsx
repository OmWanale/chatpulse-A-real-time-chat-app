import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Chat from "./pages/Chat.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

function RequireAuth({ children }) {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RootRedirect() {
  const { token } = useAuth();
  return <Navigate to={token ? "/chat" : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/chat"
        element={
          <RequireAuth>
            <Chat />
          </RequireAuth>
        }
      />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

