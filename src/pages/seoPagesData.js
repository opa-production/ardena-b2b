/* Search landing pages: one per thing a rental business actually types into
   Google or asks an AI assistant ("car rental software Kenya", "car hire
   booking system with M-Pesa"…). Plain data, no JSX, so the same copy feeds
   the React page (SeoPage.jsx) and the build step that writes static HTML and
   the sitemap (scripts/seo-pages.mjs).

   Every claim here must be true of the product today. No prices beyond the
   free months and the per-check fee (see pricingData.js). */
import { FREE_MONTHS, CHECK_PRICE } from "./pricingData.js";

export const SEO_PAGES = [
  {
    slug: "car-rental-software-kenya",
    nav: "Car rental software",
    title: "Car rental management software for Kenya | Ardena for Business",
    description: `Car rental management software built for Kenyan car hire businesses: fleet, bookings, renter verification, M-Pesa payments and staff roles in one dashboard. Free for ${FREE_MONTHS} months.`,
    h1: "Car rental management software, built for Kenya",
    lead:
      "Run your car hire business from one dashboard: every car, every booking, every renter checked and every shilling tracked. Built around how rental businesses in Kenya actually work, M-Pesa included.",
    sections: [
      {
        label: "THE DAILY WORK",
        heading: "Everything a rental desk does, in one place",
        desc:
          "Most car hire businesses run on a notebook, a spreadsheet and a WhatsApp group. Ardena for Business puts the whole operation in one system your team shares.",
        points: [
          { title: "Fleet registry", desc: "Every car with its plate, day rate, logbook and insurance documents, and reminders before insurance or inspection runs out." },
          { title: "Bookings without clashes", desc: "Create reservations and the system blocks double-bookings on the same car automatically." },
          { title: "Pickup and return", desc: "Record odometer, fuel and condition photos at check-out and check-in, so every dispute has evidence." },
          { title: "Payments that reconcile", desc: "Send an M-Pesa prompt from any booking, record cash, and see what's collected and what's still owed." },
        ],
      },
      {
        label: "WHY IT FITS",
        heading: "Made for Kenyan rental businesses",
        desc:
          "Not a foreign fleet tool with the edges filed off. Ardena for Business is built by the team behind the Ardena car rental app, for businesses from a handful of cars to large fleets.",
        points: [
          { title: "M-Pesa first", desc: "Customers approve payment prompts on their phone. No card terminal needed." },
          { title: "Renters verified", desc: `ID, liveness and driving licence checks before the keys go out, at KES ${CHECK_PRICE} per check.` },
          { title: "Your team, your rules", desc: "Owner, Manager, Finance, Booking agent and Viewer roles, with every action in an activity log." },
          { title: "More bookings, optional", desc: "List cars on the Ardena car rental app. Ardena reviews each listing before renters can book it." },
        ],
      },
    ],
    faq: [
      { q: "Is there car rental software made for Kenya?", a: "Yes. Ardena for Business is car rental management software built for Kenyan car hire and fleet businesses, with M-Pesa payment prompts, renter ID verification and staff roles built in." },
      { q: "How much does it cost?", a: `The first ${FREE_MONTHS} months are free, with every module and every vehicle. Renter verification checks are KES ${CHECK_PRICE} each. Pricing after the free months will be announced to every workspace in advance.` },
      { q: "How do I sign up?", a: "Access is by request. Ardena verifies your business registration and director details, then sends your logins, usually within 24 hours." },
    ],
  },
  {
    slug: "fleet-management-software",
    nav: "Fleet management",
    title: "Fleet management software for rental fleets | Ardena for Business",
    description:
      "Fleet management software for car hire and rental fleets in Kenya: vehicle registry, documents and expiry reminders, availability, utilisation and monthly statements per vehicle.",
    h1: "Fleet management software for rental fleets",
    lead:
      "Know where every car is in its life: out on a booking, due back, in the workshop, or about to miss an insurance renewal. One registry for the whole fleet, shared by the whole team.",
    sections: [
      {
        label: "THE REGISTRY",
        heading: "Every vehicle, fully accounted for",
        desc:
          "Each car has a record the whole team works from, instead of details scattered across phones and files.",
        points: [
          { title: "Status at a glance", desc: "Available, on a booking or in maintenance, across the whole fleet." },
          { title: "Documents on file", desc: "Logbook and insurance certificate uploaded against each car." },
          { title: "Expiry reminders", desc: "Insurance and inspection dates flagged before they lapse, not after." },
          { title: "Chauffeurs too", desc: "Assign drivers to bookings for chauffeur-driven hires." },
        ],
      },
      {
        label: "THE NUMBERS",
        heading: "See what each car earns",
        desc:
          "A fleet only pays when its cars are out. Ardena for Business shows which ones are working and which ones are parked.",
        points: [
          { title: "Utilisation", desc: "The share of days each car was booked over the last 90 days." },
          { title: "Monthly statements", desc: "A PDF per vehicle with bookings, days rented and gross earnings, ready to share with the car's owner." },
          { title: "Handover history", desc: "Odometer, fuel and photos from every pickup and return, per car." },
          { title: "One flat workspace", desc: "Every module is included, whatever the size of your fleet." },
        ],
      },
    ],
    faq: [
      { q: "Does it work for a small fleet?", a: "Yes. It is built for businesses from a handful of cars to large fleets, and every module is included at any size." },
      { q: "Can I share earnings with car owners?", a: "Yes. Each vehicle has a monthly statement PDF with its bookings, days rented, utilisation and gross earnings." },
      { q: "Does it track vehicles by GPS?", a: "Live GPS tracking is on the roadmap. Fleet status, documents, handovers and earnings are available today." },
    ],
  },
  {
    slug: "car-hire-booking-system",
    nav: "Car hire booking system",
    title: "Car hire booking system with M-Pesa | Ardena for Business",
    description:
      "A car hire booking system for Kenyan rental businesses: reservations with double-booking checks, a pickup and return calendar, M-Pesa payment prompts and handover records.",
    h1: "A car hire booking system with M-Pesa built in",
    lead:
      "Take a booking, get paid by M-Pesa, hand over the car and take it back, all on the same record. No double-bookings, no chasing payments across chats.",
    sections: [
      {
        label: "THE BOOKING",
        heading: "From enquiry to keys in minutes",
        desc: "Every reservation lives on one record, from the first call to the car coming back.",
        points: [
          { title: "Clash-free reservations", desc: "The system refuses a booking that overlaps another on the same car." },
          { title: "Pickups and returns calendar", desc: "See what goes out and what comes back, day by day." },
          { title: "Handover with evidence", desc: "Odometer, fuel level and condition photos at check-out and check-in." },
          { title: "Late returns counted", desc: "Return time and late fees per started hour are part of the record." },
        ],
      },
      {
        label: "THE MONEY",
        heading: "Paid before the car leaves",
        desc: "Payment is part of the booking, not a separate chase.",
        points: [
          { title: "M-Pesa prompts", desc: "Send a payment prompt from the booking; the customer approves it on their phone." },
          { title: "Cash recorded too", desc: "Counter payments sit next to M-Pesa ones, so the totals add up." },
          { title: "Outstanding at a glance", desc: "See what's still owed on live bookings." },
          { title: "App bookings in the same place", desc: "Bookings from the Ardena car rental app arrive alongside your own, with renter messages." },
        ],
      },
    ],
    faq: [
      { q: "Can customers pay by M-Pesa?", a: "Yes. Staff send an M-Pesa payment prompt from any booking and the customer approves it on their phone. Cash payments can be recorded too." },
      { q: "Does it prevent double-bookings?", a: "Yes. A booking that overlaps an existing one on the same car is refused automatically." },
      { q: "Can renters book online?", a: "Businesses can list cars on the Ardena car rental app, where renters book and pay. Those bookings appear in the same dashboard." },
    ],
  },
  {
    slug: "renter-verification",
    nav: "Renter verification",
    title: "Verify car rental customers' ID and licence | Ardena for Business",
    description: `Verify a renter's national ID, driving licence and liveness before handing over the keys. Built into Ardena for Business, KES ${CHECK_PRICE} per check.`,
    h1: "Verify every renter before they drive away",
    lead:
      "Check a renter's ID, driving licence and liveness in seconds, right from the booking. Know who has your car before the keys leave your hand.",
    sections: [
      {
        label: "THE CHECK",
        heading: "Who is really renting your car",
        desc:
          "A photocopied ID is not verification. Ardena for Business checks the person against official records while they wait.",
        points: [
          { title: "ID lookup", desc: "Confirm the ID number, name and details match official records." },
          { title: "Liveness", desc: "Make sure the person is present and matches the ID photo." },
          { title: "Driving licence", desc: "Check the licence before a self-drive hire." },
          { title: "Share a QR", desc: "Renters can start the check from their own phone." },
        ],
      },
      {
        label: "THE COST",
        heading: "Pay only for the checks you run",
        desc: "No separate verification contract and no monthly minimum.",
        points: [
          { title: `KES ${CHECK_PRICE} per check`, desc: "A flat fee, drawn from a prepaid wallet you top up like airtime." },
          { title: "Every result kept", desc: "Past checks stay searchable against the renter and booking." },
          { title: "App renters pre-checked", desc: "Renters from the Ardena app show whether their ID and licence are verified on the booking." },
          { title: "Handover codes", desc: "App bookings need the renter's one-time code at pickup and return, proof the right person was there." },
        ],
      },
    ],
    faq: [
      { q: "How do I verify a car rental customer in Kenya?", a: `With Ardena for Business you run an ID lookup, liveness and licence check from the dashboard in seconds, at KES ${CHECK_PRICE} per check.` },
      { q: "Do I need a separate verification provider?", a: "No. Verification is built in and pay as you go, from a prepaid wallet." },
      { q: "Is it included in the free months?", a: `The dashboard is free for the first ${FREE_MONTHS} months. Renter checks are the one thing charged from day one, at KES ${CHECK_PRICE} each.` },
    ],
  },
];

export const seoPage = (slug) => SEO_PAGES.find((p) => p.slug === slug);
