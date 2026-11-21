# BNB Underwriting

The manual `/workspace/` compares three input-based STR scenarios, saves in the browser, exports JSON and prints reports. No paid API calls are made there.

Live paid data endpoints return HTTP 503 while compromised historical credentials are rotated and authenticated, rate-limited access is implemented. No credential values belong in client or server source. Old Git history and deployment URLs may still contain compromised values; provider-side rotation is required. Scheduled paid refresh is disabled. Existing browser-saved pipeline data remains available.

Build: `node scripts/prepare-static.mjs && node scripts/brand-check.mjs dist`.
