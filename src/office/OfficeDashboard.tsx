import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { flagForCountryCode } from '../data/countries';
import { fetchOfficeBookings } from '../services/bookingApi';
import type { BookingStatus, OfficeBooking } from '../types/booking';

function StatusBadge({ status }: { status: BookingStatus }) {
  const styles = {
    Pending: 'bg-amber-100 text-amber-800 border-amber-200',
    Paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Cancelled: 'bg-slate-100 text-slate-600 border-slate-200'
  }[status];

  return (
    <span className={`inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${styles}`}>
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return iso;
  }
}

export function OfficeDashboard() {
  const [bookings, setBookings] = useState<OfficeBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchOfficeBookings();
      setBookings(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pending = bookings.filter(b => b.status === 'Pending').length;
  const paid = bookings.filter(b => b.status === 'Paid').length;
  const cancelled = bookings.filter(b => b.status === 'Cancelled').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Bookings</h1>
          <p className="text-slate-500 mt-1">Manage check-ins and payment status</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:border-sunset hover:text-sunset transition-colors disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Pending', value: pending, color: 'text-amber-600' },
          { label: 'Paid', value: paid, color: 'text-emerald-600' },
          { label: 'Cancelled', value: cancelled, color: 'text-slate-500' }
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stat.label}</div>
            <div className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {['Booking ID', 'Name', 'Package', 'Travel Date', 'Guests', 'Country', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">Loading bookings…</td>
                </tr>
              )}
              {!loading && bookings.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">No bookings yet</td>
                </tr>
              )}
              {!loading && bookings.map(b => (
                <tr key={b.bookingId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">{b.bookingId}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{b.name}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{b.package}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(b.travelDate)}</td>
                  <td className="px-4 py-3 text-slate-600">{b.guestCount}</td>
                  <td className="px-4 py-3">
                    <span className="text-lg" aria-label={b.country}>{flagForCountryCode(b.countryCode)}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/office/booking/${b.bookingId}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-sunset hover:underline whitespace-nowrap"
                    >
                      View <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
