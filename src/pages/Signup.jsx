import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import "./auth.css";

export default function Signup() {
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
        <h1>Create your account</h1>
        <p>Set up your business in minutes. Free for 14 days.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="business">Business name</label>
            <input
              id="business"
              type="text"
              placeholder="Acme Car Hire Ltd"
              autoComplete="organization"
              required
            />
          </div>
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
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Create account
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </main>
    </div>
  );
}
