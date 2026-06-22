import { useCallback, useEffect, useState } from 'react';
import { generateSeedBookings } from '../lib/seedBookings';
import {
  createBooking as createBookingRequest,
  fetchBookings,
  isBookingApiConfigured
} from '../services/bookingApi';
import type { Booking, CreateBookingPayload, CreateBookingResult } from '../types/booking';

export const LAST_BOOKING_ID_KEY = 'siamvoyage_lastBookingId';

function mergeWithSeeds(apiBookings: Booking[]): Booking[] {
  if (apiBookings.length > 0) {
    return [...apiBookings].sort((a, b) => b.createdAt - a.createdAt);
  }
  return generateSeedBookings().sort((a, b) => b.createdAt - a.createdAt);
}

function applyIsMine(bookings: Booking[]): Booking[] {
  const lastId = sessionStorage.getItem(LAST_BOOKING_ID_KEY);
  if (!lastId) return bookings;
  return bookings.map(b =>
    b.bookingId === lastId || b.id === lastId ? { ...b, isMine: true } : b
  );
}

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>(() => mergeWithSeeds([]));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isBookingApiConfigured()) {
        if (!cancelled) setBookings(mergeWithSeeds([]));
        return;
      }
      try {
        const rows = await fetchBookings();
        if (!cancelled) setBookings(applyIsMine(mergeWithSeeds(rows)));
      } catch {
        if (!cancelled) setBookings(mergeWithSeeds([]));
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const addBooking = useCallback(async (payload: CreateBookingPayload): Promise<CreateBookingResult> => {
    const result = await createBookingRequest(payload);
    sessionStorage.setItem(LAST_BOOKING_ID_KEY, result.bookingId);
    setBookings(prev => {
      const withoutSeedsOrDuplicate = prev.filter(
        b => !b.id.startsWith('seed-') && b.id !== result.bookingId
      );
      return [result.booking, ...withoutSeedsOrDuplicate].sort((a, b) => b.createdAt - a.createdAt);
    });
    return result;
  }, []);

  return { bookings, addBooking, _tick: tick };
}
