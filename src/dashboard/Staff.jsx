import { useState, useSyncExternalStore } from "react";
import {
  subscribe,
  getStaff,
  findByEmail,
  inviteStaff,
  removeStaff,
  ROLES,
  ROLE_NOTES,
} from "./staffStore";
import Dropdown from "../components/Dropdown";
import { toast } from "./toastStore";
import "./fleet.css";
import "./bookings.css";
import "./workspace.css";

export default function Staff() {
  const staff = useSyncExternalStore(subscribe, getStaff);
  const [confirming, setConfirming] = useState(null);
  const [error, setError] = useState("");
  const [role, setRole] = useState("Booking agent");

  const active = staff.filter((s) => s.status === "Active").length;
  const pending = staff.length - active;

  function handleInvite(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const email = f.get("email").trim();

    if (findByEmail(email)) {
      setError(`${email} is already on the team.`);

      return;
    }

    inviteStaff({
      name: f.get("name").trim(),
      email,
      role: f.get("role"),
    });
    setError("");
    toast(`Invite sent to ${email}.`);
    form.reset();
    setRole("Booking agent");
  }

  return (
    <>
      <div className="stat-grid fleet-stats">
        <article className="stat-card">
          <p className="stat-label">Active members</p>
          <p className="stat-value">{active}</p>
          <p className="stat-note">signed in and working</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Pending invites</p>
          <p className="stat-value">{pending}</p>
          <p className="stat-note">waiting to accept</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Seats</p>
          <p className="stat-value">Unlimited</p>
          <p className="stat-note">included on the Fleet plan</p>
        </article>
      </div>

      <div className="details-grid">
        <section className="panel-card">
          <header className="card-head">
            <h2>Team</h2>
            <p>Everyone with access to this workspace</p>
          </header>
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>
                    <p className="strong">{s.name}</p>
                    <p className="cell-sub">{s.email}</p>
                  </td>
                  <td>{s.role}</td>
                  <td>
                    <span className={`chip ${s.status === "Active" ? "active" : "pending"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="actions-cell">
                    {s.role === "Owner" ? (
                      <span className="cell-sub">Workspace owner</span>
                    ) : confirming === s.id ? (
                      <span className="confirm-inline">
                        Remove?
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => {
                            removeStaff(s.id);
                            setConfirming(null);
                            toast(`${s.name} removed from the team.`, "danger");
                          }}
                        >
                          Yes
                        </button>
                        <button type="button" className="icon-btn" onClick={() => setConfirming(null)}>
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => setConfirming(s.id)}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="details-side">
          <section className="panel-card">
            <header className="card-head">
              <h2>Invite a teammate</h2>
              <p>They'll get an email to join this workspace</p>
            </header>
            <form className="invite-form" onSubmit={handleInvite}>
              <div className="field">
                <label htmlFor="s-name">Full name</label>
                <input id="s-name" name="name" type="text" placeholder="Jane Wairimu" required />
              </div>
              <div className="field">
                <label htmlFor="s-email">Work email</label>
                <input id="s-email" name="email" type="email" placeholder="jane@acmecarhire.co.ke" required />
              </div>
              <div className="field">
                <label htmlFor="s-role">Role</label>
                <Dropdown
                  id="s-role"
                  name="role"
                  value={role}
                  onChange={setRole}
                  options={ROLES}
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn btn-primary pay-btn">
                Send invite
              </button>
            </form>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>What each role can do</h2>
              <p>Permissions are fixed per role for now</p>
            </header>
            <ul className="role-list">
              {ROLE_NOTES.map((r) => (
                <li key={r.role}>
                  <strong>{r.role}</strong>
                  <span>{r.note}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
