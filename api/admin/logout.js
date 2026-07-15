module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }
  res.statusCode = 204;
  res.setHeader("Set-Cookie", "angelic_admin=; Path=/; Max-Age=0; SameSite=Lax");
  res.end();
};
