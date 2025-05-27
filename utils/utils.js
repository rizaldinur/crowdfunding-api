export function getBaseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

export function getClientBaseUrl(req) {
  return req.get("origin");
}
