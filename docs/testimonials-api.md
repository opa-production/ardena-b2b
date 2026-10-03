# Testimonials API

Businesses on Ardena for Business submit a short testimonial about the
dashboard. Ardena staff approve it, and the approved testimonials then show on
the public landing page.

The landing page section is already built (`src/components/Testimonials.jsx`)
and reads `GET /public/testimonials`. **It shows nothing at all, not even its
heading, until that endpoint returns at least one testimonial.** If the
endpoint is missing, returns an error or returns an empty list, the section
stays hidden. So the backend can ship these endpoints in any order without
the landing page showing an empty or broken section.

Base path: `/api/v1/b2b` (same as every other B2B endpoint). Errors follow the
usual FastAPI shape: `{ "detail": "..." }`.

---

## How a testimonial moves through the system

```
business submits  →  pending  →  Ardena approves  →  approved  →  on landing page
                              ↘  Ardena rejects   →  rejected  (never shown)
```

- Only `approved` testimonials are ever returned publicly.
- If a business edits an approved testimonial, it goes back to `pending` and
  leaves the landing page until it is approved again. Wording on the public
  site must always be wording someone at Ardena has read.
- A business can hide its own testimonial at any time (`DELETE`), and it is
  off the landing page at once.

---

## Data model

Table `b2b_testimonials`

| column           | type          | notes                                                                    |
| ---------------- | ------------- | ------------------------------------------------------------------------ |
| `id`             | uuid, pk      |                                                                          |
| `business_id`    | fk → business | one active testimonial per business (see below)                          |
| `submitted_by`   | fk → user     | the staff member who wrote it                                            |
| `name`           | varchar(80)   | person quoted, e.g. "Wanjiru Kamau"                                      |
| `title`          | varchar(80)   | their role, e.g. "Operations Manager"; optional                          |
| `business_name`  | varchar(120)  | defaults to the business's registered/trading name at submit time       |
| `quote`          | text          | 40 to 320 characters after trimming                                      |
| `highlight`      | varchar(32)   | optional short result, e.g. "+22% utilisation"; set by Ardena on approval |
| `avatar_url`     | text          | optional; see **Avatars**                                                |
| `status`         | enum          | `pending` / `approved` / `rejected` / `withdrawn`                        |
| `rejection_note` | text          | optional, shown to the business when rejected                            |
| `consent_at`     | timestamptz   | when the submitter ticked "Ardena may publish this"; required            |
| `approved_at`    | timestamptz   | set on approval; drives public ordering                                  |
| `approved_by`    | fk → user     | Ardena admin                                                             |
| `sort_weight`    | int, def 0    | lets Ardena pin favourites; higher shows first                           |
| `created_at`     | timestamptz   |                                                                          |
| `updated_at`     | timestamptz   |                                                                          |

**One per business:** a business has at most one testimonial whose status is
`pending` or `approved`. Submitting again replaces it (same row, back to
`pending`). Use a partial unique index on `business_id WHERE status IN
('pending','approved')`.

---

## 1. Public: list approved testimonials (the landing page reads this)

`GET /public/testimonials`

No auth. Read only. Safe to cache at the edge.

Query params (optional):

| param   | default | notes      |
| ------- | ------- | ---------- |
| `limit` | 20      | max 50     |

Response `200`:

```json
{
  "items": [
    {
      "id": "6f1c…",
      "name": "Wanjiru Kamau",
      "title": "Operations Manager",
      "business_name": "Savanna Wheels Rentals",
      "avatar_url": "https://cdn.ardena.xyz/testimonials/6f1c….jpg",
      "quote": "We used to juggle three spreadsheets and a WhatsApp group…",
      "highlight": "3 tools replaced"
    }
  ]
}
```

Rules:

- Only `status = 'approved'`, and only for businesses that are still active
  and verified. A suspended or closed business disappears from the page.
- Order: `sort_weight DESC, approved_at DESC`.
- Return **exactly** the fields above. Never expose `business_id`, emails,
  phone numbers, user ids, status or moderation notes on this public route.
- `title`, `avatar_url` and `highlight` may be `null`. The frontend handles
  that: it shows initials when there is no avatar, and leaves out the role
  line or the tag when they are missing.
