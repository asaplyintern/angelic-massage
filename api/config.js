const { BUSINESS, SERVICES } = require("./_lib/config");
const { methodNotAllowed, sendJson } = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res);
    return;
  }
  sendJson(res, 200, { business: BUSINESS, services: SERVICES });
};
