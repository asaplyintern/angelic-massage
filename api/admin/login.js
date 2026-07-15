const crypto = require("crypto");
const { makeSession } = require("../_lib/config");
const { methodNotAllowed, readBody, sendJson } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    methodNotAllowed(res);
    return;
  }

  let payload;
  try {
    payload = await readBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const password = process.env.ADMIN_PASSWORD || "admin123";
  const entered = String(payload.password || "");
  const ok =
    entered.length === password.length &&
    crypto.timingSafeEqual(Buffer.from(entered), Buffer.from(password));

  if (!ok) {
    sendJson(res, 403, { error: "Incorrect password" });
    return;
  }

  const secureCookie = process.env.VERCEL ? "; Secure" : "";
  sendJson(
    res,
    200,
    { ok: true },
    {
      "Set-Cookie": `angelic_admin=${makeSession()}; Path=/; HttpOnly${secureCookie}; SameSite=Lax; Max-Age=86400`,
    }
  );
};
