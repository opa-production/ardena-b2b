import { Link } from "react-router-dom";
import Logo from "../components/Logo";

/* The two-panel frame Sign in and Request access share: the form on the cream
   panel on the left, and a deep green panel on the right pointing to the
   other page. Styles are the .split-* rules in auth.css.

   `swap` is that other page: { title, text, to, cta, prompt }. `prompt` is
   the one-line version shown under the form on phones, where the green
   panel is hidden. */
export default function AuthSplit({ title, lede, swap, children }) {
  return (
    <div className="split-auth">
      <main className="split-form-side">
        <Logo className="split-logo" />

        <div className="split-form-wrap">
          <h1>{title}</h1>
          {lede && <div className="split-lede">{lede}</div>}

          {children}

          <p className="split-mobile-switch">
            {swap.prompt} <Link to={swap.to}>{swap.cta}</Link>
          </p>
        </div>

        <p className="split-foot">© {new Date().getFullYear()} Ardena. All rights reserved.</p>
      </main>

      <aside className="split-dark">
        <div className="split-dark-copy">
          <h2>{swap.title}</h2>
          <p>{swap.text}</p>
          <Link to={swap.to} className="split-signin">
            {swap.cta}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </aside>
    </div>
  );
}
