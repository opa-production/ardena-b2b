import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import "./auth.css";

export default function Login() {
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    navigate("/dashboard");
  }

  return (
    <div className="auth">
      <header className="auth-nav">
        <Logo />
      </header>

      <main className="auth-card">
        <h1>Welcome back</h1>
        <p>Sign in to your business dashboard.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              type="email"
              placeholder="you@company.co.ke"
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Sign in
          </button>
        </form>

        <p className="auth-switch">
          New to Ardena? <Link to="/signup">Create an account</Link>
        </p>
      </main>
    </div>
  );
}
