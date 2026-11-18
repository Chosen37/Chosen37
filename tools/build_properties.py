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
    "accessibility": "Accessibility", "safety": "Safety & property", "houseRulesNotes": "Additional house rules",
    "checkIn": "Check-in", "checkOut": "Checkout", "houseRules": "House rules", "pets": "Pets",
    "smoking": "Smoking", "cleaningFee": "Cleaning fee", "securityDeposit": "Security deposit",
    "minimumNights": "Minimum nights", "cancellationPolicy": "Cancellation policy",
    "taxesAndFees": "Taxes & fees", "nightlyPricing": "Nightly pricing",
}
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


# ---------- 0. combined stylesheet ----------
import runpy
runpy.run_path(str(ROOT / "tools/build_css.py"))

# ---------- 1. runtime data ----------
runtime = {"company": DATA["company"], "plans": DATA["plans"],
           "properties": [{k: p[k] for k in ("id", "name", "location", "city", "guests", "page")} | {"url": p["page"]} for p in PROPS]}
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
        b = re.sub(r'<a class="button button-gold booking-link" href="[^"]*"[^>]*>.*?</a>',
                   f'<a class="button button-gold booking-link" href="{page}#book" aria-label="View &amp; book {E(name)}">View &amp; book</a>', b, count=1, flags=re.S)
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
    title = f"{p['name']}: Furnished Stay in {p['city']} | Vail Breeze"
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
        h = h.replace('<script src="app.js" defer></script>', '<script src="app.js" defer></script><script src="gallery.js" defer></script><script src="booking-request.js" defer></script>')
    h = h.replace("form-action 'none'", "form-action https://formsubmit.co")
    if p.get("directBooking"):
        origin = "{u.scheme}://{u.netloc}".format(u=urlparse(p["directBooking"]["bookingUrl"]))
        h = h.replace("object-src 'none';", f"object-src 'none'; frame-src {origin};")
    h = re.sub(r'<body class="[^"]*"', '<body class="page-property"', h, count=1)
    m = p["photos"][0]
    pre = f'<link rel="preload" as="image" href="{m["src640"]}" imagesrcset="{srcset(m)}" imagesizes="{MAIN_SIZES}" fetchpriority="high">'
    h = h.replace('<link rel="preload" href="assets/fonts/', pre + '<link rel="preload" href="assets/fonts/', 1)
    # Preload exactly the fonts property pages use (no medium weight).
    h = re.sub(r'<link rel="preload" href="assets/fonts/dm-sans-500-normal[^>]*>', '', h)
    h = h.replace("</head>", jsonld(p) + "</head>", 1)
    return h


def jsonld(p):
    d = p["details"]
    url = f"{SITE}/{p['page']}"
    amen = [a for g in (d.get("amenitiesComplete") or []) for a in g["items"]]
    data = [{
        "@context": "https://schema.org", "@type": "VacationRental", "@id": url + "#rental",
        "name": p["name"], "description": p["description"], "url": url,
        "image": [f"{SITE}/{x['src']}" for x in p["photos"][:8]],
        "address": {"@type": "PostalAddress", "addressLocality": p["city"], "addressRegion": "CO", "addressCountry": "US"},
        "containsPlace": {"@type": "Accommodation", "additionalType": p["type"],
                          "occupancy": {"@type": "QuantitativeValue", "maxValue": p["guests"]},
                          "numberOfBedrooms": p["bedrooms"], "numberOfBathroomsTotal": p["baths"],
                          "amenityFeature": [{"@type": "LocationFeatureSpecification", "name": a.split(" — ")[0], "value": True} for a in amen[:30]]},
        "petsAllowed": bool(d.get("pets") and d["pets"].startswith("Pets allowed")),
        "provider": {"@type": "Organization", "name": "Vail Breeze Properties", "url": SITE + "/", "telephone": "+1-720-828-2021"},
    }, {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Furnished stays", "item": f"{SITE}/stays.html"},
            {"@type": "ListItem", "position": 2, "name": p["name"], "item": url}]}]
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False).replace("</", "<\\/") + "</script>"


def srcset(x):
    s = f'{x["src640"]} 640w, '
    if x.get("src768"):
        s += f'{x["src768"]} 768w, '
    return s + f'{x["src"]} {x["width"]}w'


MAIN_SIZES = "(max-width: 900px) calc(100vw - 40px), 66vw"


