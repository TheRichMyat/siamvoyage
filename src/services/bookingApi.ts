import { flagForCountryCode } from '../data/countries';
import type {
  Booking,
  CreateBookingPayload,
  CreateBookingResult,
  OfficeBooking,
  SheetBooking,
  SheetBookingListItem,
  UpdateBookingStatusPayload
} from '../types/booking';

const API_URL = import.meta.env.VITE_BOOKING_API_URL ?? '';

export function isBookingApiConfigured(): boolean {
  return Boolean(API_URL);
}

export function slugifyPackage(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseNameParts(name: string): { firstName: string; lastInitial: string } {
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] || 'Guest';
  const lastInitial = (parts[1]?.[0] || parts[0]?.[1] || 'X').toUpperCase();
  return { firstName, lastInitial };
}

export function sheetRowToBooking(
  row: SheetBooking | SheetBookingListItem,
  isMine = false
): Booking {
  const { firstName, lastInitial } = parseNameParts(row.name);
  return {
    id: row.bookingId,
    bookingId: row.bookingId,
    firstName,
    lastInitial,
    country: row.country,
    flag: flagForCountryCode(row.countryCode),
    tour: row.package,
    travelers: row.guestCount,
    startDate: row.travelDate || undefined,
    createdAt: new Date(row.createdAt).getTime(),
    isMine
  };
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid response from booking service');
  }
  if (!res.ok) {
    const message = typeof data === 'object' && data && 'error' in data
      ? String((data as { error: string }).error)
      : 'Booking request failed';
    throw new Error(message);
  }
  if (typeof data === 'object' && data && 'error' in data && !(data as SheetBooking).bookingId) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

export async function fetchBookings(): Promise<Booking[]> {
  if (!API_URL) return [];

  const res = await fetch(`${API_URL}?action=list`, {
    method: 'GET',
    redirect: 'follow'
  });
  const rows = await parseJsonResponse<SheetBookingListItem[]>(res);
  if (!Array.isArray(rows)) return [];
  return rows.map(row => sheetRowToBooking(row));
}

export async function createBooking(payload: CreateBookingPayload): Promise<CreateBookingResult> {
  if (!API_URL) {
    throw new Error('Booking service is not configured');
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'create', ...payload })
  });

  const row = await parseJsonResponse<SheetBooking>(res);
  const booking = sheetRowToBooking(row, true);
  return { booking, bookingId: row.bookingId };
}

function rowToOfficeBooking(row: Record<string, unknown>): OfficeBooking {
  return {
    bookingId: String(row.bookingId ?? ''),
    name: String(row.name ?? ''),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? ''),
    country: String(row.country ?? ''),
    countryCode: String(row.countryCode ?? ''),
    package: String(row.package ?? ''),
    packageSlug: String(row.packageSlug ?? ''),
    travelDate: String(row.travelDate ?? ''),
    guestCount: Number(row.guestCount) || 1,
    notes: String(row.notes ?? ''),
    status: (row.status as OfficeBooking['status']) || 'Pending',
    createdAt: String(row.createdAt ?? ''),
    paidAt: row.paidAt ? String(row.paidAt) : undefined,
    cancelledAt: row.cancelledAt ? String(row.cancelledAt) : undefined,
    cancellationReason: row.cancellationReason ? String(row.cancellationReason) : undefined,
    emailSentAt: row.emailSentAt ? String(row.emailSentAt) : undefined,
    updatedAt: row.updatedAt ? String(row.updatedAt) : undefined
  };
}

export async function fetchOfficeBookings(): Promise<OfficeBooking[]> {
  if (!API_URL) return [];

  const res = await fetch(`${API_URL}?action=listOffice`, {
    method: 'GET',
    redirect: 'follow'
  });
  const rows = await parseJsonResponse<Record<string, unknown>[]>(res);
  if (!Array.isArray(rows)) return [];
  return rows.map(rowToOfficeBooking);
}

export async function fetchBookingById(bookingId: string): Promise<OfficeBooking> {
  if (!API_URL) {
    throw new Error('Booking service is not configured');
  }

  const res = await fetch(
    `${API_URL}?action=get&bookingId=${encodeURIComponent(bookingId)}`,
    { method: 'GET', redirect: 'follow' }
  );
  const row = await parseJsonResponse<Record<string, unknown>>(res);
  if (!row.bookingId) throw new Error('Booking not found');
  return rowToOfficeBooking(row);
}

export async function updateBookingStatus(
  payload: UpdateBookingStatusPayload
): Promise<OfficeBooking> {
  if (!API_URL) {
    throw new Error('Booking service is not configured');
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'updateStatus', ...payload })
  });

  const row = await parseJsonResponse<Record<string, unknown>>(res);
  return rowToOfficeBooking(row);
}
