const DATA = {
  "report-1": `SELECT id, name, type, balance, active, donotmail, donotservice, createdon, modifiedon FROM copy_connection.crm.customers ORDER BY balance DESC LIMIT 20`,
  "technician-revenue": `SELECT 
  json_extract_scalar(employeeinfo, '$.id') AS technician_id,
  json_extract_scalar(employeeinfo, '$.name') AS technician_name,
  SUM(TRY_CAST(total AS decimal(15,3))) AS total_revenue
FROM copy_connection.accounting.invoices
WHERE active = true
  AND employeeinfo IS NOT NULL
  AND json_extract_scalar(employeeinfo, '$.name') IS NOT NULL
GROUP BY 1, 2
ORDER BY total_revenue DESC
LIMIT 20`
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  const q = req.query && req.query.report;
  const report = Array.isArray(q) ? q[0] : q;
  const SQL = report && Object.prototype.hasOwnProperty.call(DATA, report) ? DATA[report] : null;
  if (!SQL) { res.status(404).json({ rows: [] }); return; }
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
