// In-memory clients store (mock backend), same pattern as fleetStore and
// bookingsStore. Clients are the business's renters, booking counts and
// spend are derived live from bookingsStore, so the two stay in sync.

let clients = [
  { id: "CL-214", name: "Esther Nyambura", phone: "0729 884 615", email: "enyambura@gmail.com", idType: "National ID", verification: "Failed", joined: "2026-07-03", notes: "ID number mismatch on first check, asked to resubmit." },
  { id: "CL-213", name: "Kevin Omondi", phone: "0715 402 118", email: "komondi@gmail.com", idType: "National ID", verification: "Pending", joined: "2026-07-03", notes: "" },
  { id: "CL-212", name: "Mercy Wambui", phone: "0728 664 903", email: "mercywambui@gmail.com", idType: "National ID", verification: "Pending", joined: "2026-07-02", notes: "" },
  { id: "CL-211", name: "Dennis Mutua", phone: "0733 218 447", email: "dmutua@gmail.com", idType: "National ID", verification: "Pending", joined: "2026-07-01", notes: "Books vans for church group trips." },
  { id: "CL-210", name: "Grace Achieng", phone: "0701 559 232", email: "gachieng@gmail.com", idType: "Passport", verification: "Verified", joined: "2026-06-30", notes: "" },
  { id: "CL-209", name: "James Otieno", phone: "0722 807 154", email: "jotieno@gmail.com", idType: "National ID", verification: "Verified", joined: "2026-06-28", notes: "" },
  { id: "CL-208", name: "Wanjiku Kamau", phone: "0722 118 340", email: "wanjiku.kamau@gmail.com", idType: "National ID", verification: "Verified", joined: "2026-06-25", notes: "" },
  { id: "CL-207", name: "Brian Mwangi", phone: "0740 331 806", email: "brianmwangi@outlook.com", idType: "National ID", verification: "Verified", joined: "2026-06-22", notes: "Approved for upcountry hires." },
  { id: "CL-206", name: "Faith Njeri", phone: "0712 990 574", email: "faithnjeri@gmail.com", idType: "National ID", verification: "Verified", joined: "2026-06-20", notes: "" },
  { id: "CL-205", name: "Samuel Kiptoo", phone: "0723 447 019", email: "samuel.kiptoo@chemonics.com", idType: "Passport", verification: "Verified", joined: "2026-06-18", notes: "Corporate account, Chemonics Kenya field operations." },
  { id: "CL-204", name: "Daniel Kimani", phone: "0733 605 281", email: "dkimani254@gmail.com", idType: "National ID", verification: "Verified", joined: "2026-06-15", notes: "" },
  { id: "CL-203", name: "Alice Muthoni", phone: "0708 772 460", email: "alicemuthoni@gmail.com", idType: "National ID", verification: "Verified", joined: "2026-06-12", notes: "" },
  { id: "CL-202", name: "Peter Njoroge", phone: "0721 348 995", email: "pnjoroge@yahoo.com", idType: "National ID", verification: "Verified", joined: "2026-06-05", notes: "" },
  { id: "CL-201", name: "Rose Chebet", phone: "0736 210 583", email: "rose.chebet@gmail.com", idType: "National ID", verification: "Verified", joined: "2026-05-29", notes: "" },
];

const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getClients() {
  return clients;
}

export function getClient(id) {
  return clients.find((c) => c.id === id);
}

export function removeClient(id) {
  clients = clients.filter((c) => c.id !== id);
  emit();
}
