import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import HostLinkDialog from "./HostLinkDialog";
import { fetchBusiness, fetchHostLink, unlinkHostAccount } from "../lib/api";
import { hydrateFleet } from "./fleetStore";
import {
  hydrateBusiness,
  subscribe as subscribeBusiness,
  getBusiness,
} from "./businessStore";
import { toast } from "./toastStore";
import useRole from "../hooks/useRole";
import "./hostlink.css";

/**
 * Link status for the Settings page.
 *
 * Unlinking is deliberately reversible and non-destructive: the person keeps
 * their cars, reviews, conversations and earnings — the workspace was only ever
 * pointing at them. The copy says so, because "unlink" otherwise sounds like it
 * deletes something.
 */
export default function HostLinkPanel() {
  const { can } = useRole();
  const allowed = can("linkHostAccount");
  const business = useSyncExternalStore(subscribeBusiness, getBusiness);

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await fetchHostLink());
    } catch {
      /* a workspace that can't read this just doesn't see the panel */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) load();
    else setLoading(false);
  }, [allowed, load]);

  async function handleUnlink() {
    setConfirmUnlink(false);
    try {
      const res = await unlinkHostAccount();
      toast(res?.message || "Host account released.");
      await hydrateFleet();
      // appLinked drives every app-dependent surface — refresh it now so they
      // disappear immediately rather than on the next full page load.
      await fetchBusiness().then(hydrateBusiness).catch(() => {});
      await load();
    } catch (err) {
      // 409 while a live app booking is running — unlinking mid-trip would
      // leave nobody managing the handover.
      toast(err.message || "Couldn't unlink that account", "danger");
    }
  }

  if (!allowed || loading) return null;

  const needsPlates = status?.vehicles_needing_plate?.length || 0;

  return (
    <section className="panel-card">
      {linking && (
        <HostLinkDialog
          suggestion={null}
          onClose={async () => {
            setLinking(false);
            await fetchBusiness().then(hydrateBusiness).catch(() => {});
            load();
          }}
        />
      )}
      <ConfirmDialog
        open={confirmUnlink}
        title="Release host account"
        message="Your vehicles stay listed on the Ardena app and go back to being managed from the mobile host app. Reviews, messages and earnings are unaffected."
        confirmLabel="Release account"
        onConfirm={handleUnlink}
        onCancel={() => setConfirmUnlink(false)}
      />

      <header className="card-head">
        <h2>Ardena host account</h2>
        <p>Bring vehicles you already list on the app into this workspace</p>
      </header>

      <div className="hostlink-status">
        {status?.linked ? (
          <>
            <div>
              <p className="strong">Linked to {status.host_email}</p>
              <p className="cell-sub">
                Vehicles, reviews, messages and earnings from that account are
                managed here.
              </p>
              {needsPlates > 0 && (
                <p className="hostlink-plates">
                  {needsPlates} imported vehicle{needsPlates > 1 ? "s" : ""} still
                  need{needsPlates > 1 ? "" : "s"} a real number plate —{" "}
                  <Link to="/dashboard/fleet">open Fleet</Link> to set{" "}
                  {needsPlates > 1 ? "them" : "it"}.
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn btn-ghost danger-btn"
              onClick={() => setConfirmUnlink(true)}
            >
              Release
            </button>
          </>
        ) : (
          <>
            <div>
              {/* There are two ways onto the app and this panel covers only one.
                  A workspace that got there by publishing is already live —
                  telling it "not connected" would contradict the app earnings
                  and reviews it can see everywhere else in the dashboard. */}
              <p className="strong">
                {business.appLinked
                  ? "Your listings are managed by this workspace"
                  : "Not connected to the Ardena app"}
              </p>
              {business.appLinked ? (
                <p className="cell-sub">
                  Your vehicles are on the Ardena app under this workspace. If you
                  also have a personal Ardena host account with vehicles on it, you
                  can connect it here to bring those across too.
                </p>
              ) : (
                <>
                  <p className="cell-sub">
                    Already list cars on the Ardena app? Connect that account and
                    your vehicles come across with their reviews, messages and
                    booking history — nothing is re-listed and no bookings are
                    interrupted.
                  </p>
                  <p className="cell-sub hostlink-unlocks">
                    Connecting adds: app earnings and payouts, renter messages,
                    reviews, deposit claims, and marketplace listing for your
                    fleet. Direct bookings work exactly as they do now, either way.
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setLinking(true)}
            >
              {business.appLinked ? "Connect another account" : "Connect account"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
