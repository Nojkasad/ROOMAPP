import QRCode from 'qrcode';

// The address of the frontend. The QR code must point at the page a person opens, not at the API.
// Change it in .env (e.g. to the laptop's IP or the real domain) and every QR code follows.
const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

// The URL a station's QR code contains. Scanning = opening this link.
export function stationUrl(slug) {
  return `${APP_URL}/s/${slug}`;
}

// Any text -> QR code as an SVG string (scales without blurring when printed).
export function toQrSvg(text) {
  return QRCode.toString(text, { type: 'svg', margin: 1 });
}