def gallery_html(p):
    ph = p["photos"]
    def link(i, cls):
        x = ph[i]
        sizes = MAIN_SIZES if cls == "g-main" else "(max-width: 900px) 50vw, 33vw"
        load = 'fetchpriority="high"' if i == 0 else 'loading="lazy"'
        return (f'<a class="{cls}" href="{x["src"]}" data-photo data-alt="{E(x["alt"])}" data-w="{x["width"]}" data-h="{x["height"]}" '
                f'aria-label="Open photo {i + 1} of {len(ph)} full screen">'
                f'<img src="{x["src"]}" srcset="{srcset(x)}" sizes="{sizes}" '
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
        f'<button type="button" data-viewer-thumb aria-label="Show photo {i + 1}"><img data-src="{x["src640"]}" alt="" decoding="async"></button>'
        for i, x in enumerate(p["photos"]))
    return (f'<dialog class="photo-viewer" id="photo-viewer" aria-label="{E(p["name"])} photos">'
            f'<div class="viewer-bar"><p><strong>{E(p["name"])}</strong><span class="viewer-count" data-viewer-count></span></p>'
            f'<button type="button" class="viewer-close" data-viewer-close data-close aria-label="Close photos">×</button></div>'
            f'<div class="viewer-stage" data-viewer-stage><button type="button" class="viewer-nav viewer-prev" data-viewer-prev aria-label="Previous photo">‹</button>'
            f'<img data-viewer-img src="" alt=""><button type="button" class="viewer-nav viewer-next" data-viewer-next aria-label="Next photo">›</button></div>'
            f'<div class="viewer-thumbs">{thumbs if len(p["photos"]) > 1 else ""}</div></dialog>')


REQUEST_ENDPOINT = "https://formsubmit.co/vailbreezeproperties@gmail.com"


def booking_panel(p):
    contact = ('<div class="contact-lines"><a href="tel:+17208282021">(720) 828-2021</a>'
               '<a href="mailto:vailbreezeproperties@gmail.com">vailbreezeproperties@gmail.com</a></div>')
    db = p.get("directBooking")
    if db:
        return (f'<aside class="booking-panel booking-direct" id="book" aria-labelledby="book-title"><h2 id="book-title">Book direct</h2>'
                f'<p>Choose your dates to see live availability and your full price, including cleaning fees and taxes. '
                f'Secure checkout is provided by {E(db["provider"])}.</p>'
                f'<iframe class="booking-frame" src="{E(db["bookingUrl"])}" title="Book {E(p["name"])} direct" loading="lazy"></iframe>'
                f'<p class="sync-note">Availability syncs with our other booking channels through {E(db["provider"])}. '
                f'Your dates are confirmed only after checkout completes.</p>{contact}</aside>')
    n = E(p["name"])
    return (f'<aside class="booking-panel" id="book" aria-labelledby="book-title"><h2 id="book-title">Request to book</h2>'
            f'<p>Choose your dates and send a request directly to Vail Breeze. We reply to confirm availability and your total price.</p>'
            f'<form class="request-form" action="{REQUEST_ENDPOINT}" method="POST" data-request data-property="{n}" data-max-guests="{p["guests"]}">'
            f'<input type="hidden" name="_subject" value="Booking request: {n}">'
            f'<input type="hidden" name="_template" value="table">'
            f'<input type="hidden" name="_next" value="" data-next>'
            f'<input type="hidden" name="Property" value="{n}">'
            f'<input type="hidden" name="Nights" value="" data-nights-field>'
            f'<div class="hp-field" aria-hidden="true"><label>Leave this empty<input type="text" name="_honey" tabindex="-1" autocomplete="off"></label></div>'
            f'<div class="rq-row"><label for="rq-in-{p["id"]}">Check-in<input id="rq-in-{p["id"]}" name="Check-in" type="date" required data-checkin></label>'
            f'<label for="rq-out-{p["id"]}">Checkout<input id="rq-out-{p["id"]}" name="Checkout" type="date" required data-checkout></label></div>'
            f'<p class="rq-nights" data-nights aria-live="polite">Select dates to see your stay length.</p>'
            f'<label for="rq-guests-{p["id"]}">Guests<select id="rq-guests-{p["id"]}" name="Guests" required>'
            + "".join(f'<option value="{g}"{" selected" if g == min(2, p["guests"]) else ""}>{plural(g, "guest")}</option>' for g in range(1, p["guests"] + 1))
            + f'</select></label>'
            f'<label for="rq-name-{p["id"]}">Full name<input id="rq-name-{p["id"]}" name="Name" autocomplete="name" required maxlength="100"></label>'
            f'<label for="rq-email-{p["id"]}">Email<input id="rq-email-{p["id"]}" name="email" type="email" autocomplete="email" required maxlength="150"></label>'
            f'<label for="rq-phone-{p["id"]}"><span>Phone <span class="optional">(optional)</span></span><input id="rq-phone-{p["id"]}" name="Phone" type="tel" autocomplete="tel" maxlength="40"></label>'
            f'<label for="rq-msg-{p["id"]}"><span>Message <span class="optional">(optional)</span></span><textarea id="rq-msg-{p["id"]}" name="Message" rows="3" maxlength="2000" placeholder="Reason for your stay, arrival time, pets, or questions"></textarea></label>'
            f'<label class="rq-consent" for="rq-ok-{p["id"]}"><input id="rq-ok-{p["id"]}" type="checkbox" name="Acknowledged" value="Yes" required>'
            f'<span>I understand this is a request, not a confirmed reservation, and that no payment is taken now. See our <a href="privacy.html">Privacy Policy</a>.</span></label>'
            f'<p class="rq-error" data-request-error role="alert" hidden></p>'
            f'<button class="button button-gold" type="submit">Send booking request</button>'
            f'<button class="text-link rq-email" type="button" data-request-email>Or email this request instead</button>'
            f'</form>'
            f'<p class="sync-note">We confirm your dates, nightly rate, cleaning fee, and taxes in our reply, along with secure payment instructions. '
            f'Your stay is booked only once you accept and pay.</p>'
            f'{contact}</aside>')


