import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, CalendarDays, ChevronLeft, ChevronRight, Coins, RefreshCw, Users } from 'lucide-react';
import { flagForCountryCode } from '../data/countries';
import { bookingTotal, formatBaht } from '../data/tourPrices';
import { fetchOfficeBookings } from '../services/bookingApi';
import type { BookingStatus, OfficeBooking } from '../types/booking';

// ─── Bangkok-time date helpers ────────────────────────────────────────────────
// All "today / this week / this month" buckets are anchored to Bangkok time so
// the dashboard reflects the business day, not the customer's local day.

const TZ = 'Asia/Bangkok';

function toBkkYmd(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return '';
  }
}

function todayYmd(): string {
  return toBkkYmd(new Date().toISOString());
}

function ymdToDate(ymd: string): Date | null {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function ymdLong(ymd: string): string {
  const d = ymdToDate(ymd);
  if (!d) return ymd;
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function ymdShort(ymd: string): string {
  const d = ymdToDate(ymd);
  if (!d) return ymd;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function shiftYmd(ymd: string, deltaDays: number): string {
  const d = ymdToDate(ymd);
  if (!d) return ymd;
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ymdRangeBackward(endYmd: string, count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(shiftYmd(endYmd, -i));
  return out;
}

// Sheets often auto-converts date cells into Date objects, which serialize to
// ISO timestamps like "2026-06-28T17:00:00.000Z" rather than the "2026-06-28"
// string the form submitted. Normalize both shapes back to YYYY-MM-DD in
// Bangkok time so calendar/snapshot lookups don't silently miss bookings.
function normalizeYmd(value?: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return toBkkYmd(value);
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, action }: { icon?: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          {icon && <span className="text-sunset">{icon}</span>}
          <h2 className="text-xl font-serif font-bold text-slate-900">{title}</h2>
        </div>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
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

function fmtTravelDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ─── 1. Daily snapshot ────────────────────────────────────────────────────────
function DailySnapshot({ bookings, selectedDate, onDateChange }: { bookings: OfficeBooking[]; selectedDate: string; onDateChange: (ymd: string) => void }) {
  const isToday = selectedDate === todayYmd();

  const bookingsOnDate = useMemo(
    () => bookings.filter(b => toBkkYmd(b.createdAt) === selectedDate && b.status !== 'Cancelled'),
    [bookings, selectedDate]
  );
  const paidOnDate = useMemo(() => bookingsOnDate.filter(b => b.status === 'Paid'), [bookingsOnDate]);
  const pendingOnDate = useMemo(() => bookingsOnDate.filter(b => b.status === 'Pending'), [bookingsOnDate]);

  const paidRevenue = useMemo(
    () => paidOnDate.reduce((sum, b) => sum + bookingTotal(b.package, b.guestCount), 0),
    [paidOnDate]
  );
  const expectedRevenue = useMemo(
    () => bookingsOnDate.reduce((sum, b) => sum + bookingTotal(b.package, b.guestCount), 0),
    [bookingsOnDate]
  );

  const cards = [
    { label: 'Bookings', value: String(bookingsOnDate.length), accent: 'text-slate-900', sub: isToday ? 'made today' : 'on this date' },
    { label: 'Paid', value: String(paidOnDate.length), accent: 'text-emerald-600', sub: formatBaht(paidRevenue) + ' collected' },
    { label: 'Pending', value: String(pendingOnDate.length), accent: 'text-amber-600', sub: pendingOnDate.length ? 'awaiting payment' : 'all cleared' },
    { label: 'Expected', value: formatBaht(expectedRevenue), accent: 'text-sunset', sub: 'paid + pending total' }
  ];

  return (
    <section>
      <SectionHeader
        icon={<Coins size={18} />}
        title="Today's Snapshot"
        subtitle={ymdLong(selectedDate)}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDateChange(shiftYmd(selectedDate, -1))}
              aria-label="Previous day"
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:border-sunset hover:text-sunset transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={e => onDateChange(e.target.value || todayYmd())}
              max={todayYmd()}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none"
            />
            <button
              type="button"
              onClick={() => onDateChange(shiftYmd(selectedDate, 1))}
              disabled={isToday}
              aria-label="Next day"
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:border-sunset hover:text-sunset transition-colors disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
            >
              <ChevronRight size={16} />
            </button>
            {!isToday && (
              <button
                type="button"
                onClick={() => onDateChange(todayYmd())}
                className="px-3 py-2 rounded-lg bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Today
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{c.label}</div>
            <div className={`text-2xl font-bold mt-1 ${c.accent}`}>{c.value}</div>
            <div className="text-xs text-slate-500 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Bookings on this date</div>
          <div className="text-xs text-slate-500">{bookingsOnDate.length} total</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/40">
                {['Booking ID', 'Customer', 'Package', 'Guests', 'Amount', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-2.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookingsOnDate.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                    No bookings on {ymdShort(selectedDate)}
                  </td>
                </tr>
              )}
              {bookingsOnDate.map(b => (
                <tr key={b.bookingId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap text-xs">{b.bookingId}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{b.name}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{b.package}</td>
                  <td className="px-4 py-3 text-slate-600">{b.guestCount}</td>
                  <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{formatBaht(bookingTotal(b.package, b.guestCount))}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <Link to={`/office/booking/${b.bookingId}`} className="inline-flex items-center gap-1 text-xs font-bold text-sunset hover:underline whitespace-nowrap">
                      View <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─── 2. Travel calendar ───────────────────────────────────────────────────────
function TravelCalendar({ bookings }: { bookings: OfficeBooking[] }) {
  const today = todayYmd();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { y, m: m - 1 }; // 0-indexed month
  });
  const [selectedYmd, setSelectedYmd] = useState<string | null>(today);

  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const firstWeekday = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7; // Mon=0
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Aggregate guests per day (travel date) — normalize because Sheets
  // sometimes serializes the date cell as an ISO timestamp.
  const guestsByDay = useMemo(() => {
    const map = new Map<string, { guests: number; bookings: OfficeBooking[] }>();
    for (const b of bookings) {
      if (b.status === 'Cancelled') continue;
      const ymd = normalizeYmd(b.travelDate);
      if (!ymd) continue;
      const entry = map.get(ymd) || { guests: 0, bookings: [] };
      entry.guests += b.guestCount || 0;
      entry.bookings.push(b);
      map.set(ymd, entry);
    }
    return map;
  }, [bookings]);

  const todayEntry = guestsByDay.get(today);

  // Find the busiest day in the visible month for color scaling
  const maxGuestsInMonth = useMemo(() => {
    let max = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const g = guestsByDay.get(key)?.guests || 0;
      if (g > max) max = g;
    }
    return max;
  }, [guestsByDay, cursor, daysInMonth]);

  const cells: ({ ymd: string; day: number; guests: number; bookings: OfficeBooking[] } | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const entry = guestsByDay.get(ymd) || { guests: 0, bookings: [] };
    cells.push({ ymd, day: d, guests: entry.guests, bookings: entry.bookings });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const goMonth = (delta: number) => {
    let { y, m } = cursor;
    m += delta;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCursor({ y, m });
  };

  const selectedEntry = selectedYmd ? guestsByDay.get(selectedYmd) : undefined;

  return (
    <section>
      <SectionHeader
        icon={<CalendarDays size={18} />}
        title="Travel Calendar"
        subtitle="Who's traveling each day — click a date to see the list"
        action={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => goMonth(-1)} aria-label="Previous month" className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:border-sunset hover:text-sunset transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-bold text-slate-800 min-w-[160px] text-center">{monthLabel}</div>
            <button type="button" onClick={() => goMonth(1)} aria-label="Next month" className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:border-sunset hover:text-sunset transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          {/* Today summary + color legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
            <div className="text-sm">
              <span className="text-slate-500">Today: </span>
              <span className="font-bold text-slate-900">
                {todayEntry && todayEntry.guests > 0
                  ? `${todayEntry.guests} traveler${todayEntry.guests === 1 ? '' : 's'} across ${todayEntry.bookings.length} booking${todayEntry.bookings.length === 1 ? '' : 's'}`
                  : 'no travelers today'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Fewer</span>
              {[0.15, 0.3, 0.5, 0.7, 0.9].map(opacity => (
                <span key={opacity} className="w-4 h-4 rounded" style={{ backgroundColor: `rgba(242, 125, 38, ${opacity})` }} />
              ))}
              <span>More</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              if (!cell) return <div key={idx} className="aspect-square" />;
              const isToday = cell.ymd === today;
              const isSelected = cell.ymd === selectedYmd;
              const intensity = maxGuestsInMonth > 0 ? cell.guests / maxGuestsInMonth : 0;
              const bgStyle = cell.guests > 0
                ? { backgroundColor: `rgba(242, 125, 38, ${0.15 + intensity * 0.7})` }
                : { backgroundColor: 'rgb(248, 250, 252)' }; // slate-50
              const ringClass = isSelected
                ? 'ring-2 ring-sunset ring-offset-1'
                : isToday
                  ? 'ring-2 ring-slate-900'
                  : 'hover:ring-1 hover:ring-slate-300';
              const dayColor = cell.guests > 0 ? 'text-slate-900' : isToday ? 'text-slate-900' : 'text-slate-400';
              return (
                <button
                  key={cell.ymd}
                  type="button"
                  onClick={() => setSelectedYmd(cell.ymd)}
                  className={`aspect-square rounded-lg p-1.5 text-left transition-all relative ${ringClass}`}
                  style={bgStyle}
                >
                  <div className={`text-xs font-bold ${dayColor}`}>{cell.day}</div>
                  {isToday && (
                    <div className="absolute top-1 right-1 text-[8px] font-bold uppercase tracking-widest text-slate-900">
                      Now
                    </div>
                  )}
                  {cell.guests > 0 && (
                    <div className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-white px-1 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
                      <Users size={9} /> {cell.guests}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Selected day</div>
          <div className="text-base font-bold text-slate-900 mb-4">{selectedYmd ? ymdLong(selectedYmd) : 'Pick a day on the calendar'}</div>
          {!selectedEntry || selectedEntry.bookings.length === 0 ? (
            <div className="text-sm text-slate-400 py-8 text-center">No one is traveling on this day.</div>
          ) : (
            <ul className="space-y-2 max-h-[280px] overflow-y-auto">
              {selectedEntry.bookings.map(b => (
                <li key={b.bookingId} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-50">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-900 truncate">{b.name}</div>
                    <div className="text-xs text-slate-500 truncate">{b.package}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] font-bold text-slate-600 flex items-center gap-0.5"><Users size={10} /> {b.guestCount}</span>
                    <span className="text-base" aria-label={b.country}>{flagForCountryCode(b.countryCode)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── 3. Trends ────────────────────────────────────────────────────────────────
type TrendBucket = { key: string; label: string; bookingsCount: number; revenue: number };

function buildTrendBuckets(bookings: OfficeBooking[], period: 7 | 30 | 90, windows: number = 1): TrendBucket[] {
  const today = todayYmd();
  // 7d, 30d → daily buckets. 90d → weekly buckets (Mon-Sun).
  if (period === 7 || period === 30) {
    const days = ymdRangeBackward(today, period * windows);
    return days.map(ymd => {
      const dayBookings = bookings.filter(b => b.status !== 'Cancelled' && toBkkYmd(b.createdAt) === ymd);
      const revenue = bookings
        .filter(b => b.status === 'Paid' && b.paidAt && toBkkYmd(b.paidAt) === ymd)
        .reduce((s, b) => s + bookingTotal(b.package, b.guestCount), 0);
      return { key: ymd, label: ymdShort(ymd), bookingsCount: dayBookings.length, revenue };
    });
  }
  // 90d → 13 weekly buckets ending on the current week (× windows for delta)
  const weeks: TrendBucket[] = [];
  const totalWeeks = 13 * windows;
  // Compute Monday of current week (Bangkok)
  const todayDate = ymdToDate(today)!;
  const dow = (todayDate.getDay() + 6) % 7; // Mon=0
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - dow);
  for (let i = totalWeeks - 1; i >= 0; i--) {
    const start = new Date(monday);
    start.setDate(monday.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startYmd = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endYmd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    const inWeek = (ymd: string) => ymd >= startYmd && ymd <= endYmd;
    const wkBookings = bookings.filter(b => b.status !== 'Cancelled' && inWeek(toBkkYmd(b.createdAt)));
    const wkRevenue = bookings
      .filter(b => b.status === 'Paid' && b.paidAt && inWeek(toBkkYmd(b.paidAt)))
      .reduce((s, b) => s + bookingTotal(b.package, b.guestCount), 0);
    weeks.push({ key: startYmd, label: ymdShort(startYmd), bookingsCount: wkBookings.length, revenue: wkRevenue });
  }
  return weeks;
}

function TrendsSection({ bookings }: { bookings: OfficeBooking[] }) {
  const [period, setPeriod] = useState<7 | 30 | 90>(7);
  const [metric, setMetric] = useState<'bookings' | 'revenue'>('bookings');

  // Build the current window + the previous window (same length) so we can show a delta.
  const bucketsAll = useMemo(() => buildTrendBuckets(bookings, period, 2), [bookings, period]);
  const halfLen = bucketsAll.length / 2;
  const previousBuckets = bucketsAll.slice(0, halfLen);
  const currentBuckets = bucketsAll.slice(halfLen);

  const currentValues = currentBuckets.map(b => (metric === 'bookings' ? b.bookingsCount : b.revenue));
  const previousValues = previousBuckets.map(b => (metric === 'bookings' ? b.bookingsCount : b.revenue));
  const total = currentValues.reduce((s, v) => s + v, 0);
  const previousTotal = previousValues.reduce((s, v) => s + v, 0);
  const deltaPct = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : total > 0 ? 100 : 0;
  const deltaColor = total >= previousTotal ? 'text-emerald-600' : 'text-red-500';
  const deltaSign = total >= previousTotal ? '+' : '';

  const periodLabel = period === 90 ? '13 weeks' : `${period} days`;

  return (
    <section>
      <SectionHeader
        icon={<BarChart3 size={18} />}
        title="Trends"
        subtitle={metric === 'bookings' ? 'New bookings over time' : 'Paid revenue over time'}
        action={
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            {([7, 30, 90] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                  p === period ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p === 7 ? '1W' : p === 30 ? '1M' : '3M'}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_260px] gap-4">
        {/* Left — big total + chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 pt-5 pb-3">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {metric === 'bookings' ? 'Bookings' : 'Revenue'} · last {periodLabel}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-3xl font-bold text-slate-900 tabular-nums">
                  {metric === 'bookings' ? total.toLocaleString('en-US') : formatBaht(total)}
                </div>
                {previousTotal > 0 || total > 0 ? (
                  <div className={`text-xs font-bold ${deltaColor}`}>
                    {deltaSign}{deltaPct.toFixed(1)}%
                  </div>
                ) : null}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                vs previous {periodLabel}: {metric === 'bookings' ? previousTotal.toLocaleString('en-US') : formatBaht(previousTotal)}
              </div>
            </div>

            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
              {(['bookings', 'revenue'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${
                    m === metric
                      ? m === 'bookings' ? 'bg-white shadow text-slate-900' : 'bg-sunset text-white shadow'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {m === 'bookings' ? 'Bookings' : 'Revenue'}
                </button>
              ))}
            </div>
          </div>

          <AreaChart buckets={currentBuckets} metric={metric} period={period} />
        </div>

        {/* Right — highlights panel */}
        <TrendHighlights buckets={currentBuckets} metric={metric} period={period} bookings={bookings} />
      </div>
    </section>
  );
}

function TrendHighlights({ buckets, metric, period, bookings }: { buckets: TrendBucket[]; metric: 'bookings' | 'revenue'; period: 7 | 30 | 90; bookings: OfficeBooking[] }) {
  const values = buckets.map(b => (metric === 'bookings' ? b.bookingsCount : b.revenue));
  const activeDays = values.filter(v => v > 0).length;
  const total = values.reduce((s, v) => s + v, 0);
  const avg = total / buckets.length;
  const maxVal = Math.max(0, ...values);
  const maxIdx = values.indexOf(maxVal);
  const peakLabel = maxVal > 0 && maxIdx >= 0 ? buckets[maxIdx].label : '—';

  // Status split within the current window (created within period bucket range)
  const windowKeys = new Set(buckets.map(b => b.key));
  const windowBookings = bookings.filter(b => {
    if (b.status === 'Cancelled') return false;
    const ymd = toBkkYmd(b.createdAt);
    if (period === 7 || period === 30) return windowKeys.has(ymd);
    // For weekly, keys are week-start ymds; approximate by matching first-7-day inclusive
    return buckets.some(bkt => ymd >= bkt.key && ymd <= shiftYmd(bkt.key, 6));
  });
  const paidCount = windowBookings.filter(b => b.status === 'Paid').length;
  const pendingCount = windowBookings.filter(b => b.status === 'Pending').length;
  const paidPct = windowBookings.length > 0 ? (paidCount / windowBookings.length) * 100 : 0;

  const rows = [
    { label: 'Peak', value: peakLabel, sub: maxVal > 0 ? (metric === 'bookings' ? `${maxVal} booking${maxVal === 1 ? '' : 's'}` : formatBaht(maxVal)) : 'no activity' },
    { label: 'Average', value: metric === 'bookings' ? avg.toFixed(1) : formatBaht(Math.round(avg)), sub: `per ${period === 90 ? 'week' : 'day'}` },
    { label: 'Active', value: `${activeDays}/${buckets.length}`, sub: period === 90 ? 'weeks with activity' : 'days with activity' }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Highlights</div>

      <div className="space-y-4 flex-1">
        {rows.map(r => (
          <div key={r.label}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{r.label}</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{r.value}</div>
            <div className="text-[11px] text-slate-500">{r.sub}</div>
          </div>
        ))}
      </div>

      {/* Payment progress across the window */}
      <div className="mt-5 pt-5 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment rate</div>
          <div className="text-xs font-bold text-slate-900">{paidPct.toFixed(0)}%</div>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
          <span><span className="font-bold text-emerald-700">{paidCount}</span> paid</span>
          <span><span className="font-bold text-amber-700">{pendingCount}</span> pending</span>
        </div>
      </div>
    </div>
  );
}

function AreaChart({ buckets, metric, period }: { buckets: TrendBucket[]; metric: 'bookings' | 'revenue'; period: 7 | 30 | 90 }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  // Fixed viewBox — SVG scales responsively.
  const CHART_W = 720;
  const CHART_H = 140;
  const PAD_L = 30;
  const PAD_R = 10;
  const PAD_T = 16;
  const PAD_B = 20;
  const plotW = CHART_W - PAD_L - PAD_R;
  const plotH = CHART_H - PAD_T - PAD_B;

  const values = buckets.map(b => (metric === 'bookings' ? b.bookingsCount : b.revenue));
  const rawMax = Math.max(1, ...values);
  const niceMax = niceCeil(rawMax);
  const ticks = [0, niceMax / 2, niceMax];

  const uid = metric;
  const strokeColor = metric === 'bookings' ? '#0f172a' : '#F27D26';
  const gradTop = metric === 'bookings' ? 'rgba(15,23,42,0.28)' : 'rgba(242,125,38,0.32)';
  const gradBottom = metric === 'bookings' ? 'rgba(15,23,42,0)' : 'rgba(242,125,38,0)';

  const points = buckets.map((b, i) => {
    const v = metric === 'bookings' ? b.bookingsCount : b.revenue;
    const x = buckets.length === 1
      ? PAD_L + plotW / 2
      : PAD_L + (i / (buckets.length - 1)) * plotW;
    const y = PAD_T + plotH - (v / niceMax) * plotH;
    return { x, y, v, label: b.label };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const baselineY = PAD_T + plotH;
  const areaPath = points.length > 0
    ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${baselineY} L${points[0].x.toFixed(1)},${baselineY} Z`
    : '';

  const lastPoint = points[points.length - 1];
  const hover = hoverIdx !== null ? points[hoverIdx] : null;
  const hoverBucket = hoverIdx !== null ? buckets[hoverIdx] : null;

  const formatTick = (n: number) =>
    metric === 'bookings' ? Math.round(n).toString() : shortNumber(n);

  const labelStride = period === 30 ? 5 : period === 90 ? 2 : 1;

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full h-36"
      preserveAspectRatio="none"
      role="img"
      aria-label={`${metric} trend chart`}
      onMouseLeave={() => setHoverIdx(null)}
      onMouseMove={e => {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const relX = ((e.clientX - rect.left) / rect.width) * CHART_W;
        let best = 0;
        let bestDist = Infinity;
        points.forEach((p, i) => {
          const d = Math.abs(p.x - relX);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        setHoverIdx(best);
      }}
    >
      <defs>
        <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={gradTop} />
          <stop offset="100%" stopColor={gradBottom} />
        </linearGradient>
      </defs>

      {ticks.map((t, i) => {
        const y = PAD_T + plotH - (t / niceMax) * plotH;
        return (
          <g key={i}>
            <line x1={PAD_L} x2={CHART_W - PAD_R} y1={y} y2={y} stroke="#eef2f6" strokeWidth={1} strokeDasharray={i === 0 ? '' : '2 4'} />
            <text x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize={9} fill="#94a3b8" fontWeight={700}>
              {formatTick(t)}
            </text>
          </g>
        );
      })}

      {areaPath && <path d={areaPath} fill={`url(#grad-${uid})`} />}
      {linePath && <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />}

      {lastPoint && (
        <circle cx={lastPoint.x} cy={lastPoint.y} r={3.5} fill="#fff" stroke={strokeColor} strokeWidth={2} />
      )}

      {buckets.map((b, i) => {
        if (i % labelStride !== 0 && i !== buckets.length - 1) return null;
        const p = points[i];
        return (
          <text key={b.key} x={p.x} y={CHART_H - 6} textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight={600}>
            {b.label}
          </text>
        );
      })}

      {hover && hoverBucket && (
        <g pointerEvents="none">
          <line x1={hover.x} x2={hover.x} y1={PAD_T} y2={PAD_T + plotH} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="2 3" />
          <circle cx={hover.x} cy={hover.y} r={4} fill={strokeColor} stroke="#fff" strokeWidth={2} />
          {(() => {
            const label = hoverBucket.label;
            const val = metric === 'bookings' ? hover.v.toString() : formatBaht(hover.v);
            const text = `${label} · ${val}`;
            const textW = text.length * 5.5 + 12;
            let tx = hover.x - textW / 2;
            if (tx < PAD_L) tx = PAD_L;
            if (tx + textW > CHART_W - PAD_R) tx = CHART_W - PAD_R - textW;
            const ty = Math.max(PAD_T, hover.y - 18);
            return (
              <g>
                <rect x={tx} y={ty} width={textW} height={16} rx={4} fill="#0f172a" opacity={0.92} />
                <text x={tx + textW / 2} y={ty + 11} textAnchor="middle" fontSize={9} fontWeight={700} fill="#fff">
                  {text}
                </text>
              </g>
            );
          })()}
        </g>
      )}
    </svg>
  );
}

function niceCeil(value: number): number {
  if (value <= 1) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  let nice: number;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

function shortNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + 'k';
  return Math.round(n).toString();
}

// ─── 4. All bookings (existing) ───────────────────────────────────────────────
function AllBookings({ bookings, loading }: { bookings: OfficeBooking[]; loading: boolean }) {
  return (
    <section>
      <SectionHeader title="All Bookings" subtitle={`${bookings.length} total — newest first`} />
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Loading bookings…</td></tr>
              )}
              {!loading && bookings.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No bookings yet</td></tr>
              )}
              {!loading && bookings.map(b => (
                <tr key={b.bookingId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap text-xs">{b.bookingId}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{b.name}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{b.package}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtTravelDate(b.travelDate)}</td>
                  <td className="px-4 py-3 text-slate-600">{b.guestCount}</td>
                  <td className="px-4 py-3"><span className="text-lg" aria-label={b.country}>{flagForCountryCode(b.countryCode)}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <Link to={`/office/booking/${b.bookingId}`} className="inline-flex items-center gap-1 text-xs font-bold text-sunset hover:underline whitespace-nowrap">
                      View <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function OfficeDashboard() {
  const [bookings, setBookings] = useState<OfficeBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayYmd());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setBookings(await fetchOfficeBookings());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-12">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Bookings & Income</h1>
          <p className="text-slate-500 mt-1">Daily snapshot, travel calendar and performance trends</p>
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

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
      )}

      <DailySnapshot bookings={bookings} selectedDate={selectedDate} onDateChange={setSelectedDate} />
      <TravelCalendar bookings={bookings} />
      <TrendsSection bookings={bookings} />
      <AllBookings bookings={bookings} loading={loading} />
    </div>
  );
}
