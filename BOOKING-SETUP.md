# Direct booking setup — Vail Breeze Properties

## Working now: booking requests

Each property page has a **Request to book** form. Guests choose check-in and checkout dates, the number of guests and their contact details, then send. The request is emailed to vailbreezeproperties@gmail.com through FormSubmit (formsubmit.co), a free form-forwarding service. Kirk replies with availability, the total price and payment instructions. Nothing is charged online, and the dates aren't held until Kirk confirms them.

**One-time step:** the first request sent from the live site triggers an email from FormSubmit to vailbreezeproperties@gmail.com. Kirk must click **Activate** in that email, or requests won't be delivered. Send yourself a test request first.

Limitations until a booking system is connected: no live calendar, so a request can be made for dates already booked on Airbnb; no automatic pricing; and no online payment.

Direct booking needs a booking system (a property management system, or PMS) that is officially connected to Airbnb and Vrbo. The website cannot read live availability or take payments from an Airbnb listing link by itself. Airbnb shares calendars, rates and reservations only with approved software partners.

## Recommendation: OwnerRez

| | OwnerRez | Lodgify | Hostaway | Guesty |
|---|---|---|---|---|
| Fit for 7 homes run by the owner | Strong | Strong | Built for larger teams | Guesty Pro is built for larger teams; Guesty Lite is limited |
| Official Airbnb connection (calendar, rates, bookings, listing content) | Yes | Yes | Yes | Yes |
| Vrbo / Booking.com | Yes | Yes | Yes | Yes |
| Booking widget you can put on this website | Yes | Yes (best inside its own site builder) | Yes | Yes |
| Card payments, security deposits, rental agreements | Yes (Stripe and others) | Yes | Yes | Yes |
| Seasonal, weekend, holiday and last-minute pricing | Yes, with PriceLabs/Beyond if wanted | Yes | Yes | Yes |
| Owner statements for management clients | Yes | Limited | Yes | Yes |
| Pricing model | Monthly fee per property, no booking commission | Monthly plan | Quote | Quote |

OwnerRez fits best. It handles both of Vail Breeze's jobs: renting its own homes and managing homes for other owners, with owner statements. It charges no commission on direct bookings, and its booking widgets can be added to this website without rebuilding it. Lodgify is a good second choice. Check each vendor's current pricing before signing up.

## What Kirk needs to do (about an hour)

1. Create the account at ownerrez.com and connect the Airbnb host account through **Channels → Airbnb**. The import brings in each listing's photos, description, amenities, rules, fees and calendar. This is the authorized way to get the full original photo sets.
2. Connect a payment processor (Stripe is simplest) and set up the security deposit and rental agreement.
3. Check rates, cleaning fees, taxes, minimum nights and cancellation policy for each property.
4. Add the two Facebook Marketplace properties by hand, with their original photos.
5. In **Settings → Widgets**, create a booking widget for each property and send the widget code (or the property's hosted booking page link) to the developer.
6. Export or send the original photos for each property. The full sets are also available inside OwnerRez after the Airbnb import.

## What happens on the website once that's done

- Each `stay-*.html` page swaps the "Check availability on Airbnb" panel for a **Book direct** panel. It shows the live calendar, the full price with fees and taxes, and secure checkout.
- The booking system holds one calendar across Airbnb, Vrbo and direct bookings. It checks availability again at checkout to prevent double bookings. Airbnb syncs through the API within minutes, not seconds. The panel tells guests this.
- Kirk changes prices, blocks dates and manages reservations in OwnerRez. No website code is involved.
- The site's security policy will be updated to allow only the booking provider's domains.

To switch a property on, set `directBooking` in `data/properties.json`, then run `python3 tools/build_properties.py`. If the provider's widget needs its own script rather than a booking-page link, the developer adds it at that point.

## Not yet verifiable (needs the connected system)

Availability sync, pricing rules, completing a direct booking and double-booking prevention can only be tested once the booking system is connected. They are **not** working yet.
