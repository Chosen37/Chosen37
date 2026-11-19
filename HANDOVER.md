# Vail Breeze Properties: website handover

## What the site is
A fast static website (plain HTML, CSS and a little JavaScript), hosted free on GitHub Pages. It has no database or server to maintain.

- Repository: https://github.com/Chosen37/chosen37
- `gh-pages` branch: the published site
- `feature/property-pages` branch: the version under review, until it's approved

## How booking works today
1. A guest opens a property page, picks dates and guests, and presses **Send booking request**.
2. The request arrives at **vailbreezeproperties@gmail.com** from FormSubmit.
3. Reply with availability, the total price (nightly rate, cleaning fee, taxes, any deposit), check-in and checkout times, the cancellation policy and secure payment instructions.
4. The stay is confirmed once the guest accepts and pays.

**Before launch:** send one test request from the live site, then click **Activate** in the email FormSubmit sends to the Gmail inbox. Requests are not delivered until you do.

**Keep calendars in sync by hand** until a booking system is connected. When you confirm a direct booking, block those dates on Airbnb straight away.

## Owner proposal requests
The **Request my proposal** form on the For property owners page (`management.html#owner-inquiry`) sends the owner's property details and contact information to the same inbox, with the subject "Property management proposal request". Reply with your recommended plan, what is included, and the fee in writing.

## Airbnb calendar sync
Each home's page shows a calendar with its booked nights crossed out, and the booking form blocks requests that overlap them. Booked dates come from each listing's Airbnb calendar export link.

- **Connected so far:** Curtis Park Gem and Mountain View.
- **What is stored:** only booked date ranges, in `data/availability.json`. Guest details in Airbnb's calendar files are never saved.
- **The links are private:** each one contains a secret key, so they are never committed to the code. They live in a GitHub secret named `CALENDAR_URLS` and, when the sync is run by hand, in a git-ignored `.calendars.json` file.
- **Hourly sync:** `.github/workflows/sync-calendars.yml` refreshes the dates every hour and publishes any change.
- **Turning it on (one time):**
  1. On GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Name it `CALENDAR_URLS`. For the value, paste each listing's ID and its Airbnb export link in this format: `{"denver-skyland": "<link>", "prime-downtown": "<link>"}` (add `"executive-lodo": "<link>"` once you have it). Curtis Park Gem and Mountain View are long-term rentals: their calendars are shown as closed and are not synced
  2. Make sure the workflow file is on the `main` branch, because GitHub only runs scheduled jobs from the default branch.
  3. Go to **Actions → Sync Airbnb calendars → Run workflow** to test it once.
- **Adding the other homes:** add their links to the secret using the IDs `executive-lodo`, `prime-downtown` and `denver-skyland`.
- **One direction only:** Airbnb bookings block the website. Direct bookings do not yet block Airbnb, so block those dates on Airbnb when you confirm a stay. The direct-booking plan covers making this two-way.

## Changing listing content
All property details live in `data/properties.json`. After editing it, run:

    python3 tools/build_properties.py

That rebuilds the five property pages, the sitemap and `PROPERTY-COMPLETENESS.md`.

**Styles:** edit `styles.css`, `mockup.css`, `legal.css`, `property.css` or `fonts.css`, then run `python3 tools/build_css.py`. It combines them into the single `site.css` that every page loads, which keeps phones fast. `build_properties.py` runs it as well. Leave a field empty (`null`) rather than guessing; empty fields are hidden on the site.

Property photos are in `assets/stays/<property-id>/`, in the same order as the Airbnb listing.

## Launch checklist
- [ ] Merge `feature/property-pages` into `gh-pages`
- [ ] Turn on GitHub Pages (Settings → Pages → Branch: `gh-pages`, folder `/ (root)`)
- [ ] Buy vailbreezeproperties.com and add it under Settings → Pages → Custom domain, with HTTPS on
- [ ] Activate FormSubmit (see above)
- [ ] Add short-term rental license numbers for Prime Downtown Denver and Denver Skyland, or confirm they are rented for 30 nights or more only
- [ ] Google Search Console: verify the domain, then submit `https://vailbreezeproperties.com/sitemap.xml`
- [ ] Bing Webmaster Tools: import from Search Console
- [ ] Google Business Profile for Vail Breeze Properties, linking to the website
- [ ] Optional: an email address on the domain (for example stay@vailbreezeproperties.com). If you set one up, ask for the site to be updated.
- [ ] Optional: OwnerRez for live calendars and online payment (see `BOOKING-SETUP.md`)

## Where things are
| Need | File |
|---|---|
| Listing data | `data/properties.json` |
| Page generator | `tools/build_properties.py` |
| Booking setup and booking-system comparison | `BOOKING-SETUP.md` |
| What's verified for each property | `PROPERTY-COMPLETENESS.md` |
| Legal pages | `privacy.html`, `terms.html`, `cookies.html`, `security.html`, `accessibility.html`, `fair-housing.html` |
