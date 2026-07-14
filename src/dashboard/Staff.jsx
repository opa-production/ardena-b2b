import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import {
  fetchStaff,
  inviteStaff,
  resendInvite,
  deleteInvite,
  changeStaffRole,
  removeStaffMember,
  fetchActivityLog,
} from "../lib/api";
import Dropdown from "../components/Dropdown";
import { toast } from "./toastStore";
import "./fleet.css";
import "./bookings.css";
import "./workspace.css";

export const ROLES = ["Manager", "Booking agent", "Finance", "Viewer"];

export const ROLE_NOTES = [
  { role: "Owner", note: "Full access, including billing and staff." },
  { role: "Manager", note: "Everything except billing and workspace deletion." },
  { role: "Booking agent", note: "Creates and manages bookings and clients." },
  { role: "Finance", note: "Payments, refunds and payout reports." },
  { role: "Viewer", note: "Read-only across all modules." },
];

function fmtLastActive(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function fmtAt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}

export default function Staff() {
  const { pathname } = useLocation();
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logLoading, setLogLoading] = useState(false);

  const [confirming, setConfirming] = useState(null);  // { type: "remove"|"deleteInvite", id }
  const [busy, setBusy] = useState(null);
  const [roleEditing, setRoleEditing] = useState(null); // member id
  const [roleValue, setRoleValue] = useState("");

  const [role, setRole] = useState("Booking agent");
  const [inviteError, setInviteError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchStaff();
      setMembers(data.members || []);
      setInvites(data.invites || []);
    } catch (err) {
      toast(err.message || "Failed to load staff", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLog = useCallback(async (page = 1) => {
    setLogLoading(true);
    try {
      const data = await fetchActivityLog({ page, per_page: 20 });
      setLog(data.data || []);
      setLogTotal(data.total || 0);
      setLogPage(page);
    } catch {
      // silent — log is supplementary
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadLog(1);
  }, [load, loadLog]);

  async function handleInvite(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const email = f.get("email").trim();

    setInviteError("");
    setSubmitting(true);
    try {
      await inviteStaff({ name: f.get("name").trim(), email, role: f.get("role") });
      toast(`Invite sent to ${email}.`);
      form.reset();
      setRole("Booking agent");
      await load();
      await loadLog(1);
    } catch (err) {
      setInviteError(err.message || "Failed to send invite.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend(invite) {
    if (busy) return;
    setBusy(`resend-${invite.id}`);
    try {
      await resendInvite(invite.id);
      toast(`Invite resent to ${invite.email}.`);
    } catch (err) {
      toast(err.message || "Failed to resend invite.", "danger");
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteInvite(invite) {
    if (busy) return;
    setBusy(`del-inv-${invite.id}`);
    try {
      await deleteInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      setConfirming(null);
      toast(`Invite for ${invite.email} cancelled.`);
    } catch (err) {
      toast(err.message || "Failed to cancel invite.", "danger");
    } finally {
      setBusy(null);
    }
  }

  async function handleRoleChange(member) {
    if (busy || !roleValue || roleValue === member.role) {
      setRoleEditing(null);
      return;
    }
    setBusy(`role-${member.id}`);
    try {
      await changeStaffRole(member.id, roleValue);
      toast(`${member.name}'s role updated to ${roleValue}.`);
      setRoleEditing(null);
      await load();
      await loadLog(1);
    } catch (err) {
      toast(err.message || "Failed to change role.", "danger");
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove(member) {
    if (busy) return;
    setBusy(`remove-${member.id}`);
    try {
      await removeStaffMember(member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setConfirming(null);
      toast(`${member.name} removed from the team.`, "danger");
      await loadLog(1);
    } catch (err) {
      toast(err.message || "Failed to remove member.", "danger");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <PageSkeleton path={pathname} />;

  const logPages = Math.ceil(logTotal / 20);

  return (
    <>
      <div className="stat-grid fleet-stats">
        <article className="stat-card">
          <p className="stat-label">Active members</p>
          <p className="stat-value">{members.length}</p>
          <p className="stat-note">signed in and working</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Pending invites</p>
          <p className="stat-value">{invites.length}</p>
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
                <th>Last active</th>
                <th>Status</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <p className="strong">{m.name}</p>
                    <p className="cell-sub">{m.email}</p>
                  </td>
                  <td>
                    {roleEditing === m.id ? (
                      <Dropdown
                        value={roleValue}
                        onChange={setRoleValue}
                        options={ROLES}
                        name="role-edit"
                        id={`role-edit-${m.id}`}
                      />
                    ) : (
                      m.role
                    )}
                  </td>
                  <td>{fmtLastActive(m.last_active)}</td>
                  <td>
                    <span className="chip active">Active</span>
                  </td>
                  <td className="actions-cell">
                    {m.role === "Owner" ? (
                      <span className="cell-sub">Workspace owner</span>
                    ) : roleEditing === m.id ? (
                      <>
                        <button
                          type="button"
                          className="icon-btn prompt-green"
                          disabled={busy === `role-${m.id}`}
                          onClick={() => handleRoleChange(m)}
                        >
                          {busy === `role-${m.id}` ? "…" : "Save"}
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setRoleEditing(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : confirming?.type === "remove" && confirming.id === m.id ? (
                      <span className="confirm-inline">
                        Remove?
                        <button
                          type="button"
                          className="icon-btn danger"
                          disabled={busy === `remove-${m.id}`}
                          onClick={() => handleRemove(m)}
                        >
                          {busy === `remove-${m.id}` ? "…" : "Yes"}
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setConfirming(null)}
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => {
                            setRoleEditing(m.id);
                            setRoleValue(m.role);
                          }}
                        >
                          Change role
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => setConfirming({ type: "remove", id: m.id })}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {invites.length > 0 && (
            <>
              <header className="card-head" style={{ marginTop: "1.5rem" }}>
                <h2>Pending invites</h2>
                <p>Awaiting acceptance</p>
              </header>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invitee</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <p className="strong">{inv.name}</p>
                        <p className="cell-sub">{inv.email}</p>
                      </td>
                      <td>{inv.role}</td>
                      <td>
                        <span className="chip pending">Invited</span>
                      </td>
                      <td className="actions-cell">
                        {confirming?.type === "deleteInvite" && confirming.id === inv.id ? (
                          <span className="confirm-inline">
                            Cancel invite?
                            <button
                              type="button"
                              className="icon-btn danger"
                              disabled={busy === `del-inv-${inv.id}`}
                              onClick={() => handleDeleteInvite(inv)}
                            >
                              {busy === `del-inv-${inv.id}` ? "…" : "Yes"}
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => setConfirming(null)}
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="icon-btn prompt-green"
                              disabled={busy === `resend-${inv.id}`}
                              onClick={() => handleResend(inv)}
                            >
                              {busy === `resend-${inv.id}` ? "…" : "Resend"}
                            </button>
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() => setConfirming({ type: "deleteInvite", id: inv.id })}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
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
              {inviteError && <p className="form-error">{inviteError}</p>}
              <button type="submit" className="btn btn-primary pay-btn" disabled={submitting}>
                {submitting ? "Sending…" : "Send invite"}
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

      <section className="panel-card" style={{ marginTop: "1.5rem" }}>
        <header className="card-head">
          <h2>Activity log</h2>
          <p>Every action logged, always auditable</p>
        </header>
        {logLoading ? (
          <div className="empty-block fleet-empty"><p>Loading log…</p></div>
        ) : log.length === 0 ? (
          <div className="empty-block fleet-empty">
            <p>No activity yet. Actions taken by your team will appear here.</p>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {log.map((entry) => (
                  <tr key={entry.id}>
                    <td className="strong">{entry.actor}</td>
                    <td>{entry.action}</td>
                    <td>{entry.target || "—"}</td>
                    <td>{fmtAt(entry.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logPages > 1 && (
              <div className="pagination-row">
                <button
                  type="button"
                  className="icon-btn"
                  disabled={logPage <= 1}
                  onClick={() => loadLog(logPage - 1)}
                >
                  ← Prev
                </button>
                <span className="cell-sub">Page {logPage} of {logPages}</span>
                <button
                  type="button"
                  className="icon-btn"
                  disabled={logPage >= logPages}
                  onClick={() => loadLog(logPage + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
