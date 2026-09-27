/* Reports: a list of PDF reports, one row per area of the business.
 *
 * Pick a period on a row and Generate. The server renders the PDF (charts
 * live inside it, not on this page) and keeps it, so View, Download and
 * Email all hand over the exact file that was generated. Everything
 * generated so far is listed underneath.
 *
 * The categories come from the server (GET /reports/catalog), so a new
 * report is a backend change only. FALLBACK_CATALOG keeps the page usable if
 * that call fails.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import RefreshButton from "../components/RefreshButton";
import Dropdown from "../components/Dropdown";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  deleteReport,
  emailReport,
  fetchReportCatalog,
  fetchReportPdf,
  fetchReports,
  generateReport,
} from "../lib/api";
import { getSession } from "../lib/authStore";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import "../components/confirm.css";
import "./bookings.css";
import "./fleet.css";
import "./reports.css";

const GROUPS = ["Business", "Money", "Fleet", "Customers", "Operations"];

const FALLBACK_CATALOG = [
  { type: "summary", group: "Business", title: "Business summary", description: "Revenue, bookings, utilisation, top cars and clients, and the change from the previous period." },
  { type: "revenue", group: "Money", title: "Revenue and payments", description: "Money collected by method, by week and by staff member." },
  { type: "receivables", group: "Money", title: "Money owed", description: "Unpaid and part-paid trips by age, oldest first." },
  { type: "deposits", group: "Money", title: "Deposits", description: "Deposits held, refunded and forfeited, and what is due back." },
  { type: "wallet", group: "Money", title: "Wallet statement", description: "Top-ups, spend on checks and SMS, opening and closing balance." },
  { type: "utilisation", group: "Fleet", title: "Fleet utilisation", description: "Booked and idle days per car, busiest and idlest cars." },
  { type: "vehicles", group: "Fleet", title: "Vehicle performance", description: "Revenue per car, per available day, and trips per car." },
  { type: "bookings", group: "Operations", title: "Bookings", description: "Bookings by status and source, rental length, lead time and busiest days." },
  { type: "verification", group: "Operations", title: "Renter verification", description: "Checks run, pass and fail rates, top failure reasons and cost." },
  { type: "clients", group: "Customers", title: "Clients", description: "New and returning clients, top spenders, repeat rate and lapsed clients." },
];

const PERIODS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "last-month", label: "Last month" },
  { value: "custom", label: "Custom dates" },
];

const isoLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtDay = (iso) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-KE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

const fmtWhen = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-KE", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const fmtSize = (b) =>
  !b ? "" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

// A period choice -> { from, to }, or null when custom dates are incomplete.
function resolvePeriod(period, custom) {
  const today = new Date();
  if (period === "custom") {
    if (!custom.from || !custom.to || custom.from > custom.to) return null;
    return { from: custom.from, to: custom.to };
  }
  if (period === "last-month") {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: isoLocal(first), to: isoLocal(last) };
  }
  const from = new Date(today);
  from.setDate(from.getDate() - (Number(period) - 1));
  return { from: isoLocal(from), to: isoLocal(today) };
}

const fileName = (r) => `ardena-${r.type}-${r.period_start}-to-${r.period_end}.pdf`;

/* One PDF blob per report id for the life of the page, so View then Download
   doesn't fetch twice. Object URLs are revoked when the page unmounts. */
