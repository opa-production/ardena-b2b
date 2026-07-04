// In-memory notifications store (mock backend). Items reference real records
// in the other stores so links land somewhere meaningful.

let notifications = [
  { id: 1, kind: "payment", title: "Payment received, KES 36,000", meta: "James Otieno paid for BK-2434 via M-Pesa.", time: "Today, 08:56", read: false, to: "/dashboard/bookings/BK-2434" },
  { id: 2, kind: "verification", title: "Verification failed", meta: "Esther Nyambura's ID lookup came back with a mismatch.", time: "Today, 08:12", read: false, to: "/dashboard/verification" },
  { id: 3, kind: "booking", title: "New booking request", meta: "Kevin Omondi requested the Toyota Premio, 10 – 12 Jul.", time: "Yesterday, 16:40", read: false, to: "/dashboard/bookings/BK-2438" },
  { id: 4, kind: "fleet", title: "Insurance expiring soon", meta: "Toyota Prado (KDL 482A) cover ends in 8 days.", time: "Yesterday, 09:00", read: false, to: "/dashboard/fleet/KDL 482A" },
  { id: 5, kind: "payment", title: "Payment prompt sent", meta: "STK push sent to Mercy Wambui for BK-2437.", time: "2 Jul, 14:22", read: true, to: "/dashboard/bookings/BK-2437" },
  { id: 6, kind: "booking", title: "Rental started", meta: "Wanjiku Kamau picked up the Toyota Prado at Karen branch.", time: "2 Jul, 10:03", read: true, to: "/dashboard/bookings/BK-2431" },
  { id: 7, kind: "booking", title: "Booking confirmed", meta: "Grace Achieng, Subaru Forester, 9 – 13 Jul.", time: "30 Jun, 11:50", read: true, to: "/dashboard/bookings/BK-2435" },
  { id: 8, kind: "verification", title: "Verification passed", meta: "Grace Achieng cleared ID and selfie checks.", time: "30 Jun, 11:47", read: true, to: "/dashboard/verification" },
  { id: 9, kind: "payment", title: "Refund issued, KES 25,500", meta: "Daniel Kimani's cancelled Hilux booking was refunded.", time: "26 Jun, 15:08", read: true, to: "/dashboard/bookings/BK-2421" },
  { id: 10, kind: "staff", title: "Staff invite accepted", meta: "Susan Njoki joined the workspace as Finance.", time: "20 Jun, 09:31", read: true, to: "/dashboard/staff" },
];

const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getNotifications() {
  return notifications;
}

export function markRead(id) {
  const n = notifications.find((x) => x.id === id);
  if (!n || n.read) return; // avoid pointless re-renders
  notifications = notifications.map((x) => (x.id === id ? { ...x, read: true } : x));
  emit();
}

export function markAllRead() {
  if (notifications.every((n) => n.read)) return;
  notifications = notifications.map((n) => (n.read ? n : { ...n, read: true }));
  emit();
}
