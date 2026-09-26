/* Mock data for review requests, until the backend exists.

   The dashboard lists finished bookings whose renter hasn't reviewed yet; the
   business picks one and "sends" an SMS with a link to /r/:token. The public
   page looks the token up here. When the API lands, swap these two functions
   for real calls (GET pending reviews, POST send request, GET/POST /r/:token)
   and delete the sample rows. */

const PENDING = [
  {
    ref: "BK-1042",
    token: "k7Qm2xLp",
    customer: "Wanjiku Kamau",
    phone: "+254 712 345 678",
    vehicle: "Toyota Prado TX",
    plate: "KDA 482M",
    start: "2026-09-12",
    end: "2026-09-15",
  },
  {
    ref: "BK-1038",
    token: "p3Vn8rTz",
    customer: "Brian Otieno",
    phone: "+254 722 908 114",
    vehicle: "Mazda CX-5",
    plate: "KCY 219B",
    start: "2026-09-08",
    end: "2026-09-10",
  },
  {
    ref: "BK-1031",
    token: "d9Hs4wKe",
    customer: "Amina Hassan",
    phone: "+254 733 561 027",
    vehicle: "Toyota Axio",
    plate: "KDF 730X",
    start: "2026-09-01",
    end: "2026-09-04",
  },
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchPendingReviews() {
  await wait(250);
  return PENDING;
}

export async function sendReviewRequest(ref) {
  await wait(900);
  const b = PENDING.find((p) => p.ref === ref);
  if (!b) throw new Error("That booking can't be found");
  return { link: reviewLink(b.token), sent_to: b.phone };
}

export async function fetchReviewRequest(token) {
  await wait(300);
  return PENDING.find((p) => p.token === token) || null;
}

export async function submitReview(token, { rating, review }) {
  await wait(700);
  if (!PENDING.some((p) => p.token === token)) throw new Error("This link has expired");
  return { ok: true, rating, review };
}

export function reviewLink(token) {
  return `${window.location.origin}/r/${token}`;
}

export function smsText(b, businessName = "your rental company") {
  return `Hi ${b.customer.split(" ")[0]}, thanks for renting the ${b.vehicle} with ${businessName}. How was your trip? Leave a quick review: ${reviewLink(b.token)}`;
}