function usePdfCache() {
  const cache = useRef(new Map());
  useEffect(() => {
    const map = cache.current;
    return () => map.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  return useCallback(async (id) => {
    const hit = cache.current.get(id);
    if (hit) return hit;
    const blob = await fetchReportPdf(id);
    const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
    cache.current.set(id, url);
    return url;
  }, []);
}

function PdfViewer({ report, getUrl, onDownload, onEmail, onClose }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getUrl(report.id)
      .then((u) => live && setUrl(u))
      .catch((err) => live && setError(err.message || "Couldn't open this report"));
    return () => {
      live = false;
    };
  }, [report.id, getUrl]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !document.querySelector(".rp-email-overlay") && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay rp-viewer-overlay" onMouseDown={onClose}>
      <div
        className="rp-viewer"
        role="dialog"
        aria-modal="true"
        aria-label={report.title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="rp-viewer-bar">
          <div className="rp-viewer-title">
            <p className="strong">{report.title}</p>
            <p className="cell-sub">
              {fmtDay(report.period_start)} to {fmtDay(report.period_end)}
            </p>
          </div>
          <div className="rp-viewer-actions">
            <button type="button" className="btn btn-ghost modal-btn" onClick={() => onEmail(report)}>
              Email
            </button>
            <button type="button" className="btn btn-primary modal-btn" onClick={() => onDownload(report)}>
              Download
            </button>
            <button type="button" className="rp-viewer-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </header>
        <div className="rp-viewer-body">
          {error ? (
            <p className="field-note rp-viewer-msg">{error}</p>
          ) : url ? (
            <iframe title={report.title} src={url} className="rp-viewer-frame" />
          ) : (
            <p className="field-note rp-viewer-msg">Opening report…</p>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailDialog({ report, onClose }) {
  const [to, setTo] = useState(getSession().user?.email || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    const list = to
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!list.length) return setError("Add at least one email address.");
    if (list.length > 5) return setError("Send to up to 5 people at a time.");
    const bad = list.find((s) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
    if (bad) return setError(`${bad} doesn't look like an email address.`);
    setBusy(true);
    setError("");
    try {
      const res = await emailReport(report.id, { to: list, message: message.trim() || undefined });
      const sent = res?.sent_to?.length ? res.sent_to : list;
      toast(`Report sent to ${sent.join(", ")}`);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't send the report");
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay rp-email-overlay" onMouseDown={busy ? undefined : onClose}>
      <form
        className="modal-card rp-email-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rp-email-title"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h3 className="modal-title" id="rp-email-title">Email this report</h3>
        <p className="modal-message">
          {report.title}, {fmtDay(report.period_start)} to {fmtDay(report.period_end)}. The PDF goes as an attachment.
        </p>
        <div className="field">
          <label htmlFor="rp-email-to">Send to</label>
          <input
            id="rp-email-to"
            type="text"
            inputMode="email"
            autoComplete="email"
            placeholder="name@company.co.ke, accounts@company.co.ke"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            autoFocus
          />
          <span className="field-note">Up to 5 addresses, separated by commas.</span>
        </div>
        <div className="field rp-email-note">
          <label htmlFor="rp-email-msg">Note (optional)</label>
          <textarea
            id="rp-email-msg"
            rows={3}
            maxLength={500}
            placeholder="Here is last quarter's revenue report."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost modal-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary modal-btn" disabled={busy}>
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* The three things you can do with a generated PDF. */
function FileActions({ report, onView, onDownload, onEmail, busy }) {
  if (report.status === "failed") return <span className="rp-failed">Failed</span>;
  return (
    <span className="rp-file-actions">
      <button type="button" className="rp-act" onClick={() => onView(report)}>
        View
      </button>
      <button type="button" className="rp-act" onClick={() => onDownload(report)} disabled={busy}>
        {busy ? "Downloading…" : "Download"}
      </button>
      <button type="button" className="rp-act" onClick={() => onEmail(report)}>
        Email
      </button>
    </span>
  );
}

function ReportRow({ cat, latest, generating, onGenerate, actions }) {
  const [period, setPeriod] = useState("30");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const range = resolvePeriod(period, custom);
  const today = isoLocal(new Date());

  return (
    <li className="rp-row">
      <div className="rp-row-info">
        <p className="rp-row-title">{cat.title}</p>
        <p className="rp-row-desc">{cat.description}</p>
        {latest && (
          <p className="rp-row-latest">
            <span className="cell-sub">
              Last: {fmtDay(latest.period_start)} to {fmtDay(latest.period_end)}
            </span>
            <FileActions report={latest} {...actions} busy={actions.downloading === latest.id} />
          </p>
        )}
      </div>

      <div className="rp-row-controls">
        <div className="rp-period-pick">
          <Dropdown
            value={period}
            onChange={setPeriod}
            options={PERIODS}
            ariaLabel={`Period for ${cat.title}`}
          />
        </div>
        {period === "custom" && (
          <div className="rp-custom">
            <input
              type="date"
              aria-label="From"
              max={custom.to || today}
              value={custom.from}
              onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
            />
            <span className="cell-sub">to</span>
            <input
              type="date"
              aria-label="To"
              min={custom.from || undefined}
              max={today}
              value={custom.to}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
            />
          </div>
        )}
        <button
          type="button"
          className="btn btn-primary rp-generate"
          disabled={!range || generating}
          onClick={() => onGenerate(cat, range)}
        >
          {generating ? "Generating…" : "Generate"}
        </button>
      </div>
    </li>
  );
}

export default function Reports() {
  usePageTitle("Reports");
  const { pathname } = useLocation();
  const [catalog, setCatalog] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null); // type
  const [downloading, setDownloading] = useState(null); // id
  const [viewing, setViewing] = useState(null);
  const [emailing, setEmailing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const getUrl = usePdfCache();
  const closeRemove = useCallback(() => setRemoving(null), []);
  const closeViewer = useCallback(() => setViewing(null), []);

  const load = useCallback(async () => {
    const [cat, list] = await Promise.allSettled([
      fetchReportCatalog(),
      fetchReports({ per_page: 50 }),
    ]);
    setCatalog(cat.status === "fulfilled" && cat.value?.length ? cat.value : FALLBACK_CATALOG);
    if (list.status === "fulfilled") setHistory(list.value?.data || []);
    else if (list.reason?.status !== 404) toast(list.reason?.message || "Failed to load reports", "danger");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const latestByType = useMemo(() => {
    const m = {};
    for (const r of history) if (!m[r.type] && r.status !== "failed") m[r.type] = r;
    return m;
  }, [history]);

  const groups = useMemo(() => {
    if (!catalog) return [];
    const known = GROUPS.map((g) => [g, catalog.filter((c) => c.group === g)]);
    const other = catalog.filter((c) => !GROUPS.includes(c.group));
    return [...known, ["Other", other]].filter(([, items]) => items.length);
  }, [catalog]);

  async function onGenerate(cat, range) {
    setGenerating(cat.type);
    try {
      const report = await generateReport({ type: cat.type, ...range });
      setHistory((h) => [report, ...h]);
      if (report.status === "failed") toast(`${cat.title} couldn't be generated`, "danger");
      else {
        toast(`${cat.title} is ready`);
        setViewing(report);
      }
    } catch (err) {
      toast(err.message || "Couldn't generate the report", "danger");
    } finally {
      setGenerating(null);
    }
  }

  async function onDownload(report) {
    setDownloading(report.id);
    try {
      const url = await getUrl(report.id);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName(report);
      a.click();
    } catch (err) {
      toast(err.message || "Download failed", "danger");
    } finally {
      setDownloading(null);
    }
  }

  async function onDelete() {
    const r = removing;
    setRemoving(null);
    try {
      await deleteReport(r.id);
      setHistory((h) => h.filter((x) => x.id !== r.id));
      toast("Report deleted");
    } catch (err) {
      toast(err.message || "Couldn't delete the report", "danger");
    }
  }

  const actions = { onView: setViewing, onDownload, onEmail: setEmailing, downloading };

  if (loading) return <PageSkeleton path={pathname} />;

  return (
    <>
      <h1 className="sr-only">Reports</h1>

      <div className="rp-bar-head">
        <p className="rp-period">
          PDF reports for every part of the business
          <span className="cell-sub"> · pick a period, generate, then view, download or email it</span>
        </p>
        <RefreshButton onRefresh={load} />
      </div>

      {groups.map(([group, items]) => (
        <section className="panel-card rp-group" key={group}>
          <header className="card-head">
            <h2>{group}</h2>
          </header>
          <ul className="rp-list">
            {items.map((cat) => (
              <ReportRow
                key={cat.type}
                cat={cat}
                latest={latestByType[cat.type]}
                generating={generating === cat.type}
                onGenerate={onGenerate}
                actions={actions}
              />
            ))}
          </ul>
        </section>
      ))}

      <section className="panel-card rp-group">
        <header className="card-head">
          <h2>Generated reports</h2>
          <p>Kept here so you can open, download or send them again</p>
        </header>
        {history.length === 0 ? (
          <p className="field-note">Nothing generated yet. Pick a report above and press Generate.</p>
        ) : (
          <div className="rp-table-wrap">
            <table className="data-table rp-history">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Period</th>
                  <th>Generated</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="strong">{r.title}</span>
                      <span className="cell-sub">
                        {[r.pages ? `${r.pages} page${r.pages === 1 ? "" : "s"}` : "", fmtSize(r.size_bytes)]
                          .filter(Boolean)
                          .join(" · ") || "PDF"}
                      </span>
                    </td>
                    <td>
                      {fmtDay(r.period_start)}
                      <span className="cell-sub">to {fmtDay(r.period_end)}</span>
                    </td>
                    <td>
                      {fmtWhen(r.created_at)}
                      {r.created_by && <span className="cell-sub">by {r.created_by}</span>}
                    </td>
                    <td className="num">
                      <FileActions report={r} {...actions} busy={downloading === r.id} />
                      <button type="button" className="rp-act rp-delete" onClick={() => setRemoving(r)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {viewing && (
        <PdfViewer
          report={viewing}
          getUrl={getUrl}
          onDownload={onDownload}
          onEmail={setEmailing}
          onClose={closeViewer}
        />
      )}
      {emailing && <EmailDialog report={emailing} onClose={() => setEmailing(null)} />}
      <ConfirmDialog
        open={Boolean(removing)}
        title="Delete this report?"
        message={
          removing
            ? `${removing.title}, ${fmtDay(removing.period_start)} to ${fmtDay(removing.period_end)}. You can generate it again any time.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={onDelete}
        onCancel={closeRemove}
      />
    </>
  );
}
