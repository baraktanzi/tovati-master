# Mood Travel AI V16

Couples-only light interface, approved logo and responsive photo tiles.

This release adds a source-linked experience catalog with 20 experiences/places, 18 gift offers, 13 hotel places and 28 original date ideas. Ideas are inspiration, not supplier inventory. Catalog entries preserve source URLs, checked dates, price conditions and distinctions between individual, pair and group prices.

## Build
The existing root build still builds TOVATI unchanged. Only `mood-travel-ai/build-v8.mjs` is replaced. It reuses existing approved picture assets and `logo-v9-*.txt`, concatenates `content-v16-1.b64` through `content-v16-6.b64`, decodes base64 and Brotli-decompresses a JSON object with template, CSS and JavaScript. The SHA-256 of the decoded payload is checked before parsing. No eval is used.

Decoded payload SHA-256: `a19056cc6143266139a58fc9a61ba73404d0288deb80628904861d99e0ab3082`.
Release HTML SHA-256: `3352b1c533386b6c8ab8a6e32aad40828d15731504176acad762ef5074b800c1`.

Build output: `/mood-travel-ai/index.html` and `/mood-travel-ai/version.json`.
To inspect readable source, decode the payload with Node built-ins and save the three strings; the distributed source archive also has readable source, catalog data, source links and the test suite.

## Data boundaries
- Existing Supabase event feed retains its existing daily updater.
- Newly curated catalogs are a manual source snapshot checked 2026-09-25; they are not automatically refreshed daily.
- No ticket, room, price or time-slot availability is guaranteed. Where unknown, prices remain unknown. Group minimums and weekday conditions remain visible.
- Atmospheric images are labeled; failed supplier images do not replace the safe image.
- Saved items, plans and idea checklists remain browser-local; no account synchronization or automatic purchase.

## Validation
37 local browser checks passed using representative feed fixtures and the actual curated catalogs, across widths 320/360/393/430/768/1280. Checks cover filters, prices, bookmarks, supplier links, date validation, plan anchoring, offline catalog browsing, JavaScript errors and horizontal overflow. Live deployment is separately verified after publishing.
