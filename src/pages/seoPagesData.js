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
    slug: "fleet-management-system-kenya",
    nav: "Fleet management",
    title: "Fleet management system, Kenya | Ardena for Business",
    description:
      "Fleet management software for car hire and rental fleets in Kenya: vehicle registry, documents and expiry reminders, availability, utilisation and monthly statements per vehicle.",
    h1: "A fleet management system for Kenyan rental fleets",
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
    slug: "car-hire-booking-system-kenya",
    nav: "Car hire booking system",
    title: "Car hire booking system with M-Pesa, Kenya | Ardena for Business",
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
  {
    slug: "car-hire-management-system-kenya",
    nav: "Car hire management system",
    title: "Car hire management system for Kenya | Ardena for Business",
    description: `A car hire management system for Kenyan rental businesses: bookings, pickups and returns, handover records, M-Pesa payments and renter checks on one screen. Free for ${FREE_MONTHS} months.`,
    h1: "The car hire management system for Kenyan rental desks",
    lead:
      "From the morning's pickups to the evening's returns, Ardena for Business keeps the whole day of a car hire desk on one screen your whole team can see.",
    sections: [
      {
        label: "THE DAY",
        heading: "Every pickup and return, handled",
        desc: "A car hire desk lives on timing. The system shows what goes out today, what comes back, and what's late.",
        points: [
          { title: "Today's pickups and returns", desc: "A calendar of what leaves and what's due back, day by day." },
          { title: "Check-out in a minute", desc: "Odometer, fuel level and condition photos recorded before the keys go out." },
          { title: "Check-in with evidence", desc: "The same record on return, so damage and fuel disputes are settled by photos, not arguments." },
          { title: "Late returns counted", desc: "Due-back times and late fees per started hour on the booking." },
        ],
      },
      {
        label: "THE CUSTOMER",
        heading: "Know who you're handing the keys to",
        desc: "The riskiest moment in car hire is the handover. The system makes it a checked step, not a guess.",
        points: [
          { title: "ID and licence checks", desc: `Verify a renter's ID, licence and liveness before handover, at KES ${CHECK_PRICE} per check.` },
          { title: "Payment before pickup", desc: "Send an M-Pesa prompt from the booking and see when it lands." },
          { title: "Customer history", desc: "Every client's past bookings and payments in one profile." },
          { title: "Handover codes for app renters", desc: "App bookings need the renter's one-time code at pickup and return." },
        ],
      },
    ],
    faq: [
      { q: "What is a car hire management system?", a: "Software a car hire business runs its day on: the fleet, bookings, pickups and returns, customer checks and payments, in one shared system instead of notebooks and chats." },
      { q: "Is there one built for Kenya?", a: "Yes. Ardena for Business is built for Kenyan car hire businesses, with M-Pesa payment prompts and renter ID verification built in." },
      { q: "Can my whole team use it?", a: "Yes. Each person gets their own login and role, and every action is recorded in an activity log." },
    ],
  },
  {
    slug: "car-rental-management-system-kenya",
    nav: "Car rental management system",
    title: "Car rental management system, Kenya | Ardena for Business",
    description:
      "Move your car rental business off notebooks, spreadsheets and WhatsApp groups onto one car rental management system your whole team shares. Built for Kenya.",
    h1: "A car rental management system to replace the notebook",
    lead:
      "When the business was three cars, a notebook worked. At ten it's a WhatsApp group, a spreadsheet and a lot of phone calls. Ardena for Business puts it all in one system.",
    sections: [
      {
        label: "THE SWITCH",
        heading: "Out of the notebook, into one system",
        desc: "Everything that lived in someone's head or phone becomes a record the whole business can see.",
        points: [
          { title: "Cars in one registry", desc: "Plates, rates, documents and status for every vehicle." },
          { title: "Bookings no one can double", desc: "Overlapping reservations on the same car are refused automatically." },
          { title: "Customers on file", desc: "Each client's bookings and payments in one profile." },
          { title: "Money you can trace", desc: "M-Pesa prompts and cash recorded against the booking they belong to." },
        ],
      },
      {
        label: "THE TEAM",
        heading: "Grow without losing track",
        desc: "More staff shouldn't mean less control. Everyone works in the same system, with the access their job needs.",
        points: [
          { title: "Roles", desc: "Owner, Manager, Finance, Booking agent and Viewer, each seeing what their job needs." },
          { title: "Activity log", desc: "Who created, changed or cancelled what, and when." },
          { title: "Two-step sign-in", desc: "Optional codes by email or SMS at sign-in and before sensitive changes." },
          { title: "Help getting set up", desc: "Add vehicles and customers yourself, or with the Ardena team during onboarding." },
        ],
      },
    ],
    faq: [
      { q: "How do I move my existing fleet onto it?", a: "Add vehicles and customers yourself, and the Ardena team helps during onboarding. The first vehicle takes a minute." },
      { q: "Do my staff need training?", a: "Very little. It works like the tools they already use: a list of cars, a list of bookings, and a button to get paid." },
      { q: "Is my business data private?", a: "Yes. Every business runs in its own isolated workspace; no other operator can see your fleet, customers or payments." },
    ],
  },
  {
    slug: "car-hire-software-kenya",
    nav: "Car hire software",
    title: "Car hire software for Kenya: features & free trial | Ardena for Business",
    description: `Car hire software for Kenyan businesses. See what's included, what it costs (free for ${FREE_MONTHS} months) and how to get started with Ardena for Business.`,
    h1: "Car hire software: what you get and how to start",
    lead: `Ardena for Business is car hire software for Kenyan rental businesses of any size. Every module is included, the first ${FREE_MONTHS} months are free, and there is no card required.`,
    sections: [
      {
        label: "WHAT YOU GET",
        heading: "Every module, from day one",
        desc: "No add-ons and no feature tiers. Every workspace gets the whole system.",
        points: [
          { title: "Fleet and documents", desc: "Every vehicle, its rate, logbook, insurance and expiry dates." },
          { title: "Bookings and handovers", desc: "Reservations, a pickup and return calendar, and check-out and check-in records." },
          { title: "Payments", desc: "M-Pesa prompts, cash records, and what's collected versus owed." },
          { title: "Verification and team", desc: "Renter ID and licence checks, staff roles and an activity log." },
        ],
      },
      {
        label: "HOW TO START",
        heading: "Up and running in a day",
        desc: "Access is by request, so every business on the platform is a real, verified rental company.",
        points: [
          { title: "Request access", desc: "Tell us about your business in a short form." },
          { title: "Get verified", desc: "We check your registration and director details, usually within 24 hours." },
          { title: "Add your cars", desc: "Your logins arrive by email; the first vehicle takes a minute to add." },
          { title: `Free for ${FREE_MONTHS} months`, desc: `Renter checks are the only charge, at KES ${CHECK_PRICE} each.` },
        ],
      },
    ],
    faq: [
      { q: "How much does car hire software cost in Kenya?", a: `Ardena for Business is free for the first ${FREE_MONTHS} months with every module. Renter checks are KES ${CHECK_PRICE} each. Pricing after that will be announced in advance.` },
      { q: "Do I need to install anything?", a: "No. It runs in a web browser on a computer, tablet or phone." },
      { q: "How long does it take to get started?", a: "Businesses are usually verified and sent their logins within 24 hours of requesting access." },
    ],
  },
  {
    slug: "car-rental-booking-system-kenya",
    nav: "Car rental booking system",
    title: "Car rental booking system, Kenya | Ardena for Business",
    description:
      "A car rental booking system that takes bookings from your own desk and from renters on the Ardena car rental app, in one calendar, with M-Pesa payments.",
    h1: "A car rental booking system for your desk and the app",
    lead:
      "Take bookings the way you always have, and add renters who find you on the Ardena car rental app. Both land in the same calendar, on the same cars, with no double-bookings.",
    sections: [
      {
        label: "YOUR DESK",
        heading: "Bookings you take yourself",
        desc: "Walk-ins, phone calls and repeat customers, booked in seconds.",
        points: [
          { title: "Book in seconds", desc: "Pick the car and dates; the system checks availability for you." },
          { title: "Paid by M-Pesa", desc: "Send a payment prompt straight from the booking." },
          { title: "Calendar view", desc: "Pickups and returns laid out day by day." },
          { title: "No commission", desc: "Bookings you make yourself carry no Ardena commission." },
        ],
      },
      {
        label: "THE APP",
        heading: "Renters who find you online",
        desc: "List cars on the Ardena car rental app and let renters book and pay there.",
        points: [
          { title: "Reviewed listings", desc: "Ardena reviews each listing before renters can book it." },
          { title: "Same calendar", desc: "App bookings block the car in your dashboard too, so nothing is double-booked." },
          { title: "Message renters", desc: "Talk to renters before and during the trip from the dashboard." },
          { title: "Earnings and payouts", desc: "App earnings, commission and withdrawals in your finances." },
        ],
      },
    ],
    faq: [
      { q: "Can customers book my cars online?", a: "Yes, by listing them on the Ardena car rental app. Those bookings appear in your dashboard alongside the ones you take yourself." },
      { q: "Is there a commission?", a: "Only on bookings made through the Ardena app. Bookings you create in the dashboard carry no commission." },
      { q: "What stops double-bookings?", a: "Every booking, from your desk or the app, blocks the car's dates, and overlapping bookings are refused." },
    ],
  },
  {
    slug: "car-hire-business-management-system",
    nav: "For car hire owners",
    title: "Car hire business management system for owners | Ardena for Business",
    description:
      "Run your car hire business, not just its bookings: what each car earns, what's owed, who on your team did what, and monthly statements for car owners.",
    h1: "Run the car hire business, not just the bookings",
    lead:
      "As the owner you need answers, not a pile of receipts: which cars are paying their way, what money is still out, and what your team did while you were away.",
    sections: [
      {
        label: "THE MONEY",
        heading: "Know what the business made",
        desc: "Every shilling is tied to the booking and the car it came from.",
        points: [
          { title: "Net collections", desc: "Direct bookings and Ardena app earnings in one figure." },
          { title: "What's still owed", desc: "Outstanding amounts on live bookings, at a glance." },
          { title: "Earnings per car", desc: "Utilisation and a monthly statement PDF for each vehicle." },
          { title: "Car owner statements", desc: "Share a vehicle's monthly earnings with the person who owns it." },
        ],
      },
      {
        label: "THE TEAM",
        heading: "Accountability without hovering",
        desc: "You can't be at the desk all day. The system records what happened when you weren't.",
        points: [
          { title: "Activity log", desc: "Every booking, change and cancellation, with who did it." },
          { title: "Roles", desc: "Give finance, booking agents and managers only the access they need." },
          { title: "Sensitive changes confirmed", desc: "With two-step sign-in on, staff changes and deletions need a one-time code." },
          { title: "Verified payouts", desc: "App payouts only go to accounts confirmed by a one-time code." },
        ],
      },
    ],
    faq: [
      { q: "Can I see what each car earns?", a: "Yes. Each vehicle shows its utilisation, and has a monthly statement with bookings, days rented and gross earnings." },
      { q: "Can I control what staff can do?", a: "Yes. Assign roles such as Manager, Finance or Booking agent, and every action is recorded in an activity log." },
      { q: "Can I use it for cars I manage for other owners?", a: "Yes. The monthly statement per vehicle is built to share with the car's owner." },
    ],
  },
  {
    slug: "vehicle-rental-management-system-kenya",
    nav: "Vehicle rental management",
    title: "Vehicle rental management system, Kenya | Ardena for Business",
    description:
      "A vehicle rental management system for Kenyan fleets of saloons, SUVs and more, self-drive or chauffeur-driven: fleet, bookings, drivers, verification and M-Pesa.",
    h1: "Vehicle rental management for every kind of fleet",
    lead:
      "Saloons and SUVs, self-drive and chauffeur-driven, a few cars or a large fleet. Ardena for Business manages the vehicles and the rentals the same way, whatever the mix.",
    sections: [
      {
        label: "THE FLEET",
        heading: "Every vehicle, whatever the type",
        desc: "Each vehicle keeps its own category, rate, documents and status.",
        points: [
          { title: "Categories and rates", desc: "Saloon, SUV and more, each with its own day rate." },
          { title: "Documents and expiry", desc: "Logbook and insurance on file; insurance and inspection dates flagged early." },
          { title: "Maintenance status", desc: "Mark a vehicle as in maintenance and it comes off the Ardena app until it's back." },
          { title: "Handover records", desc: "Odometer, fuel and photos at every pickup and return." },
        ],
      },
      {
        label: "THE RENTAL",
        heading: "Self-drive or with a driver",
        desc: "Both kinds of hire, run from the same system.",
        points: [
          { title: "Chauffeurs", desc: "Keep your drivers on file and assign them to bookings." },
          { title: "Renter checks", desc: `ID and licence verification for self-drive hires, at KES ${CHECK_PRICE} per check.` },
          { title: "Payments", desc: "M-Pesa prompts and cash, recorded against each booking." },
          { title: "App listings", desc: "List vehicles as self-drive, chauffeur-driven or both on the Ardena app." },
        ],
      },
    ],
    faq: [
      { q: "Does it handle chauffeur-driven hires?", a: "Yes. Keep your drivers on file, assign them to bookings, and list vehicles as self-drive, chauffeur-driven or both on the Ardena app." },
      { q: "Can I take a vehicle out of service?", a: "Yes. Mark it as in maintenance and the whole team sees it; if it's listed on the Ardena app, it comes off the app until it's back." },
      { q: "Is it only for cars?", a: "It is built for passenger vehicle rental: saloons, SUVs and similar vehicles, self-drive or with a driver." },
    ],
  },
  {
    slug: "car-hire-management-system-nairobi",
    nav: "Nairobi",
    title: "Car hire management system in Nairobi | Ardena for Business",
    description: `Car hire management software for Nairobi rental businesses: bookings, pickups across the city, M-Pesa payments and renter verification. Free for ${FREE_MONTHS} months.`,
    h1: "Car hire management for Nairobi rental businesses",
    lead:
      "Nairobi car hire moves fast: pickups across the city, customers who want to pay by M-Pesa, and a lot of cars to keep track of. Ardena for Business keeps it in one place.",
    sections: [
      {
        label: "IN THE CITY",
        heading: "Built for a busy Nairobi desk",
        desc: "Many bookings, many locations, one shared view for the team.",
        points: [
          { title: "Pickup locations", desc: "Each booking records where the car is collected, wherever in the city that is." },
          { title: "A shared calendar", desc: "Everyone sees the day's pickups and returns, whoever is on shift." },
          { title: "M-Pesa at the booking", desc: "Customers pay by prompt on their phone, no card needed." },
          { title: "Chauffeurs on call", desc: "Assign drivers to bookings for chauffeur-driven hires." },
        ],
      },
      {
        label: "MORE CUSTOMERS",
        heading: "Reach Nairobi renters online",
        desc: "List cars on the Ardena car rental app and let renters in the city book and pay there.",
        points: [
          { title: "Reviewed listings", desc: "Ardena reviews each listing before renters can book it." },
          { title: "Your pickup point on the map", desc: "Set the listing's location, or pin it from your current position." },
          { title: "Renters verified", desc: "App renters' ID and licence status shows on the booking." },
          { title: "Message renters first", desc: "Reach renters with a live trip about pickup and return." },
        ],
      },
    ],
    faq: [
      { q: "Is there car hire software for Nairobi businesses?", a: "Yes. Ardena for Business is built for car hire businesses across Kenya, Nairobi included, to run fleet, bookings, payments and renter checks in one place." },
      { q: "Can I list my Nairobi cars online?", a: "Yes, on the Ardena car rental app. Each listing is reviewed by Ardena before renters can book it." },
      { q: "How do I get started?", a: `Request access; we verify your business and send logins, usually within 24 hours. The first ${FREE_MONTHS} months are free.` },
    ],
  },
  {
    slug: "car-hire-management-system-nakuru",
    nav: "Nakuru",
    title: "Car hire management system in Nakuru | Ardena for Business",
    description: `Car hire management software for Nakuru rental businesses, from the team that builds Ardena in Nakuru: bookings, M-Pesa payments and renter verification. Free for ${FREE_MONTHS} months.`,
    h1: "Car hire management for Nakuru rental businesses",
    lead:
      "Ardena is built in Nakuru. Ardena for Business gives local car hire businesses the same system as the big city fleets: bookings, payments, renter checks and the whole team in one place.",
    sections: [
      {
        label: "LOCAL",
        heading: "Made down the road",
        desc: "The team behind Ardena works from Nakuru, so help getting set up is close to home.",
        points: [
          { title: "Onboarding help", desc: "Add your cars and customers yourself, or with the Ardena team." },
          { title: "M-Pesa payments", desc: "Customers pay by prompt on their phone, straight from the booking." },
          { title: "Renter checks", desc: `ID and licence verification before handover, at KES ${CHECK_PRICE} per check.` },
          { title: "Your whole team", desc: "Separate logins and roles for everyone at the desk." },
        ],
      },
      {
        label: "MORE CUSTOMERS",
        heading: "Visitors book online",
        desc: "List cars on the Ardena car rental app for renters heading to Nakuru, Naivasha and beyond.",
        points: [
          { title: "Reviewed listings", desc: "Ardena reviews each listing before renters can book it." },
          { title: "One calendar", desc: "App bookings and your own share the same dates, so nothing is double-booked." },
          { title: "Handover codes", desc: "App renters give a one-time code at pickup and return." },
          { title: "Earnings in one place", desc: "App earnings, commission and payouts next to your own takings." },
        ],
      },
    ],
    faq: [
      { q: "Is there car hire software for Nakuru businesses?", a: "Yes. Ardena for Business is built by Ardena, based in Nakuru, for car hire businesses across Kenya." },
      { q: "Can visitors to Nakuru book my cars online?", a: "Yes, by listing them on the Ardena car rental app. Those bookings appear in your dashboard with your own." },
      { q: "How do I get started?", a: `Request access; we verify your business and send logins, usually within 24 hours. The first ${FREE_MONTHS} months are free.` },
    ],
  },
];

export const seoPage = (slug) => SEO_PAGES.find((p) => p.slug === slug);
