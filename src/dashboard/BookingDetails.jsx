import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchBooking,
  setBookingStatus,
  recordHandoverOut,
  recordHandoverIn,
  bookingDepositAction,
  markBookingPaidCash,
  sendStkPush,
  checkChargeStatus,
  uploadHandoverPhotos,
  deleteHandoverPhoto,
  rateRenter,
} from "../lib/api";
import { useSyncExternalStore } from "react";
import {
  subscribe as subscribePolicy,
  getPolicy,
  RETURN_HOUR,
} from "./policyStore";
import { STATUS_CHIP, PAY_CHIP, fmtDate, rentalDays } from "./bookingsStore";
import { downloadAgreement } from "./pdf";
import { toast } from "./toastStore";
import { getSeed } from "./recordSeeds";
import LoadingOverlay from "../components/LoadingOverlay";
import DatePicker from "./DatePicker";
import Dropdown from "../components/Dropdown";
import { compressImage } from "./handoverPhotosStore";
import {
  subscribe as subscribeChauffeurs,
  getChauffeurs,
  assignChauffeur,
  unassignChauffeur,
} from "./chauffeursStore";
import PageSkeleton from "./PageSkeleton";
import DepositClaimDialog from "./DepositClaimDialog";
import useRole from "../hooks/useRole";
import "./fleet.css";
import "./bookings.css";

const fmtAmount = (n) => Number(n || 0).toLocaleString("en-KE");

// Turn staged (compressed) data-URL previews into File objects for multipart upload.
async function stagedToFiles(pending) {
  return Promise.all(
    pending.map(async (p, i) => {
      const blob = await (await fetch(p.url)).blob();
      return new File([blob], `handover-${Date.now()}-${i}.jpg`, {
        type: blob.type || "image/jpeg",
      });
    })
  );
}

const FUEL_LEVELS = ["Full", "3/4", "1/2", "1/4", "Reserve"];

const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  return `${h}:${i % 2 ? "30" : "00"}`;
});

const NEXT_STEP = {
  Pending: { label: "Confirm booking", to: "Confirmed" },
  Confirmed: { label: "Start rental", to: "Active" },
  Active: { label: "Mark completed", to: "Completed" },
};

/* A paid-but-Pending booking is advanced to Confirmed server-side (the
   Paystack webhook / charge poll does it, b2b.md §F), and recording cash does
   the same. So payment *is* the confirmation for the ordinary case, and the
   button below is only for the other one: reserving a car for a customer who
   will pay at the counter. It says so while the booking is unpaid rather than
   sitting there as a second primary action competing with taking the money. */

const CANCELLABLE = ["Pending", "Confirmed"];

const STATUS_TOAST = {
  Confirmed: "Booking confirmed.",
  Active: "Rental started.",
  Completed: "Booking marked completed.",
};

