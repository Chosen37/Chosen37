#!/usr/bin/env python3
"""Build property detail pages and refresh listing data.

Source of truth: data/properties.json
Outputs:
  site-data.js                 runtime data for the planner and filters
  stay-<id>.html               one detail page per property
  stays.html, index.html       card photo/title now open the detail page
  sitemap.xml                  detail pages added
  PROPERTY-COMPLETENESS.md     what is verified and what still needs owner input

Run from the repository root:  python3 tools/build_properties.py
Fields left null are not shown on the site; they are listed in the report.
"""
import html
import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://vailbreezeproperties.com"
DATA = json.loads((ROOT / "data/properties.json").read_text())
PROPS = DATA["properties"]
E = html.escape

LABELS = {
    "fullDescription": "Full description", "neighborhood": "Neighborhood",
    "sleepingArrangements": "Sleeping arrangements", "amenitiesComplete": "Complete amenities",
    "kitchen": "Kitchen & appliances", "wifi": "Wi-Fi", "parking": "Parking", "laundry": "Laundry",
    "outdoor": "Outdoor space", "views": "Views", "accessibility": "Accessibility",
    "checkIn": "Check-in", "checkOut": "Checkout", "houseRules": "House rules", "pets": "Pets",
    "smoking": "Smoking", "cleaningFee": "Cleaning fee", "securityDeposit": "Security deposit",
    "minimumNights": "Minimum nights", "cancellationPolicy": "Cancellation policy",
    "taxesAndFees": "Taxes & fees", "nightlyPricing": "Nightly pricing",
}
HOME_FIELDS = ["sleepingArrangements", "kitchen", "wifi", "parking", "laundry", "outdoor", "views", "accessibility"]
POLICY_FIELDS = ["checkIn", "checkOut", "houseRules", "pets", "smoking", "minimumNights",
                 "cancellationPolicy", "cleaningFee", "securityDeposit", "taxesAndFees", "nightlyPricing"]

ICON = {
    "pin": '<svg class="icon icon-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    "people": '<svg class="icon icon-people" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3H3Zm13-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3h-3"/></svg>',
    "bed": '<svg class="icon icon-bed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v3m18-3v3M3 12V5h18v7M1 18v-5a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v5H1Z"/><path d="M6 11V8h5v3m2 0V8h5v3"/></svg>',
    "bath": '<svg class="icon icon-bath" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-3Zm3 0V5a2 2 0 0 1 4 0M7 20l-1 2m11-2 1 2"/></svg>',
    "check": '<svg class="icon icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 12 5 5L20 6"/></svg>',
    "external": '<svg class="icon icon-external" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7m0-7L10 14M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/></svg>',
}


def plural(n, word):
    n_txt = f"{n:g}"
    return f"{n_txt} {word}{'' if n == 1 else 's'}"


def value_html(v):
    if isinstance(v, list):
        return "<ul class=\"detail-list\">" + "".join(f"<li>{ICON['check']}<span>{E(str(x))}</span></li>" for x in v) + "</ul>"
    return E(str(v))


# ---------- 1. runtime data ----------
runtime = {k: v for k, v in DATA.items() if not k.startswith("_")}
(ROOT / "site-data.js").write_text("window.VAIL_BREEZE = " + json.dumps(runtime, indent=2, ensure_ascii=False) + ";\n")

# ---------- 2. listing cards open the detail page ----------
def relink_cards(path):
    t = path.read_text()
    for p in PROPS:
        name, page = p["name"], p["page"]
        art = re.search(rf'<article class="property-card" id="{re.escape(p["id"])}".*?</article>', t, re.S)
        if not art:
            continue
        a = art.group(0)
        b = re.sub(r'<a class="property-photo" href="[^"]*"[^>]*>',
                   f'<a class="property-photo" href="{page}" aria-label="Photos and details for {E(name)}">', a, count=1)
        b = re.sub(rf'<h3>(?:<a class="card-title-link" href="[^"]*">)?{re.escape(E(name, quote=False))}(?:</a>)?</h3>',
                   f'<h3><a class="card-title-link" href="{page}">{E(name, quote=False)}</a></h3>', b, count=1)
        t = t.replace(a, b)
    path.write_text(t)


for f in ("stays.html", "index.html"):
    relink_cards(ROOT / f)

