/** Return the exact public response envelope, without internal state. */
export function success(res, data, message, status = 200) {
  return res.status(status).json({ success: true, data, error: null, message });
}