export default function BookingDetails() {
  const policy = useSyncExternalStore(subscribePolicy, getPolicy);
  const { can } = useRole();
  const { ref } = useParams();
  // The row from the bookings list, if that is where this was opened from —
  // enough to draw the page while the full record loads. See recordSeeds.
  const [b, setB] = useState(() => getSeed("bookings", decodeURIComponent(ref)));
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retDate, setRetDate] = useState(null);
  const [retTime, setRetTime] = useState("10:00");
  const [outFuel, setOutFuel] = useState("Full");
  const [inFuel, setInFuel] = useState("Full");
  const [payModal, setPayModal] = useState(false);
  const [payPhone, setPayPhone] = useState("");
  const [chauffeurModal, setChauffeurModal] = useState(false);
  const [agreementModal, setAgreementModal] = useState(false);
  const [cashModal, setCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [cashNote, setCashNote] = useState("");
  const [cashBusy, setCashBusy] = useState(false);
  const [payProvider, setPayProvider] = useState("mpesa");
  const [payBusy, setPayBusy] = useState(false);
  const [payWaiting, setPayWaiting] = useState(false);
  const [outPending, setOutPending] = useState([]); // photos staged before check-out
  const [inPending, setInPending] = useState([]); // photos staged before check-in
  const [photoBusy, setPhotoBusy] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [renterStars, setRenterStars] = useState(0);
  const [renterNote, setRenterNote] = useState("");
  const [rated, setRated] = useState(false);
  const [lightbox, setLightbox] = useState(null); // enlarged photo URL
  const [chauffeurPick, setChauffeurPick] = useState(""); // driver chosen in the assign picker
  const [assignBusy, setAssignBusy] = useState(false);
  const pollRef = useRef(null);
  const pollDeadlineRef = useRef(null);
  const pollPsRef = useRef(null); // Paystack reference being polled

  const chauffeurs = useSyncExternalStore(subscribeChauffeurs, getChauffeurs);
  const decodedRef = decodeURIComponent(ref);

  const load = useCallback(async () => {
    try {
      const data = await fetchBooking(decodedRef);
      setB(data);
    } catch (err) {
      toast(err.message || "Failed to load booking", "danger");
    } finally {
      setLoading(false);
    }
  }, [decodedRef]);

  /* Arriving from the bookings list, the row that was clicked is already
     known — customer, vehicle, dates, status — so draw it now and let the
     full record fill in the rest. Only the headline fields are seeded, so
     everything else renders empty for the moment the fetch takes; the page
     is marked busy until it lands. Landing here from a link or a refresh
     finds no seed and shows the skeleton, as before. */
  const seeded = b !== null && loading;

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollPsRef.current = null;
    setPayWaiting(false);
  }

  function startPolling(paystackRef) {
    pollPsRef.current = paystackRef;
    setPayWaiting(true);
    // Paystack docs: wait at least 10 s before first check, then poll every 10 s.
    // 3-minute hard cap (18 ticks) — Paystack STK pushes expire after ~2 min on-device.
    pollDeadlineRef.current = Date.now() + 3 * 60 * 1000;
    let inFlight = false;

    async function tick() {
      if (inFlight) return;
      inFlight = true;
      try {
        const psRef = pollPsRef.current;
        if (!psRef) { stopPolling(); return; }

        if (Date.now() > pollDeadlineRef.current) {
          // Hard timeout — do one final check then give up
          try {
            const res = await checkChargeStatus(psRef);
            if (res.charge_status === "success") {
              const updated = await fetchBooking(decodedRef);
              setB(updated);
              toast("Payment confirmed! Booking marked as Paid.");
            } else {
              // Refresh booking so the chip reflects the current DB state
              const updated = await fetchBooking(decodedRef);
              setB(updated);
              toast("Payment not confirmed, the STK push may have expired. You can resend the request.", "warn");
            }
          } catch { /* ignore */ }
          stopPolling();
          return;
        }

        const res = await checkChargeStatus(psRef);

        if (res.charge_status === "success") {
          const updated = await fetchBooking(decodedRef);
          setB(updated);
          stopPolling();
          toast("Payment confirmed! Booking marked as Paid.");
        } else if (res.charge_status === "failed" || res.charge_status === "timeout") {
          const updated = await fetchBooking(decodedRef);
          setB(updated);
          stopPolling();
          toast(res.message || "Payment was declined or timed out. You can resend the request.", "danger");
        }
        // "pending" or "error" — silent, will retry next tick
      } catch {
        // network hiccup — retry next tick
      } finally {
        inFlight = false;
      }
    }

    // First tick after 10 s (per Paystack recommendation — don't call too early)
    pollRef.current = setInterval(tick, 10000);
  }

  // A skeleton only when there is genuinely nothing to show. With a seed the
  // page is already drawable, and `seeded` marks it as still filling in.
  if (loading && !b) return <PageSkeleton path={`/dashboard/bookings/${ref}`} />;

  if (!b) {
    return (
      <>
        <Link to="/dashboard/bookings" className="back-link" aria-label="Back to bookings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="empty-block fleet-empty">
          <p>This booking doesn't exist.</p>
        </div>
      </>
    );
  }

  const days = rentalDays(b.pickup, b.dropoff);
  const total = days * b.rate;
  /* A booking has two halves and staff only ever work one of them at a time:
     arrange it (take the money, put a driver on it), then hand the car over.
     Showing both at once buried the two controls that matter on the day the
     booking is made under a condition form nobody can fill in yet. Handover
     stays closed until the money is settled — cash counts, see the cash
     recording action on the payment card. */
  const settled = b.payment === "Paid" || b.payment === "Refunded";
  const next = NEXT_STEP[b.status];
  // Confirming by hand only means something before the money lands.
  const confirmWithoutPay = b.status === "Pending" && !settled;
  const canCancel = CANCELLABLE.includes(b.status);
  const canPrompt = b.payment !== "Paid" && b.payment !== "Refunded" && b.status !== "Cancelled" && b.status !== "Completed";
  const ho = b.handover || { out: null, inn: null };
  const hoOut = ho.out || null;
  const hoIn = ho.inn || null;
  const penalty = hoIn ? hoIn.penalty : 0;
  const depositAmt = b.deposit_amount ?? policy.deposit;

  // Bookings that came from the Ardena app behave differently almost everywhere:
  // the renter owns the dates, Ardena holds the deposit, and handover needs the
  // 6-digit code they read off their phone.
  const fromApp = b.source === "marketplace";
  const needsCode = Boolean(b.requires_handover_code);
  const depositWithArdena = Boolean(b.deposit_managed_by_ardena);
  const canClaim = can("fileDepositClaim");

  // Chauffeur assignment (§C): a driver is linked to this booking when their
  // derived assignment points back at this ref.
  const assignedChauffeur = chauffeurs.find((c) => c.assignment?.booking_ref === b.ref) || null;
  const availableChauffeurs = chauffeurs.filter((c) => c.status === "Available" && !c.assignment);
  const canAssignChauffeur = b.status !== "Cancelled" && b.status !== "Completed";

  async function handleAssignChauffeur() {
    if (!chauffeurPick || assignBusy) return;
    setAssignBusy(true);
    try {
      const c = await assignChauffeur(chauffeurPick, b.ref);
      setChauffeurPick("");
      toast(`${c.name} assigned to this booking.`);
    } catch (err) {
      toast(err.message || "Couldn't assign the chauffeur.", "danger");
    } finally {
      setAssignBusy(false);
    }
  }

  async function handleUnassignChauffeur() {
    if (!assignedChauffeur || assignBusy) return;
    setAssignBusy(true);
    try {
      await unassignChauffeur(assignedChauffeur.id);
      toast("Chauffeur unassigned from this booking.");
    } catch (err) {
      toast(err.message || "Couldn't unassign the chauffeur.", "danger");
    } finally {
      setAssignBusy(false);
    }
  }

  async function doStatus(newStatus) {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await setBookingStatus(b.ref, newStatus);
      setB(updated);
      toast(STATUS_TOAST[newStatus] || "Booking updated.");
    } catch (err) {
      toast(err.message || "Failed to update status", "danger");
    } finally {
      setBusy(false);
    }
  }

  // Compress picked images and stage them for the handover being recorded.
  async function handlePhotoPick(e, setPending) {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // let the same file be re-picked after removal
    if (!files.length) return;
    setPhotoBusy(true);
    try {
      const urls = await Promise.all(files.map((file) => compressImage(file)));
      setPending((prev) =>
        [...prev, ...urls.map((url) => ({ id: `${Date.now()}-${Math.random()}`, url }))].slice(0, 8)
      );
    } catch (err) {
      toast(err.message || "Couldn't add that photo", "danger");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleRateRenter(e) {
    e.preventDefault();
    if (busy || !renterStars) return;
    setBusy(true);
    try {
      await rateRenter(b.ref, {
        rating: renterStars,
        review: renterNote.trim() || null,
      });
      setRated(true);
      toast("Thanks, that helps other hosts decide who to rent to.");
    } catch (err) {
      // 409 means it was already rated, which is a success from the user's
      // point of view: the form should go away either way.
      if (err.status === 409) setRated(true);
      toast(err.message || "Couldn't save that rating", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckOut(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const updated = await recordHandoverOut(b.ref, {
        odometer: Number(f.get("odometer")),
        fuel: outFuel,
        notes: f.get("notes").trim() || null,
        // Bookings that came from the Ardena app can't be handed over without
        // the renter's code — the request is rejected outright.
        ...(needsCode ? { pickup_code: String(f.get("pickup_code") || "").trim() } : {}),
      });
      let finalBooking = updated;
      if (outPending.length) {
        try {
          const files = await stagedToFiles(outPending);
          await uploadHandoverPhotos(b.ref, "out", files);
          finalBooking = await fetchBooking(b.ref); // reflect the uploaded photos
        } catch (err) {
          toast(`Check-out saved, but photos couldn't be uploaded: ${err.message || "please retry"}`, "warn");
        }
        setOutPending([]);
      }
      setB(finalBooking);
      toast("Check-out recorded, keys can go out.");
    } catch (err) {
      toast(err.message || "Failed to record check-out", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckIn(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const updated = await recordHandoverIn(b.ref, {
        odometer: Number(f.get("odometer")),
        fuel: inFuel,
        notes: f.get("notes").trim() || null,
        return_date: retDate || b.dropoff,
        return_time: retTime,
        ...(needsCode ? { return_code: String(f.get("return_code") || "").trim() } : {}),
      });
      let finalBooking = updated;
      if (inPending.length) {
        try {
          const files = await stagedToFiles(inPending);
          // API phase is "in"; the frontend's internal key for check-in is "inn".
          await uploadHandoverPhotos(b.ref, "in", files);
          finalBooking = await fetchBooking(b.ref);
        } catch (err) {
          toast(`Check-in saved, but photos couldn't be uploaded: ${err.message || "please retry"}`, "warn");
        }
        setInPending([]);
      }
      setB(finalBooking);
      const late = finalBooking.handover?.inn?.late_hours || 0;
      const pen = finalBooking.handover?.inn?.penalty || 0;
      if (late > 0) {
        toast(`Check-in recorded, ${late} hr${late > 1 ? "s" : ""} late. KES ${pen.toLocaleString("en-KE")} penalty applied.`, "danger");
      } else {
        toast("Check-in recorded, returned on time.");
      }
    } catch (err) {
      toast(err.message || "Failed to record check-in", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeposit(action) {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await bookingDepositAction(b.ref, action);
      setB(updated);
      toast(action === "refund" ? "Security deposit refunded." : "Security deposit forfeited.", action === "forfeit" ? "danger" : undefined);
    } catch (err) {
      toast(err.message || "Failed", "danger");
    } finally {
      setBusy(false);
    }
  }

  function openPayModal() {
    setPayPhone(b.phone || "");
    setPayProvider("mpesa");
    setPayModal(true);
  }

  async function handleCashPayment(e) {
    e.preventDefault();
    if (cashBusy) return;
    const amount = Number(cashAmount);
    if (!amount || amount <= 0) {
      toast("Enter the amount received.", "danger");
      return;
    }
    setCashBusy(true);
    try {
      await markBookingPaidCash(b.ref, { amount, note: cashNote.trim() || undefined });
      setCashModal(false);
      setCashNote("");
      toast(`KES ${fmtAmount(amount)} recorded as cash.`);
      await load();
    } catch (err) {
      toast(err.message || "Couldn't record the cash payment.", "danger");
    } finally {
      setCashBusy(false);
    }
  }

  async function handleStkPush(e) {
    e.preventDefault();
    if (payBusy) return;
    setPayBusy(true);
    try {
      const result = await sendStkPush(b.ref, payPhone, payProvider);
      const updated = await fetchBooking(b.ref);
      setB(updated);
      setPayModal(false);
      toast(result.message || "STK push sent.", result.success ? undefined : "danger");
      if (result.success && result.paystack_reference) {
        startPolling(result.paystack_reference);
      }
    } catch (err) {
      toast(err.message || "Failed to send STK push", "danger");
    } finally {
      setPayBusy(false);
    }
  }

  // Capture grid shown inside a handover form: staged thumbnails + an add tile.
  function renderCapture(pending, setPending) {
    return (
      <div className="field form-full">
        <label>
          Condition photos <span className="ho-photos-hint">· timestamped evidence for damage disputes</span>
        </label>
        <div className="photo-grid">
          {pending.map((p) => (
            <div className="photo-thumb" key={p.id}>
              <img src={p.url} alt="" onClick={() => setLightbox(p.url)} />
              <button
                type="button"
                className="photo-del"
                onClick={() => setPending((prev) => prev.filter((x) => x.id !== p.id))}
                aria-label="Remove photo"
              >
                ✕
              </button>
            </div>
          ))}
          {pending.length < 8 && (
            <label className={"photo-add" + (photoBusy ? " busy" : "")}>
              <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => handlePhotoPick(e, setPending)} />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L8 6H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V7a1 1 0 00-1-1h-4l-1.5-2z" />
                <circle cx="12" cy="12.5" r="3.2" />
              </svg>
              <span>{photoBusy ? "Adding…" : "Add photo"}</span>
            </label>
          )}
        </div>
      </div>
    );
  }

  // Read-only gallery shown once a handover is recorded.
  async function handleDeletePhoto(phase, photoId) {
    try {
      await deleteHandoverPhoto(b.ref, phase, photoId);
      setB(await fetchBooking(b.ref));
    } catch (err) {
      toast(err.message || "Couldn't remove the photo.", "danger");
    }
  }

  // phase: "out" | "in" (API phase; the check-in payload key is "inn")
  function renderGallery(list, phase) {
    if (!list || !list.length) return null;
    return (
      <div className="photo-grid photo-grid-view">
        {list.map((p) => (
          <div className="photo-thumb" key={p.id}>
            <img src={p.url} alt="Handover condition" onClick={() => setLightbox(p.url)} />
            <button
              type="button"
              className="photo-del"
              onClick={() => handleDeletePhoto(phase, p.id)}
              aria-label="Remove photo"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {claimOpen && (
        <DepositClaimDialog
          booking={b}
          depositAmount={depositAmt}
          onClose={() => setClaimOpen(false)}
          onFiled={() => fetchBooking(b.ref).then(setB).catch(() => {})}
        />
      )}

      <header className="head-card" aria-busy={seeded || undefined}>
        <div className="head-left">
          <Link to="/dashboard/bookings" className="back-link" aria-label="Back to bookings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="head-titles">
            <h1>{b.customer}</h1>
            <p>
              {b.ref} · {b.vehicle} ({b.plate}) ·{" "}
              <span className={`chip ${STATUS_CHIP[b.status]}`}>{b.status}</span>
              {/* Drawn from the list row while the full record loads, so say
                  so rather than let a half-filled page pass for a whole one. */}
              {seeded && <span className="seed-note">Updating…</span>}
              {fromApp && (
                <>
                  {" "}
                  <span className="chip source-app" title="Booked by a renter on the Ardena app">
                    Ardena app
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="details-actions">
          <button
            type="button"
            className="icon-btn icon-only"
            onClick={() => setChauffeurModal(true)}
            aria-label="Chauffeur"
            title={assignedChauffeur ? `Chauffeur: ${assignedChauffeur.name}` : "Assign a chauffeur"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="3.2" />
              <path d="M5.5 20a6.5 6.5 0 0113 0" />
            </svg>
            {assignedChauffeur && <span className="dot-on" aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="icon-btn icon-only"
            onClick={() => setAgreementModal(true)}
            aria-label="Rental agreement"
            title="Rental agreement"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
              <path d="M14 3v5h5M9 13h6M9 17h4" />
            </svg>
          </button>
          {next && (
            <button
              type="button"
              className={confirmWithoutPay ? "btn btn-ghost" : "btn btn-primary"}
              disabled={busy}
              onClick={() => doStatus(next.to)}
              title={
                confirmWithoutPay
                  ? "Hold the car for a customer paying at the counter. Taking payment confirms it on its own."
                  : undefined
              }
            >
              {confirmWithoutPay ? "Confirm without payment" : next.label}
            </button>
          )}
          {canCancel &&
            (cancelling ? (
              <span className="confirm-inline">
                {/* Cancelling an app booking isn't just a dashboard state change:
                    the renter's trip ends, they're refunded in full, and the
                    business is charged a lead-time penalty. Say so before they
                    click, not after. */}
                {fromApp
                  ? "This ends the renter's trip, refunds them in full and charges you a cancellation penalty. Continue?"
                  : "Cancel this booking?"}
                <button
                  type="button"
                  className="icon-btn danger"
                  disabled={busy}
                  onClick={() => {
                    doStatus("Cancelled");
                    setCancelling(false);
                  }}
                >
                  Yes
                </button>
                <button type="button" className="icon-btn" onClick={() => setCancelling(false)}>
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-ghost danger-btn"
                onClick={() => setCancelling(true)}
              >
                Cancel booking
              </button>
            ))}
        </div>
      </header>

      {/* What to do next, in one line, so a booking just created opens on an
          instruction rather than on six cards of equal weight. */}
      {!settled && b.status !== "Cancelled" && (
        <p className="page-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span>
            Next: take payment and assign a chauffeur if this rental needs one.
            Handover opens once the payment is settled.
          </span>
        </p>
      )}

      <div className="details-grid">
        <div className="settings-main">
          <section className="panel-card">
            <header className="card-head">
              <h2>Booking information</h2>
              <p>Reservation record</p>
            </header>
            <dl className="spec-grid">
              <div className="spec">
                <dt>Customer</dt>
                <dd>{b.customer}</dd>
              </div>
              <div className="spec">
                <dt>Phone</dt>
                <dd>{b.phone}</dd>
              </div>
              <div className="spec">
                <dt>Vehicle</dt>
                <dd>
                  <Link className="spec-link" to={`/dashboard/fleet/${encodeURIComponent(b.plate)}`}>
                    {b.vehicle} · {b.plate}
                  </Link>
                </dd>
              </div>
              <div className="spec">
                <dt>Day rate</dt>
                <dd>KES {fmtAmount(b.rate)}</dd>
              </div>
              <div className="spec">
                <dt>Pickup</dt>
                <dd>{fmtDate(b.pickup)}</dd>
              </div>
              <div className="spec">
                <dt>Return</dt>
                <dd>
                  {fmtDate(b.dropoff)} · by {RETURN_HOUR}:00 AM
                </dd>
              </div>
              <div className="spec">
                <dt>Duration</dt>
                <dd>
                  {days} day{days > 1 ? "s" : ""}
                </dd>
              </div>
              <div className="spec">
                <dt>Pickup location</dt>
                <dd>{b.location}</dd>
              </div>
              <div className="spec">
                <dt>Created</dt>
                <dd>{fmtDate(b.created)}</dd>
              </div>
              {b.notes && (
                <div className="spec spec-full">
                  <dt>Notes</dt>
                  <dd>{b.notes}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* ---- Handover: the second half, closed until the first is done ---- */}
          {!settled ? (
            <section className="panel-card">
              <header className="card-head">
                <h2>Handover</h2>
                <p>Opens once payment is settled</p>
              </header>
              <p className="side-hint">
                Record the payment, by request or in cash, and the check-out
                form appears here, ready for the odometer, fuel level and
                condition photos before you hand over the keys.
              </p>
            </section>
          ) : (
          <section className="panel-card">
            <header className="card-head">
              <h2>Handover</h2>
              <p>Condition recorded at pickup and return</p>
            </header>

            {!hoOut && b.status !== "Cancelled" && (
              <form className="ho-form" onSubmit={handleCheckOut}>
                <p className="ho-step">Check-out · record before handing over keys</p>
                {needsCode && (
                  <div className="field ho-code-field">
                    <label htmlFor="ho-code">Renter&apos;s pickup code</label>
                    <input
                      id="ho-code"
                      name="pickup_code"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoComplete="off"
                      placeholder="6 digits"
                      required
                    />
                    <p className="field-note">
                      Ask the renter to read the code from their Ardena app. Five wrong
                      entries locks this booking for 15 minutes.
                    </p>
                  </div>
                )}
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="ho-odo">Odometer (km)</label>
                    <input id="ho-odo" name="odometer" type="number" min="0" placeholder="48210" required />
                  </div>
                  <div className="field">
                    <label htmlFor="ho-fuel">Fuel level</label>
                    <Dropdown
                      id="ho-fuel"
                      name="fuel"
                      value={outFuel}
                      onChange={setOutFuel}
                      options={FUEL_LEVELS}
                    />
                  </div>
                  <div className="field form-full">
                    <label htmlFor="ho-notes">Condition notes</label>
                    <textarea id="ho-notes" name="notes" rows="2" placeholder="Scratches, dents, anything the renter should not be charged for" />
                  </div>
                  {renderCapture(outPending, setOutPending)}
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    Record check-out
                  </button>
                </div>
              </form>
            )}

            {hoOut && (
              <>
                <div className="pay-row">
                  <span>Checked out · {hoOut.at}</span>
                  <span className="mini-amount">
                    {fmtAmount(hoOut.odometer)} km · fuel {hoOut.fuel}
                  </span>
                </div>
                {hoOut.notes && <p className="ho-note">Out: {hoOut.notes}</p>}
                {renderGallery(hoOut.photos, "out")}
              </>
            )}

            {hoOut && !hoIn && b.status === "Active" && (
              <form className="ho-form ho-return" onSubmit={handleCheckIn}>
                <p className="ho-step">
                  Check-in · due {fmtDate(b.dropoff)} by {RETURN_HOUR}:00 AM, then KES{" "}
                  {fmtAmount(policy.lateFeePerHour)} per started hour
                </p>
                {needsCode && (
                  <div className="field ho-code-field">
                    <label htmlFor="hi-code">Renter&apos;s return code</label>
                    <input
                      id="hi-code"
                      name="return_code"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoComplete="off"
                      placeholder="6 digits"
                      required
                    />
                    <p className="field-note">
                      The renter&apos;s app shows this once the trip is under way.
                    </p>
                  </div>
                )}
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="hi-odo">Odometer (km)</label>
                    <input id="hi-odo" name="odometer" type="number" min={hoOut.odometer} placeholder={String(hoOut.odometer)} required />
                  </div>
                  <div className="field">
                    <label htmlFor="hi-fuel">Fuel level</label>
                    <Dropdown
                      id="hi-fuel"
                      name="fuel"
                      value={inFuel}
                      onChange={setInFuel}
                      options={FUEL_LEVELS}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="hi-at">Return date</label>
                    <DatePicker
                      id="hi-at"
                      value={retDate || b.dropoff}
                      onChange={setRetDate}
                      minDate={b.pickup}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="hi-time">Return time</label>
                    <Dropdown
                      id="hi-time"
                      value={retTime}
                      onChange={setRetTime}
                      options={TIMES}
                    />
                  </div>
                  <div className="field form-full">
                    <label htmlFor="hi-notes">Return notes</label>
                    <input id="hi-notes" name="notes" type="text" placeholder="New damage, missing items" />
                  </div>
                  {renderCapture(inPending, setInPending)}
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    Record check-in
                  </button>
                </div>
              </form>
            )}

            {hoIn && (
              <>
                <div className="pay-row">
                  <span>Checked in · {hoIn.at}</span>
                  <span className="mini-amount">
                    {fmtAmount(hoIn.odometer)} km · fuel {hoIn.fuel}
                  </span>
                </div>
                <div className="pay-row">
                  <span>Distance driven</span>
                  <span className="mini-amount">{fmtAmount(hoIn.odometer - hoOut.odometer)} km</span>
                </div>
                <div className="pay-row">
                  <span>Late return</span>
                  <span className={`mini-amount${hoIn.late_hours > 0 ? " penalty-red" : ""}`}>
                    {hoIn.late_hours > 0
                      ? `${hoIn.late_hours} hr${hoIn.late_hours > 1 ? "s" : ""} · KES ${fmtAmount(hoIn.penalty)}`
                      : "On time"}
                  </span>
                </div>
                {hoIn.notes && <p className="ho-note">In: {hoIn.notes}</p>}
                {renderGallery(hoIn.photos, "in")}
              </>
            )}

            {!hoOut && b.status === "Cancelled" && (
              <p className="side-hint">Booking was cancelled before handover.</p>
            )}
          </section>
          )}
        </div>

        <div className="details-side">
          <section className="panel-card">
            <header className="card-head">
              <h2>Payment</h2>
              <p>Collected from the customer</p>
            </header>
            <p className="util-hero">KES {fmtAmount(total)}</p>
            <div className="pay-row">
              <span>Status</span>
              <span className={`chip ${PAY_CHIP[b.payment]}`}>{b.payment}</span>
            </div>
            <div className="pay-row">
              <span>Security deposit</span>
              <span className="mini-amount">
                KES {fmtAmount(depositAmt)} · {b.deposit_status}
              </span>
            </div>
            {penalty > 0 && (
              <div className="pay-row">
                <span>Late return penalty</span>
                <span className="mini-amount penalty-red">
                  KES {fmtAmount(penalty)} · {hoIn.late_hours} hr{hoIn.late_hours > 1 ? "s" : ""}
                </span>
              </div>
            )}
            {/* Rating renters is how the marketplace builds a picture of who to
                trust with a vehicle, and fleets hand over more cars than anyone. */}
            {fromApp && b.status === "Completed" && can("rateRenter") && !rated && (
              <form className="rate-renter" onSubmit={handleRateRenter}>
                <p className="pay-row">
                  <span>Rate {b.customer}</span>
                </p>
                <div className="rate-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      className={"rate-star" + (n <= renterStars ? " on" : "")}
                      onClick={() => setRenterStars(n)}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <input
                  value={renterNote}
                  onChange={(e) => setRenterNote(e.target.value)}
                  placeholder="Anything other hosts should know? (optional)"
                  maxLength={2000}
                />
                <button
                  type="submit"
                  className="icon-btn"
                  disabled={busy || !renterStars}
                >
                  Submit rating
                </button>
              </form>
            )}

            {/* Ardena collects and releases the deposit on an app booking — the
                renter paid it at checkout, not to us. Settling it here would show
                a deposit resolved while their money sat untouched, so the backend
                refuses and we point at the claim process instead. */}
            {depositWithArdena ? (
              <>
                <p className="pay-note">
                  Ardena holds this deposit and releases it after the trip. If the
                  vehicle came back damaged, late or unclean, raise a claim within the
                  inspection window.
                </p>
                {hoIn && canClaim && (
                  <div className="deposit-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setClaimOpen(true)}
                    >
                      Claim against deposit
                    </button>
                  </div>
                )}
              </>
            ) : (
              b.deposit_status === "Held" &&
              hoIn && (
                <div className="deposit-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={busy}
                    onClick={() => handleDeposit("refund")}
                  >
                    Refund deposit
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    disabled={busy}
                    onClick={() => handleDeposit("forfeit")}
                  >
                    Forfeit
                  </button>
                </div>
              )
            )}
            {canPrompt && (
              <>
                <div className="pay-actions">
                <button
                  type="button"
                  className="btn mpesa-btn"
                  disabled={busy || payWaiting}
                  onClick={openPayModal}
                >
                  {b.payment === "Prompt sent" ? "Resend payment request" : b.payment === "Failed" ? "Retry payment request" : "Request payment"}
                </button>
                {/* Plenty of counter business is settled in notes. Without this
                    the booking sits "Unpaid" forever and the handover step it
                    gates never opens, so staff learn to ignore the status. */}
                <button
                  type="button"
                  className="btn btn-ghost pay-btn"
                  disabled={busy || payWaiting}
                  onClick={() => {
                    setCashAmount(String(total));
                    setCashModal(true);
                  }}
                >
                  Mark paid in cash
                </button>
                </div>
                <p className="side-hint">
                  Request sends an STK push for KES {fmtAmount(total)}. Cash is a
                  record only, the money never passes through Ardena.
                </p>
              </>
            )}

            {cashModal && (
              <div className="modal-overlay" onClick={() => !cashBusy && setCashModal(false)}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                  <header className="modal-head">
                    <h3>Record cash payment</h3>
                    <button type="button" className="icon-btn" disabled={cashBusy} onClick={() => setCashModal(false)} aria-label="Close">✕</button>
                  </header>
                  <form onSubmit={handleCashPayment} className="modal-body">
                    <label className="field-label">
                      Amount received (KES)
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="field-input"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        required
                        autoFocus
                      />
                    </label>
                    <label className="field-label">
                      Note <span className="ho-photos-hint">· optional</span>
                      <input
                        type="text"
                        className="field-input"
                        value={cashNote}
                        onChange={(e) => setCashNote(e.target.value)}
                        placeholder="Who took it, receipt number…"
                      />
                    </label>
                    <p className="side-hint" style={{ marginTop: 0 }}>
                      This marks the booking paid and files KES{" "}
                      {fmtAmount(Number(cashAmount) || 0)} under cash in Finances.
                      It does not move any money, bank it yourself.
                    </p>
                    <div className="modal-actions">
                      <button type="button" className="btn btn-ghost" disabled={cashBusy} onClick={() => setCashModal(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={cashBusy}>
                        {cashBusy ? "Recording…" : "Record cash payment"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {payModal && (
              <div className="modal-overlay" onClick={() => !payBusy && setPayModal(false)}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                  <header className="modal-head">
                    <h3>Request payment · KES {fmtAmount(total)}</h3>
                    <button type="button" className="icon-btn" disabled={payBusy} onClick={() => setPayModal(false)}>✕</button>
                  </header>
                  <form onSubmit={handleStkPush} className="modal-body">
                    <label className="field-label">
                      Customer phone
                      <input
                        type="tel"
                        className="field-input"
                        value={payPhone}
                        onChange={(e) => setPayPhone(e.target.value)}
                        placeholder="07XXXXXXXX"
                        required
                        autoFocus
                      />
                    </label>
                    <fieldset className="provider-group">
                      <legend className="field-label">Payment method</legend>
                      <label className="provider-option">
                        <input
                          type="radio"
                          name="provider"
                          value="mpesa"
                          checked={payProvider === "mpesa"}
                          onChange={() => setPayProvider("mpesa")}
                        />
                        <span className="provider-pill mpesa-pill">M-Pesa</span>
                      </label>
                      <label className="provider-option">
                        <input
                          type="radio"
                          name="provider"
                          value="airtel"
                          checked={payProvider === "airtel"}
                          onChange={() => setPayProvider("airtel")}
                        />
                        <span className="provider-pill airtel-pill">Airtel Money</span>
                      </label>
                    </fieldset>
                    <p className="side-hint">
                      An STK push will be sent to the customer's phone. They'll enter their PIN to complete the payment.
                    </p>
                    <div className="modal-actions">
                      <button type="button" className="btn btn-ghost" disabled={payBusy} onClick={() => setPayModal(false)}>Cancel</button>
                      <button type="submit" className="btn mpesa-btn" disabled={payBusy}>
                        {payBusy ? "Sending…" : "Send STK push"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>



          <section className="panel-card">
            <header className="card-head">
              <h2>Identity verification</h2>
              <p>Checked via Dojah before pickup</p>
            </header>
            <div className="pay-row">
              <span>Status</span>
              <span className={`chip ${b.verification === "Verified" ? "active" : "pending"}`}>
                {b.verification}
              </span>
            </div>
            <p className="side-hint">
              {b.verification === "Verified"
                ? "ID and driver's licence matched. Safe to hand over keys."
                : "The customer hasn't completed the ID check yet."}
            </p>
          </section>
        </div>
      </div>

      {lightbox && (
        <div className="modal-overlay photo-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Handover photo enlarged" onClick={(e) => e.stopPropagation()} />
          <button type="button" className="photo-lightbox-close" onClick={() => setLightbox(null)} aria-label="Close">✕</button>
        </div>
      )}
      {/* Chauffeur and the agreement are occasional errands, not things you
          read. As cards they doubled the page's height and pushed payment
          below the fold; as icons in the header they cost a row and open on
          demand. */}
      {chauffeurModal && (
        <div className="modal-overlay" onClick={() => !assignBusy && setChauffeurModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>Chauffeur</h3>
              <button type="button" className="icon-btn" onClick={() => setChauffeurModal(false)} aria-label="Close">✕</button>
            </header>
            <div className="modal-body">
              {assignedChauffeur ? (
                <>
                  <div className="pay-row">
                    <span>Driver</span>
                    <Link className="spec-link" to={`/dashboard/chauffeurs/${assignedChauffeur.id}`}>
                      {assignedChauffeur.name}
                    </Link>
                  </div>
                  <div className="pay-row">
                    <span>Phone</span>
                    <span className="mini-amount">{assignedChauffeur.phone}</span>
                  </div>
                  <div className="pay-row">
                    <span>Daily rate</span>
                    <span className="mini-amount">KES {fmtAmount(assignedChauffeur.daily_rate)}</span>
                  </div>
                  <button
                    type="button"
                    className="icon-btn danger"
                    disabled={assignBusy}
                    onClick={handleUnassignChauffeur}
                  >
                    Unassign chauffeur
                  </button>
                </>
              ) : canAssignChauffeur ? (
                availableChauffeurs.length ? (
                  <>
                    <label className="field-label">
                      Available chauffeurs
                      <Dropdown
                        value={chauffeurPick}
                        onChange={setChauffeurPick}
                        options={availableChauffeurs.map((c) => ({
                          value: c.id,
                          label: `${c.name} · ${c.phone}`,
                        }))}
                        placeholder="Choose a driver"
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-primary pay-btn"
                      disabled={!chauffeurPick || assignBusy}
                      onClick={handleAssignChauffeur}
                    >
                      {assignBusy ? "Assigning…" : "Assign chauffeur"}
                    </button>
                    <p className="side-hint">
                      Assigning sets the driver to <strong>On trip</strong> for this booking's dates.
                    </p>
                  </>
                ) : (
                  <p className="side-hint">
                    No available chauffeurs.{" "}
                    <Link className="spec-link" to="/dashboard/chauffeurs/new">Add one</Link>{" "}
                    or free up a driver from another trip.
                  </p>
                )
              ) : (
                <p className="side-hint">
                  This booking is {b.status.toLowerCase()}, so no chauffeur can be assigned.
                </p>
              )}
          
            </div>
          </div>
        </div>
      )}

      {agreementModal && (
        <div className="modal-overlay" onClick={() => setAgreementModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>Rental agreement</h3>
              <button type="button" className="icon-btn" onClick={() => setAgreementModal(false)} aria-label="Close">✕</button>
            </header>
            <div className="modal-body">
              <button
                type="button"
                className="btn btn-primary pay-btn"
                onClick={() => downloadAgreement(
                  { ...b, depositStatus: b.deposit_status, depositAmount: depositAmt },
                  { ...policy, deposit: depositAmt }
                )}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
                  <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                </svg>
                Download agreement
              </button>
              <p className="side-hint">
                Pre-filled with the booking, the KES {fmtAmount(depositAmt)}{" "}
                deposit and the KES {fmtAmount(policy.lateFeePerHour)}/hour late
                clause from your rental policy.
              </p>
          
            </div>
          </div>
        </div>
      )}

      {/* The customer is looking at their phone and so is whoever is standing
          at the counter with them; a corner indicator on a long page is the
          wrong place for the only thing happening. */}
      {payWaiting && (
        <LoadingOverlay
          label="Waiting for the customer to pay…"
          note="They approve the prompt on their phone. This closes on its own once it clears."
          onCancel={stopPolling}
        />
      )}

    </>
  );
}