def list_html(items):
    return '<ul class="detail-list">' + "".join(f"<li>{ICON['check']}<span>{E(str(x))}</span></li>" for x in items) + "</ul>"


def detail_page(p, others):
    d = p["details"]
    facts = (f'<p class="property-facts"><span>{ICON["people"]} {plural(p["guests"], "guest")}</span>'
             f'<span>{ICON["bed"]} {plural(p["bedrooms"], "bedroom")}</span>'
             f'<span>{ICON["bed"]} {plural(p["beds"], "bed")}</span>'
             f'<span>{ICON["bath"]} {plural(p["baths"], "bath")}</span></p>')
    about = f'<p class="lead">{E(p["description"])}</p>'
    for block in d.get("fullDescription") or []:
        if block.get("heading"):
            about += f'<h3>{E(block["heading"])}</h3>'
        bullets = [x for x in block["lines"] if x.startswith("•")]
        for x in block["lines"]:
            if not x.startswith("•"):
                about += f"<p>{E(x)}</p>"
        if bullets:
            about += list_html([b.lstrip("•").strip() for b in bullets])
    body = f'<section aria-labelledby="about-title"><h2 id="about-title">About this home</h2>{about}</section>'
    body += ('<section aria-labelledby="glance-title"><h2 id="glance-title">At a glance</h2><dl class="fact-grid">'
             f'<div><dt>Guests</dt><dd>{p["guests"]}</dd></div><div><dt>Bedrooms</dt><dd>{p["bedrooms"]}</dd></div>'
             f'<div><dt>Beds</dt><dd>{p["beds"]}</dd></div><div><dt>Baths</dt><dd>{p["baths"]:g}</dd></div></dl></section>')
    if d.get("sleepingArrangements"):
        body += ('<section aria-labelledby="sleep-title"><h2 id="sleep-title">Where you’ll sleep</h2><ul class="sleep-list">'
                 + "".join(f'<li>{ICON["bed"]}<strong>{E(s["room"])}</strong><span>{E(s["beds"])}</span></li>' for s in d["sleepingArrangements"])
                 + '</ul></section>')
    if d.get("amenitiesComplete"):
        groups = "".join(f'<div class="amenity-group"><h3>{E(g["group"])}</h3>{list_html(g["items"])}</div>' for g in d["amenitiesComplete"])
        body += f'<section aria-labelledby="amen-title"><h2 id="amen-title">Amenities</h2><div class="amenity-groups">{groups}</div></section>'
    else:
        body += f'<section aria-labelledby="amen-title"><h2 id="amen-title">Highlights</h2>{list_html(p["amenities"])}</section>'
    nb = d.get("neighborhood")
    if nb or d.get("locationArea"):
        loc = ""
        if nb and nb.get("name"):
            loc += f'<h3>{E(nb["name"])}</h3>'
        if nb and nb.get("summary"):
            loc += f'<p>{E(nb["summary"])}</p>'
        loc += f'<p class="source-note">{E(d.get("locationArea") or p["location"])}. The exact address is shared after your booking is confirmed.</p>'
        body += f'<section aria-labelledby="loc-title"><h2 id="loc-title">Location</h2>{loc}</section>'
    rules = ""
    if d.get("houseRules"):
        rules += list_html(d["houseRules"])
    if d.get("houseRulesNotes"):
        rules += f'<details class="rules-notes"><summary>Additional house rules</summary>' + "".join(f"<p>{E(x.strip())}</p>" for x in d["houseRulesNotes"].split("\n") if x.strip()) + "</details>"
    if d.get("safety"):
        rules += f'<h3>Safety &amp; property</h3>{list_html(d["safety"])}'
    if d.get("accessibility"):
        rules += f'<h3>Accessibility</h3>{list_html(d["accessibility"])}'
    pol_rows = [(LABELS[k], d[k]) for k in POLICY_FIELDS if d.get(k) and k not in ("houseRules", "pets", "smoking")]
    if pol_rows:
        rules += '<dl class="policy-list">' + "".join(f"<div><dt>{E(k)}</dt><dd>{value_html(v)}</dd></div>" for k, v in pol_rows) + "</dl>"
    rules += ('<p class="source-note">Check-in and checkout times, nightly rates, cleaning fee, taxes, minimum stay, and cancellation policy '
              'are confirmed in writing for your dates before you pay.</p>')
    if p.get("registration"):
        rules += f'<p class="registration-line">Short-term rental registration: {E(p["registration"])}</p>'
    body += f'<section aria-labelledby="policy-title"><h2 id="policy-title">House rules &amp; policies</h2>{rules}</section>'
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


