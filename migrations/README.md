# Shared trip data

The Pages site uses the static files in `us-westcoast-2026/` and the Pages Functions in `functions/`.
The D1 binding name is `TRAVEL_DB`. Apply `0001_shared_trip.sql` to the production database before enabling the `d1` mode in `trip-data.json`.

Shared D1 records: ledger bills and currency settings, traveler roster, ticket status, and itinerary day overrides. The pre-trip checklist stays in browser storage, scoped to the selected avatar. Poster artwork, bookings, flights, and base itinerary remain in `trip-data.json` and static assets.

The four-avatar selector is a convenience identity label, not authentication. The API permits writes carrying `x-travel-actor: Weiyang`; anyone who knows the public endpoint can forge that header. Add real server-side authentication before treating shared financial or booking data as private.

The first visit by Weiyang imports local itinerary overrides and local ledger bills only when the corresponding D1 collection is empty. The site keeps the old local browser snapshot as a backup.