# ---------- 3. detail pages ----------
shell = (ROOT / "stays.html").read_text()
head, rest = shell.split("<main", 1)
foot = rest.split("</main>", 1)[1]
stays_main = rest.split("</main>", 1)[0]
cards = {p["id"]: m.group(0) for p in PROPS
         for m in [re.search(rf'<article class="property-card" id="{re.escape(p["id"])}".*?</article>', stays_main, re.S)] if m}


def page_head(p):
    h = head
    title = f"{p['name']} · {p['location']} | Vail Breeze Properties"
    desc = f"{p['name']}: {p['type'].lower()} in {p['location'].replace(' · ', ', ')} for up to {p['guests']} guests. {p['description']}"
    url = f"{SITE}/{p['page']}"
    img = f"{SITE}/{p['photos'][0]['src']}"
    h = re.sub(r"<title>.*?</title>", f"<title>{E(title)}</title>", h, count=1)
    for attr in ('name="description"', 'property="og:description"'):
        h = re.sub(rf'(<meta {attr} content=")[^"]*', lambda m: m.group(1) + E(desc), h, count=1)
    h = re.sub(r'(<meta property="og:title" content=")[^"]*', lambda m: m.group(1) + E(title), h, count=1)
    h = re.sub(r'(<link rel="canonical" href=")[^"]*', lambda m: m.group(1) + url, h, count=1)
    h = re.sub(r'(<meta property="og:url" content=")[^"]*', lambda m: m.group(1) + url, h, count=1)
    h = re.sub(r'(<meta property="og:image" content=")[^"]*', lambda m: m.group(1) + img, h, count=1)
    h = re.sub(r'(<meta property="og:image:alt" content=")[^"]*', lambda m: m.group(1) + E(p['photos'][0]['alt']), h, count=1)
    h = re.sub(r'(<meta property="og:image:width" content=")[^"]*', lambda m: m.group(1) + str(p['photos'][0]['width']), h, count=1)
    h = re.sub(r'(<meta property="og:image:height" content=")[^"]*', lambda m: m.group(1) + str(p['photos'][0]['height']), h, count=1)
    if "property.css" not in h:
        h = h.replace('<link rel="stylesheet" href="legal.css">', '<link rel="stylesheet" href="legal.css"><link rel="stylesheet" href="property.css">')
        h = h.replace('<script src="app.js" defer></script>', '<script src="app.js" defer></script><script src="gallery.js" defer></script>')
    if p.get("directBooking"):
        origin = "{u.scheme}://{u.netloc}".format(u=urlparse(p["directBooking"]["bookingUrl"]))
        h = h.replace("object-src 'none';", f"object-src 'none'; frame-src {origin};")
    h = re.sub(r'<body class="[^"]*"', '<body class="page-property"', h, count=1)
    return h


def gallery_html(p):
    ph = p["photos"]
    def link(i, cls):
        x = ph[i]
        sizes = "(max-width: 900px) 100vw, 66vw" if cls == "g-main" else "(max-width: 900px) 50vw, 33vw"
        load = 'fetchpriority="high"' if i == 0 else 'loading="lazy"'
        return (f'<a class="{cls}" href="{x["src"]}" data-photo data-alt="{E(x["alt"])}" data-w="{x["width"]}" data-h="{x["height"]}" '
                f'aria-label="Open photo {i + 1} of {len(ph)} full screen">'
                f'<img src="{x["src"]}" srcset="{x["src640"]} 640w, {x["src"]} {x["width"]}w" sizes="{sizes}" '
                f'alt="{E(x["alt"])}" width="{x["width"]}" height="{x["height"]}" {load} decoding="async"></a>')
    side = "".join(link(i, "g-thumb") for i in range(1, min(len(ph), 3)))
    cls = "gallery" + (" single" if len(ph) == 1 else "")
    out = f'<div class="{cls}" data-gallery>{link(0, "g-main")}'
    if side:
        out += f'<div class="g-side">{side}</div>'
    out += f'<button type="button" class="gallery-all" data-gallery-all hidden>View {plural(len(ph), "photo")}</button></div>'
    # Hidden links keep photos beyond the first three in the viewer sequence.
    extra = "".join(
        f'<a href="{x["src"]}" data-photo data-alt="{E(x["alt"])}" data-w="{x["width"]}" data-h="{x["height"]}" hidden></a>'
        for x in ph[3:])
    out = out.replace("</div>", extra + "</div>", 1) if extra else out
    return out


