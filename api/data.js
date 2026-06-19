const SQL = `SELECT
    CAST(JSON_EXTRACT_SCALAR(customer, '$.id') AS BIGINT) AS customer_id,
    JSON_EXTRACT_SCALAR(customer, '$.name') AS customer_name,
    SUM(CAST(total AS DECIMAL(15,3))) AS total_revenue
FROM copy_connection.accounting.invoices
WHERE active = true
    AND total IS NOT NULL
    AND customer IS NOT NULL
GROUP BY 1, 2
ORDER BY total_revenue DESC
LIMIT 20`;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  const base = (process.env.PEAKA_PARTNER_API_BASE_URL || "").replace(/\/$/, "");
  const url = base + "/data/projects/" + process.env.PEAKA_PROJECT_ID + "/queries/execute?format=SIMPLE";
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.PEAKA_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ statement: SQL }),
    });
    const payload = await r.json();
    const raw = Array.isArray(payload) ? payload : (payload.data || payload.rows || []);
    res.status(r.ok ? 200 : r.status).json({ rows: raw });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
