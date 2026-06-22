export type BookingStatus = 'Pending' | 'Paid' | 'Cancelled';

/** Row shape returned from Google Sheets via the GAS API. */
export type SheetBooking = {
  bookingId: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  countryCode: string;
  package: string;
  packageSlug: string;
  travelDate: string;
  guestCount: number;
  notes: string;
  status: BookingStatus;
  createdAt: string;
  paidAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  emailSentAt?: string;
  updatedAt?: string;
};

/** Payload sent when creating a booking. */
export type CreateBookingPayload = {
  name: string;
  email: string;
  phone: string;
  country: string;
  countryCode: string;
  package: string;
  packageSlug: string;
  travelDate: string;
  guestCount: number;
  notes?: string;
};

/** Lightweight row returned by GET list (live feed). */
export type SheetBookingListItem = {
  bookingId: string;
  name: string;
  country: string;
  countryCode: string;
  package: string;
  travelDate: string;
  guestCount: number;
  status: BookingStatus;
  createdAt: string;
};

/** Full row for staff dashboard and detail pages. */
export type OfficeBooking = SheetBooking;

export type UpdateBookingStatusPayload = {
  bookingId: string;
  status: BookingStatus;
  paidAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  updatedAt: string;
};

/** Display model used by existing UI components. */
export type Booking = {
  id: string;
  bookingId?: string;
  firstName: string;
  lastInitial: string;
  country: string;
  flag: string;
  tour: string;
  travelers: number;
  startDate?: string;
  createdAt: number;
  isMine?: boolean;
};

export type CreateBookingResult = {
  booking: Booking;
  bookingId: string;
};
