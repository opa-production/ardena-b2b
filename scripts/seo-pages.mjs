/* Post-build SEO step (runs after `vite build`, see package.json).

   The site is a single-page app: every URL is served the same index.html with
   an empty <div id="root">, and the words only appear once JavaScript runs.
   Google renders JavaScript, but most AI crawlers (GPTBot, ClaudeBot,
   PerplexityBot) and link previews do not — to them every page was blank and
   titled the same. So for each public page this writes a real HTML file with:

     - its own <title>, description, canonical and Open Graph tags
     - the page's actual text inside #root (React replaces it on load; it is
       visually hidden until then so nothing flashes for people)
     - structured data (SoftwareApplication everywhere, FAQPage on the home page)

   and regenerates sitemap.xml with today's date. Vercel serves /pricing from
   pricing.html via `cleanUrls` (vercel.json); every other path still falls
   through to index.html. The copy comes from src/pages/pricingData.js, the same
   source the pages render from, so the two can't drift. */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MODULES, FAQS, FREE_MONTHS, CHECK_PRICE } from "../src/pages/pricingData.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const SITE = "https://business.ardena.co.ke";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const SOFTWARE = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Ardena for Business",
  url: `${SITE}/`,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Car rental and fleet management software",
  operatingSystem: "Web browser",
  areaServed: { "@type": "Country", name: "Kenya" },
  description:
    "Car rental management software for Kenyan rental and fleet businesses: fleet registry, bookings, renter ID verification, M-Pesa payment prompts, staff roles and an optional listing on the Ardena car rental app.",
  featureList: MODULES.map((m) => m.title),
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KES",
    description: `Free for the first ${FREE_MONTHS} months. Renter verification checks are KES ${CHECK_PRICE} each.`,
  },
  publisher: {
    "@type": "Organization",
    name: "Ardena Platforms Africa Ltd",
    url: "https://ardena.co.ke/",
  },
};

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const modulesList = `<ul>${MODULES.map((m) => `<li><strong>${esc(m.title)}</strong>: ${esc(m.desc)}</li>`).join("")}</ul>`;
const faqList = FAQS.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("");

const PAGES = [
  {
    file: "index.html",
    path: "/",
    title: "Ardena for Business | Car rental management software, Kenya",
    description:
      "Car rental and fleet management software for Kenyan rental businesses. Fleet, bookings, renter ID verification and M-Pesa payments in one dashboard. Free for the first 2 months.",
    ld: [SOFTWARE, FAQ_LD],
    body: `
      <h1>Car rental management software for Kenyan rental businesses</h1>
      <p>Ardena for Business is the dashboard a car hire or fleet business runs on: every vehicle and its documents, every booking with double-bookings caught automatically, renter ID and licence verification before the keys are handed over, and M-Pesa payment prompts sent straight from a booking. Staff get their own logins and roles, and every action is logged.</p>
      <p>Businesses can also list their cars on the Ardena car rental app, where Ardena reviews each listing before renters can book it.</p>
      <h2>What's included</h2>${modulesList}
      <h2>Pricing</h2><p>Free for the first ${FREE_MONTHS} months, every module, every vehicle and your whole team. Renter verification checks are KES ${CHECK_PRICE} each from a prepaid wallet.</p>
      <h2>Frequently asked questions</h2>${faqList}
      <p><a href="/pricing">Pricing</a> · <a href="/contact">Contact</a> · <a href="/signup">Request access</a></p>`,
  },
  {
    file: "pricing.html",
    path: "/pricing",
    title: "Pricing | Ardena for Business car rental software",
    description: `Ardena for Business is free for the first ${FREE_MONTHS} months: fleet, bookings, verification, payments and staff roles. Renter checks KES ${CHECK_PRICE} each.`,
    ld: [SOFTWARE],
    body: `
      <h1>Ardena for Business pricing</h1>
      <p>Your first ${FREE_MONTHS} months are free: every module, every vehicle, your whole team, no card required. Pricing after that will be announced to every workspace well before the free months end.</p>
      <p>Renter verification is pay as you go at KES ${CHECK_PRICE} per check, from a prepaid wallet you top up.</p>
      <h2>Every module included</h2>${modulesList}`,
  },
  {
    file: "contact.html",
    path: "/contact",
    title: "Contact | Ardena for Business",
    description:
      "Talk to the Ardena for Business team about car rental and fleet management software for your business in Kenya.",
    ld: [SOFTWARE],
    body: `
      <h1>Contact Ardena for Business</h1>
      <p>Questions about running your car rental or fleet business on Ardena? Get in touch and the team will help you get set up. Access is by request: we verify every business's registration and director details before issuing logins.</p>`,
  },
];

const template = readFileSync(join(DIST, "index.html"), "utf8");

function render(page) {
  const url = `${SITE}${page.path}`;
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(page.title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${esc(page.description)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(page.title)}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${esc(page.description)}$2`);

  const ld = page.ld
    .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)
    .join("\n    ");
  html = html.replace("</head>", `    ${ld}\n  </head>`);
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"><main class="seo-static">${page.body}\n    </main></div>`
  );
  if (!html.includes('class="seo-static"')) throw new Error(`#root not found for ${page.file}`);
  return html;
}

for (const page of PAGES) {
  writeFileSync(join(DIST, page.file), render(page));
  console.log(`seo: wrote ${page.file} (${page.path})`);
}

const today = new Date().toISOString().slice(0, 10);
const priority = { "/": "1.0", "/pricing": "0.9", "/contact": "0.7" };
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(
  (p) => `  <url>
    <loc>${SITE}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priority[p.path] || "0.5"}</priority>
  </url>`
).join("\n")}
</urlset>
`;
writeFileSync(join(DIST, "sitemap.xml"), sitemap);
console.log("seo: wrote sitemap.xml");
