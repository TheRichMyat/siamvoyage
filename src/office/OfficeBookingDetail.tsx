import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { flagForCountryCode } from '../data/countries';
import { fetchBookingById, updateBookingStatus } from '../services/bookingApi';
import type { BookingStatus, OfficeBooking } from '../types/booking';

const TOUR_PRICES: Record<string, number> = {
  'Phi Phi Island Escape': 6900,
  'Bangkok Cultural Journey': 2900,
  'Chiang Mai Mountain Retreat': 8500,
  'Krabi Beach Paradise': 11900,
  'Ayutthaya Historic Tour': 2500,
  'Koh Samui Luxury Getaway': 24900,
  'Hua Hin Royal Seaside': 9500,
  'Koh Phangan Full Moon Escape': 10900
};

function formatBaht(amount: number): string {
  return `฿${amount.toLocaleString('en-US')}`;
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const styles = {
    Pending: 'bg-amber-100 text-amber-800 border-amber-200',
    Paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Cancelled: 'bg-slate-100 text-slate-600 border-slate-200'
  }[status];

  return (
    <span className={`inline-flex text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border ${styles}`}>
      {status}
    </span>
  );
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return iso;
  }
}

export function OfficeBookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<OfficeBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const load = async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      setBooking(await fetchBookingById(bookingId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking not found');
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  // One-time auto-refresh on the first direct-URL hit for this booking.
  // Customers/staff opening the URL from a QR scan sometimes land on a blank
  // page in production (suspected first-paint race with the bundled router +
  // Apps Script cold start). A single reload reliably fixes it. The flag is
  // per-booking and per-session, so this never loops and never affects
  // in-app navigation that already worked.
  useEffect(() => {
    if (!bookingId) return;
    const reloadKey = `sv_booking_reloaded_${bookingId}`;
    let alreadyReloaded = false;
    try {
      alreadyReloaded = sessionStorage.getItem(reloadKey) === '1';
    } catch { /* private mode etc */ }
    if (!alreadyReloaded) {
      try { sessionStorage.setItem(reloadKey, '1'); } catch { /* ignore */ }
      // Defer just past the first paint so React gets a chance to commit,
      // then hard-reload — that mirrors the manual refresh that already works.
      window.setTimeout(() => window.location.reload(), 50);
      return;
    }
    load();
  }, [bookingId]);

  const handleMarkPaid = async () => {
    if (!booking || booking.status !== 'Pending') return;
    setActionLoading(true);
    setActionError(null);
    const now = new Date().toISOString();
    try {
      const updated = await updateBookingStatus({
        bookingId: booking.bookingId,
        status: 'Paid',
        paidAt: now,
        updatedAt: now
      });
      setBooking(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!booking || !cancelReason.trim()) return;
    setActionLoading(true);
    setActionError(null);
    const now = new Date().toISOString();
    try {
      const updated = await updateBookingStatus({
        bookingId: booking.bookingId,
        status: 'Cancelled',
        cancelledAt: now,
        cancellationReason: cancelReason.trim(),
        updatedAt: now
      });
      setBooking(updated);
      setShowCancelModal(false);
      setCancelReason('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-8 py-10 flex flex-col items-center gap-4 max-w-sm">
          <Loader2 size={32} className="text-sunset animate-spin" />
          <div className="text-center">
            <div className="text-base font-bold text-slate-900">Loading booking</div>
            <div className="text-xs text-slate-500 mt-1">
              {bookingId}
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            Connecting to the booking system. The first lookup after a quiet period can take a few seconds.
          </p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error ?? 'Booking not found'}</p>
        <Link to="/office" className="text-sunset font-semibold hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  const pricePerPerson = TOUR_PRICES[booking.package] || 0;
  const details = [
    { label: 'Booking ID', value: booking.bookingId },
    { label: 'Email', value: booking.email },
    { label: 'Phone', value: booking.phone },
    { label: 'Country', value: `${flagForCountryCode(booking.countryCode)} ${booking.country}` },
    { label: 'Package', value: booking.package },
    { label: 'Travel Date', value: formatDate(booking.travelDate) },
    { label: 'Guests', value: String(booking.guestCount) },
    { label: 'Price Per Person', value: formatBaht(pricePerPerson) },
    { label: 'Total Amount', value: formatBaht(pricePerPerson * booking.guestCount) },
    { label: 'Created', value: formatDateTime(booking.createdAt) },
    { label: 'Notes', value: booking.notes || '—' }
  ];

  return (
    <div>
      <Link to="/office" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-sunset mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start gap-8">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 font-mono">{booking.bookingId}</h1>
            <StatusBadge status={booking.status} />
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{booking.name}</h2>
            <dl className="grid sm:grid-cols-2 gap-4">
              {details.map(d => (
                <div key={d.label}>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{d.label}</dt>
                  <dd className="text-sm font-medium text-slate-800 mt-1">{d.value}</dd>
                </div>
              ))}
            </dl>

            {booking.status === 'Paid' && booking.paidAt && (
              <p className="mt-4 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                Paid on {formatDateTime(booking.paidAt)}
              </p>
            )}
            {booking.status === 'Cancelled' && (
              <div className="mt-4 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 space-y-1">
                {booking.cancelledAt && <p>Cancelled on {formatDateTime(booking.cancelledAt)}</p>}
                {booking.cancellationReason && <p>Reason: {booking.cancellationReason}</p>}
              </div>
            )}
          </div>

          {actionError && (
            <p className="mb-4 text-sm text-red-600">{actionError}</p>
          )}

          <div className="flex flex-wrap gap-3">
            {booking.status === 'Pending' && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleMarkPaid}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-5 py-3 rounded-xl font-bold transition-colors"
              >
                <CheckCircle2 size={18} /> Mark as Paid
              </button>
            )}
            {booking.status !== 'Cancelled' && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-red-300 hover:text-red-600 disabled:opacity-60 text-slate-700 px-5 py-3 rounded-xl font-bold transition-colors"
              >
                <XCircle size={18} /> Cancel Booking
              </button>
            )}
          </div>
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Cancel Booking</h3>
            <p className="text-sm text-slate-500 mb-4">This record will be kept permanently. Please enter a reason.</p>
            <textarea
              rows={3}
              required
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Cancellation reason…"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 rounded-xl font-bold border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                disabled={actionLoading || !cancelReason.trim()}
                onClick={handleCancel}
                className="flex-1 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
