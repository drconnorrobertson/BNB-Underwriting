# BNB Underwriting — STR Income Analyzer

Good / Better / Best income projections for short-term rental properties, powered by the AirROI API.

## What It Does

Enter a property address and bedroom/bathroom count. The tool runs 6 AirROI API calls and returns:

- **Good / Better / Best** annual revenue, occupancy, ADR, and monthly income
- **Market context** — occupancy, ADR, RevPAR, active listing count
- **15 comparable properties** with TTM performance data

## Amenity Tiers

- **Good** — WiFi, kitchen, washer/dryer, A/C, parking
- **Better** — Good + hot tub, patio, fire pit, game room
- **Best** — Better + pool, EV charger, gym, sauna, beach access

## Deploy

No build step. Static HTML/JS. Connect repo to Vercel and deploy.

## API Endpoints Used

- GET /markets/lookup
- GET /calculator/estimate x3 (Good / Better / Best)
- GET /listings/comparables
- POST /markets/metrics
