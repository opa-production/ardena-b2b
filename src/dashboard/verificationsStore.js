// Mock Dojah EasyOnboard sessions — read-only until the webhook is wired in.
// One session = a renter walking through the widget: national ID lookup,
// selfie + liveness, then driver's licence. Statuses mirror the Dojah
// dashboard: Verified (successful), Failed, In progress, Abandoned.

export const QUOTA = 50; // Growth plan sessions per month

// Swap for the live widget link from the Dojah dashboard (EasyOnboard → share)
export const WIDGET_URL = "https://identity.dojah.io/?widget_id=ardena-renter-kyc";

export const SESSIONS = [
  { id: "VRF-1032", customer: "Kevin Omondi", phone: "0715 402 118", ref: "BK-2438", status: "In progress", steps: { id: "Passed", selfie: "Pending", licence: "—" }, reason: null, date: "2026-07-03" },
  { id: "VRF-1031", customer: "Esther Nyambura", phone: "0729 884 501", ref: null, status: "Failed", steps: { id: "Failed", selfie: "—", licence: "—" }, reason: "ID number didn't match the registry", date: "2026-07-03" },
  { id: "VRF-1030", customer: "Mercy Wambui", phone: "0728 664 903", ref: "BK-2437", status: "In progress", steps: { id: "Pending", selfie: "—", licence: "—" }, reason: null, date: "2026-07-02" },
  { id: "VRF-1029", customer: "Dennis Mutua", phone: "0733 218 447", ref: "BK-2436", status: "Abandoned", steps: { id: "Passed", selfie: "—", licence: "—" }, reason: "Dropped off at the selfie step", date: "2026-07-02" },
  { id: "VRF-1028", customer: "Collins Kiprop", phone: "0741 220 976", ref: null, status: "Failed", steps: { id: "Passed", selfie: "Failed", licence: "—" }, reason: "Selfie failed the liveness check", date: "2026-07-01" },
  { id: "VRF-1027", customer: "Grace Achieng", phone: "0701 559 232", ref: "BK-2435", status: "Verified", steps: { id: "Passed", selfie: "Passed", licence: "Passed" }, reason: null, date: "2026-06-30" },
  { id: "VRF-1026", customer: "Janet Wairimu", phone: "0722 013 448", ref: null, status: "Abandoned", steps: { id: "Passed", selfie: "Passed", licence: "—" }, reason: "Dropped off at the licence step", date: "2026-06-29" },
  { id: "VRF-1025", customer: "James Otieno", phone: "0722 807 154", ref: "BK-2434", status: "Verified", steps: { id: "Passed", selfie: "Passed", licence: "Passed" }, reason: null, date: "2026-06-28" },
  { id: "VRF-1024", customer: "Wanjiku Kamau", phone: "0722 118 340", ref: "BK-2431", status: "Verified", steps: { id: "Passed", selfie: "Passed", licence: "Passed" }, reason: null, date: "2026-06-25" },
  { id: "VRF-1023", customer: "Brian Mwangi", phone: "0740 331 806", ref: "BK-2429", status: "Verified", steps: { id: "Passed", selfie: "Passed", licence: "Passed" }, reason: null, date: "2026-06-22" },
  { id: "VRF-1022", customer: "Faith Njeri", phone: "0712 990 574", ref: "BK-2426", status: "Verified", steps: { id: "Passed", selfie: "Passed", licence: "Passed" }, reason: null, date: "2026-06-20" },
  { id: "VRF-1021", customer: "Samuel Kiptoo", phone: "0723 447 019", ref: "BK-2424", status: "Verified", steps: { id: "Passed", selfie: "Passed", licence: "Passed" }, reason: null, date: "2026-06-18" },
  { id: "VRF-1020", customer: "Rose Chebet", phone: "0736 210 583", ref: "BK-2411", status: "Verified", steps: { id: "Passed", selfie: "Passed", licence: "Passed" }, reason: null, date: "2026-05-29" },
];

export const STATUS_CHIP = {
  Verified: "active",
  Failed: "cancelled",
  "In progress": "pending",
  Abandoned: "completed",
};