def viewer_html(p):
    thumbs = "".join(
        f'<button type="button" data-viewer-thumb aria-label="Show photo {i + 1}"><img src="{x["src640"]}" alt="" decoding="async"></button>'
        for i, x in enumerate(p["photos"]))
    return (f'<dialog class="photo-viewer" id="photo-viewer" aria-label="{E(p["name"])} photos">'
            f'<div class="viewer-bar"><p><strong>{E(p["name"])}</strong><span class="viewer-count" data-viewer-count></span></p>'
            f'<button type="button" class="viewer-close" data-viewer-close data-close aria-label="Close photos">×</button></div>'
            f'<div class="viewer-stage" data-viewer-stage><button type="button" class="viewer-nav viewer-prev" data-viewer-prev aria-label="Previous photo">‹</button>'
            f'<img data-viewer-img src="" alt=""><button type="button" class="viewer-nav viewer-next" data-viewer-next aria-label="Next photo">›</button></div>'
            f'<div class="viewer-thumbs">{thumbs if len(p["photos"]) > 1 else ""}</div></dialog>')


def booking_panel(p):
    contact = ('<div class="contact-lines"><a href="tel:+17208282021">(720) 828-2021</a>'
               '<a href="mailto:vailbreezeproperties@gmail.com">vailbreezeproperties@gmail.com</a></div>')
    plan = f'<button type="button" class="plan-link" data-inquire data-reference="{p["id"]}">Add to a stay plan</button>'
    db = p.get("directBooking")
    if db:
        return (f'<aside class="booking-panel booking-direct" aria-labelledby="book-title"><h2 id="book-title">Book direct</h2>'
                f'<p>Choose your dates to see live availability and your full price, including cleaning fees and taxes. '
                f'Secure checkout is provided by {E(db["provider"])}.</p>'
                f'<iframe class="booking-frame" src="{E(db["bookingUrl"])}" title="Book {E(p["name"])} direct" loading="lazy"></iframe>'
                f'<p class="sync-note">Availability syncs with our other booking channels through {E(db["provider"])}. '
                f'Your dates are confirmed only after checkout completes.</p>{contact}{plan}</aside>')
    return (f'<aside class="booking-panel" aria-labelledby="book-title"><h2 id="book-title">Check dates &amp; book</h2>'
            f'<p>See live availability, nightly rates, fees, and house rules for your dates on Airbnb, where you can book securely.</p>'
            f'<a class="button button-gold" href="{p["url"]}" target="_blank" rel="noopener noreferrer">Check availability on Airbnb {ICON["external"]}</a>'
            f'<p>Questions before you book? We are happy to help.</p>{contact}{plan}</aside>')