# ---------- 3b. request confirmation page ----------
sent_head = re.sub(r"<title>.*?</title>", "<title>Request sent | Vail Breeze Properties</title>", head, count=1)
sent_head = re.sub(r'<body class="[^"]*"', '<body class="page-property"', sent_head, count=1)
sent_head = sent_head.replace('<meta name="viewport"', '<meta name="robots" content="noindex"><meta name="viewport"', 1)
sent_head = re.sub(r'<link rel="canonical" href="[^"]*">', '', sent_head, count=1)
sent_head = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m.group(1) + "Your booking request has been sent to Vail Breeze Properties.", sent_head, count=1)
sent_main = ('<main id="main" tabindex="-1"><section class="page-intro wrap request-sent"><span class="eyebrow">Booking request</span>'
             '<h1>Request sent.<br><em>Thank you.</em></h1>'
             '<p>Your request is with Vail Breeze. We will reply by email to confirm availability, your total price, and how to pay securely. '
             'Your stay is booked only once you accept and pay.</p>'
             '<p>Need an answer sooner? Call <a href="tel:+17208282021">(720) 828-2021</a>.</p>'
             '<a class="button button-gold" href="stays.html">Back to the stays</a></section></main>')
(ROOT / "request-sent.html").write_text(sent_head + sent_main + foot)

prop_head = re.sub(r"<title>.*?</title>", "<title>Proposal requested | Vail Breeze Properties</title>", sent_head, count=1)
prop_head = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m.group(1) + "Your property-management proposal request has been sent to Vail Breeze Properties.", prop_head, count=1)
prop_main = ('<main id="main" tabindex="-1"><section class="page-intro wrap request-sent"><span class="eyebrow">Property management</span>'
             '<h1>Request received.<br><em>Thank you.</em></h1>'
             '<p>Your property details are with Vail Breeze. We will review them and reply by email with a proposal: the plan we recommend, what is included, and the fee in writing.</p>'
             '<p>Want to talk sooner? Call <a href="tel:+17208282021">(720) 828-2021</a>.</p>'
             '<p><a class="button button-gold" href="management.html#management-plans">Back to the plans</a> <a class="button button-outline" href="stays.html">See our homes</a></p></section></main>')
(ROOT / "proposal-sent.html").write_text(prop_head + prop_main + foot)

nf_head = re.sub(r"<title>.*?</title>", "<title>Page not found | Vail Breeze Properties</title>", sent_head, count=1)
nf_head = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m.group(1) + "This page could not be found.", nf_head, count=1)
nf_main = ('<main id="main" tabindex="-1"><section class="page-intro wrap request-sent"><span class="eyebrow">Error 404</span>'
           '<h1>This page has moved<br><em>or never existed.</em></h1>'
           '<p>The link may be out of date. Our homes and booking options are a click away.</p>'
           '<p><a class="button button-gold" href="stays.html">See the stays</a> <a class="button button-outline" href="index.html">Go to the homepage</a></p></section></main>')
(ROOT / "404.html").write_text(nf_head + nf_main + foot)

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
              f"- Direct booking: {'connected via ' + p['directBooking']['provider'] + ' ✅' if p.get('directBooking') else 'not connected ⏳ (booking requests by email until a booking system is connected)'}",
              "", "| Field | Status |", "|---|---|"]
    lines += [f"| {k} | {'✅ ' + E(str(p.get(k))) if p.get(k) not in (None, '') else '⏳'} |" for k in core]
    lines += [f"| {LABELS[k]} | {'✅' if d.get(k) else '⏳'} |" for k in LABELS]
    lines.append("")
lines += ["## Not yet on the site", ""]
for s in DATA.get("pendingSources", []):
    lines.append(f"- {s['platform']}: {s['url']} — {s['status']}")
(ROOT / "PROPERTY-COMPLETENESS.md").write_text("\n".join(lines) + "\n")
print(f"Built {len(PROPS)} property pages.")
