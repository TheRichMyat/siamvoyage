/** Check-in path encoded in QR codes (relative). */
export function getBookingCheckInPath(bookingId: string): string {
  return `/office/booking/${bookingId}`;
}

/** Full URL for frontend QR rendering (scannable in browser). */
export function getBookingCheckInUrl(bookingId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${getBookingCheckInPath(bookingId)}`;
  }
  return getBookingCheckInPath(bookingId);
}

/** External QR image URL for email HTML (Google Apps Script). */
export function getEmailQrImageUrl(bookingId: string): string {
  const data = getBookingCheckInPath(bookingId);
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data)}`;
}
