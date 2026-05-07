import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (token) {
    return <Navigate to="/chat" replace />;
  }

  const handleChange = (key) => (event) => {
    setForm((previous) => ({
      ...previous,
      [key]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form);
      navigate("/chat", { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-full place-items-center px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-app-900/80 p-6 shadow-pane backdrop-blur">
        <h1 className="text-2xl font-semibold text-slate-100">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-400">Sign in to continue your conversations.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            value={form.email}
            onChange={handleChange("email")}
            placeholder="Email"
            className="w-full rounded-xl border border-white/10 bg-app-800 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400"
            required
          />
          <input
            type="password"
            value={form.password}
            onChange={handleChange("password")}
            placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-app-800 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400"
            required
          />

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-400">
          New here?{" "}
          <Link to="/register" className="font-semibold text-violet-300 hover:text-violet-200">
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
}

