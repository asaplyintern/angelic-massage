const { methodNotAllowed, readBody, requireAdmin, sendJson } = require("../_lib/http");
const { getSiteContent, saveSiteContent } = require("../_lib/siteContent");

module.exports = async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    methodNotAllowed(res);
    return;
  }
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    const content = await getSiteContent();
    sendJson(res, 200, content);
    return;
  }

  let payload;
  try {
    payload = await readBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  try {
    const content = await saveSiteContent(payload);
    sendJson(res, 200, { ok: true, ...content });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
};
