// Paid data calls are paused until credential rotation and access controls are complete.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(503).json({ error: 'Live data is temporarily unavailable. Use the manual investment workspace at /workspace/.' });
}