def detail_page(p, others):
    d = p["details"]
    facts = (f'<p class="property-facts"><span>{ICON["people"]} {plural(p["guests"], "guest")}</span>'
             f'<span>{ICON["bed"]} {plural(p["bedrooms"], "bedroom")}</span>'
             f'<span>{ICON["bed"]} {plural(p["beds"], "bed")}</span>'
             f'<span>{ICON["bath"]} {plural(p["baths"], "bath")}</span></p>')
    about = f'<p class="lead">{E(p["description"])}</p>'
    if d.get("fullDescription"):
        about += "".join(f"<p>{E(x)}</p>" for x in str(d["fullDescription"]).split("\n\n"))
    if d.get("neighborhood"):
        about += f'<p>{E(d["neighborhood"])}</p>'
    body = f'<section aria-labelledby="about-title"><h2 id="about-title">About this home</h2>{about}</section>'
    body += ('<section aria-labelledby="glance-title"><h2 id="glance-title">At a glance</h2><dl class="fact-grid">'
             f'<div><dt>Guests</dt><dd>{p["guests"]}</dd></div><div><dt>Bedrooms</dt><dd>{p["bedrooms"]}</dd></div>'
             f'<div><dt>Beds</dt><dd>{p["beds"]}</dd></div><div><dt>Baths</dt><dd>{p["baths"]:g}</dd></div></dl></section>')
    amen = d.get("amenitiesComplete") or p["amenities"]
    amen_title = "Amenities" if d.get("amenitiesComplete") else "Highlights"
    body += f'<section aria-labelledby="amen-title"><h2 id="amen-title">{amen_title}</h2>{value_html(amen)}</section>'
    home_rows = [(LABELS[k], d[k]) for k in HOME_FIELDS if d.get(k)]
    if home_rows:
        body += ('<section aria-labelledby="home-title"><h2 id="home-title">The home</h2><dl class="policy-list">'
                 + "".join(f"<div><dt>{E(k)}</dt><dd>{value_html(v)}</dd></div>" for k, v in home_rows) + "</dl></section>")
    pol_rows = [(LABELS[k], d[k]) for k in POLICY_FIELDS if d.get(k)]
    pol = ""
    if pol_rows:
        pol = '<dl class="policy-list">' + "".join(f"<div><dt>{E(k)}</dt><dd>{value_html(v)}</dd></div>" for k, v in pol_rows) + "</dl>"
    missing_policy = [k for k in POLICY_FIELDS if not d.get(k)]
    if missing_policy:
        where = "at checkout" if p.get("directBooking") else "on the Airbnb listing for your dates"
        pol += (f'<p class="source-note">Current rates, cleaning fees, taxes, minimum stay, cancellation policy, and house rules are shown {where} before you pay.</p>')
    body += f'<section aria-labelledby="policy-title"><h2 id="policy-title">Rates, rules &amp; policies</h2>{pol}'
    if p.get("registration"):
        body += f'<p class="registration-line">Short-term rental registration: {E(p["registration"])}</p>'
    body += "</section>"
    other_cards = "".join(cards[o["id"]] for o in others if o["id"] in cards)
    main = (f'<main id="main" tabindex="-1"><article class="property-page wrap" aria-labelledby="property-title">'
            f'<nav class="crumbs" aria-label="Breadcrumb"><a href="stays.html">Furnished stays</a><span aria-hidden="true">/</span><span aria-current="page">{E(p["name"])}</span></nav>'
            f'<header class="property-head"><div><span class="eyebrow">{ICON["pin"]} {E(p["location"])} · {E(p["type"])}</span>'
            f'<h1 id="property-title">{E(p["name"])}</h1></div>{facts}</header>'
            f'{gallery_html(p)}'
            f'<div class="property-layout"><div class="property-body">{body}</div>{booking_panel(p)}</div>'
            f'</article>'
            f'<section class="other-stays wrap section" aria-labelledby="other-title"><h2 id="other-title">More places to feel <em>at home</em></h2>'
            f'<div class="property-grid">{other_cards}</div></section>'
            f'{viewer_html(p)}</main>')
    return page_head(p) + main + foot


for i, p in enumerate(PROPS):
    others = [PROPS[(i + k) % len(PROPS)] for k in range(1, min(4, len(PROPS)))]
    (ROOT / p["page"]).write_text(detail_page(p, others))

# ---------- 4. sitemap ----------
sm = (ROOT / "sitemap.xml").read_text()
for p in PROPS:
    loc = f"<url><loc>{SITE}/{p['page']}</loc></url>"
    if loc not in sm:
        sm = sm.replace("</urlset>", loc + "</urlset>")
(ROOT / "sitemap.xml").write_text(sm)

# ---------- 5. completeness report ----------
lines = ["# Property completeness report", "",
         "Generated by `tools/build_properties.py` from `data/properties.json`. "
         "✅ = verified and published · ⏳ = still needs owner input (hidden on the site until supplied).", ""]
core = ["name", "location", "type", "guests", "bedrooms", "beds", "baths", "description", "registration"]
for p in PROPS:
    d = p["details"]
    lines += [f"## {p['name']}", "", f"- Source: {p['source']['platform']} — {p['source']['url']}",
              f"- Page: `{p['page']}`",
              f"- Photos: {len(p['photos'])} published — {'complete set ✅' if p.get('photosComplete') else 'full original set still needed ⏳'}",
              f"- Direct booking: {'connected via ' + p['directBooking']['provider'] + ' ✅' if p.get('directBooking') else 'not connected ⏳ (guests are sent to Airbnb)'}",
              "", "| Field | Status |", "|---|---|"]
    lines += [f"| {k} | {'✅ ' + E(str(p.get(k))) if p.get(k) not in (None, '') else '⏳'} |" for k in core]
    lines += [f"| {LABELS[k]} | {'✅' if d.get(k) else '⏳'} |" for k in LABELS]
    lines.append("")
lines += ["## Not yet on the site", ""]
for s in DATA.get("pendingSources", []):
    lines.append(f"- {s['platform']}: {s['url']} — {s['status']}")
(ROOT / "PROPERTY-COMPLETENESS.md").write_text("\n".join(lines) + "\n")
print(f"Built {len(PROPS)} property pages.")