- With nothing approved, return `{ "items": [] }` with status `200`, not a
  `404`. The frontend hides the section either way, but `200` keeps
  monitoring quiet.
- Send `Cache-Control: public, max-age=300`. The frontend also caches the
  response for 5 minutes.

The frontend also accepts a bare array (`[ … ]`), but please return the
`{ items }` object.

---

## 2. Business dashboard: submit / view / withdraw

All need the normal Bearer auth. Who may submit is up to us; the suggestion is
the **owner and admin** roles only.

### `GET /testimonial`

The calling business's current testimonial, or `204` if there is none.

```json
{
  "id": "6f1c…",
  "name": "Wanjiru Kamau",
  "title": "Operations Manager",
  "business_name": "Savanna Wheels Rentals",
  "quote": "…",
  "avatar_url": null,
  "status": "pending",
  "rejection_note": null,
  "created_at": "2026-10-03T09:12:00Z",
  "updated_at": "2026-10-03T09:12:00Z"
}
```

### `PUT /testimonial`

Creates the testimonial, or replaces the existing one. Either way the status
is (re)set to `pending`.

Request:

```json
{
  "name": "Wanjiru Kamau",
  "title": "Operations Manager",
  "quote": "We used to juggle three spreadsheets…",
  "consent": true
}
```

Validation (respond `422` with field-level detail):

- `name` required, 2 to 80 characters
- `title` optional, up to 80 characters
- `quote` required, 40 to 320 characters after trimming; strip HTML, collapse
  whitespace
- `consent` must be `true`; store the time as `consent_at`
- `business_name` is **not** accepted from the client; copy it from the
  business record
- Rate limit: 5 submissions per business per day

Response `200`: the same shape as `GET /testimonial`.

On submit, notify Ardena staff (the admin queue or a Slack hook) so pending
testimonials don't sit unseen.

### `POST /testimonial/avatar`

`multipart/form-data`, field `file`. JPEG/PNG/WebP, up to 2 MB. Crop to a
square, resize to 192×192, re-encode as JPEG/WebP and strip EXIF. Store on our
CDN and set `avatar_url`. Like any other edit, this sends an approved
testimonial back to `pending`.

### `DELETE /testimonial`

Sets the status to `withdrawn`. The testimonial is off the landing page
straight away. Returns `204`.

---

## 3. Ardena admin: moderate

These sit behind Ardena staff auth, not tenant auth. They can live in the
existing admin app instead of the B2B router.

| method & path                              | does                                                        |
| ------------------------------------------ | ----------------------------------------------------------- |
| `GET  /admin/testimonials?status=pending`  | review queue, oldest first                                  |
| `POST /admin/testimonials/{id}/approve`    | body `{ highlight?, sort_weight? }`; sets `approved_at/by`  |
| `POST /admin/testimonials/{id}/reject`     | body `{ note }`; the business sees the note                 |
| `PATCH /admin/testimonials/{id}`           | fix typos, `highlight` or `sort_weight` without re-review   |

Ardena owns `highlight`, because it is a claim we publish. Only set one the
business can back up (for example a figure from their own dashboard data).

Email the submitter on approve and on reject.

---

## Avatars

- Serve only from our own CDN. Never hot-link a URL the client supplies.
- The public payload returns the CDN URL only.
- When a testimonial is rejected or withdrawn, the avatar file can be deleted
  after 30 days.

---

## Privacy

- `consent_at` is what allows us to publish the testimonial. No consent, no
  row.
- The public route shows only the person's name, title, business name, photo
  and quote. Nothing else about the business or the person.
- If a business asks to be removed (GDPR / Kenya Data Protection Act),
  withdraw the testimonial and delete the avatar.

---

## Frontend checklist (already done unless marked)

- [x] `fetchPublicTestimonials()` in `src/lib/api.js` calls `GET /public/testimonials`
- [x] Landing page section hides itself while loading, when the list is empty and when the request fails
- [x] Cards handle a null `avatar_url` (initials), `title` or `highlight`
- [x] Fewer than 5 testimonials show as a still grid; 5 or more scroll in one moving row
- [ ] Dashboard form for `GET/PUT/DELETE /testimonial` (Settings → "Share your experience"), to build once the endpoints exist
