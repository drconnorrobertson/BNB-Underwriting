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

## Credential handling and deployment

The client bundle contains no API keys. Configure `AIRROI_API_KEY` and `RAPIDAPI_KEY` as server-side Vercel environment variables. Configure a random `CRON_SECRET` (at least 16 characters) for the scheduled refresh route. Set them for each deployment environment that needs the API, then redeploy; existing deployments do not pick up new values.

Rotate the AirROI and RapidAPI keys that appeared in public commits. Removing literals from the current branch does not revoke historical copies. Check and retire old Vercel deployment URLs that still contain those credentials.

The same-origin API routes call paid upstream services and do not authenticate visitors. Before enabling either key on a public deployment, protect the deployment or add authenticated access and rate limits to these routes. Wildcard CORS headers were removed, but CORS does not prevent direct requests.
