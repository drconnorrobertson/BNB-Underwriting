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

## STR Investment Workspace

Open /workspace/ to compare conservative, base, and upside scenarios using your own purchase, financing, revenue, and expense assumptions. The calculator runs entirely in the browser. Save uses local browser storage; Export JSON and Print/PDF let you keep a copy. It does not call the AirROI or property APIs and does not make claims about a property’s actual performance.

## Credential handling

The client bundle must contain no API keys. Configure AIRROI_API_KEY and RAPIDAPI_KEY only as server-side Vercel environment variables for the existing API proxies. Rotate any keys that appeared in earlier public commits; removing them from current files cannot revoke historical copies.
