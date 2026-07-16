const { getSiteContent } = require("./_lib/siteContent");
const { methodNotAllowed, sendJson } = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res);
    return;
  }

  const content = await getSiteContent();
  sendJson(res, 200, content);
};
