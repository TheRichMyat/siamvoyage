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

  // Aggregate guests per day (travel date)
  const guestsByDay = useMemo(() => {
    const map = new Map<string, { guests: number; bookings: OfficeBooking[] }>();
    for (const b of bookings) {
      if (b.status === 'Cancelled') continue;
      if (!b.travelDate) continue;
      const ymd = b.travelDate; // ISO yyyy-mm-dd, no timezone shift
      const entry = map.get(ymd) || { guests: 0, bookings: [] };
      entry.guests += b.guestCount || 0;
      entry.bookings.push(b);
      map.set(ymd, entry);
    }
    return map;
  }, [bookings]);

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
              // Build subtle sunset background for cells with travel
              const bg = cell.guests === 0
                ? 'bg-slate-50'
                : `bg-sunset/${Math.min(40, Math.max(10, Math.round(intensity * 40)))}`;
              return (
                <button
                  key={cell.ymd}
                  type="button"
                  onClick={() => setSelectedYmd(cell.ymd)}
                  className={`aspect-square rounded-lg p-1.5 text-left transition-all relative
                    ${bg}
                    ${isSelected ? 'ring-2 ring-sunset' : isToday ? 'ring-1 ring-slate-400' : 'hover:ring-1 hover:ring-slate-300'}
                  `}
                >
                  <div className={`text-xs font-bold ${cell.guests > 0 ? 'text-slate-900' : 'text-slate-400'}`}>{cell.day}</div>
                  {cell.guests > 0 && (
                    <div className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-sunset">
                      <Users size={10} /> {cell.guests}
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

function buildTrendBuckets(bookings: OfficeBooking[], period: 7 | 30 | 90): TrendBucket[] {
  const today = todayYmd();
  // 7d, 30d → daily buckets. 90d → weekly buckets (Mon-Sun).
  if (period === 7 || period === 30) {
    const days = ymdRangeBackward(today, period);
    return days.map(ymd => {
      const dayBookings = bookings.filter(b => b.status !== 'Cancelled' && toBkkYmd(b.createdAt) === ymd);
      const revenue = bookings
        .filter(b => b.status === 'Paid' && b.paidAt && toBkkYmd(b.paidAt) === ymd)
        .reduce((s, b) => s + bookingTotal(b.package, b.guestCount), 0);
      return { key: ymd, label: ymdShort(ymd), bookingsCount: dayBookings.length, revenue };
    });
  }
  // 90d → 13 weekly buckets ending on the current week
  const weeks: TrendBucket[] = [];
  // Compute Monday of current week (Bangkok)
  const todayDate = ymdToDate(today)!;
  const dow = (todayDate.getDay() + 6) % 7; // Mon=0
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - dow);
  for (let i = 12; i >= 0; i--) {
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

  const buckets = useMemo(() => buildTrendBuckets(bookings, period), [bookings, period]);
  const values = buckets.map(b => (metric === 'bookings' ? b.bookingsCount : b.revenue));
  const maxValue = Math.max(1, ...values);
  const total = values.reduce((s, v) => s + v, 0);

  const periodLabel = period === 90 ? '13 weeks' : `${period} days`;

  return (
    <section>
      <SectionHeader
        icon={<BarChart3 size={18} />}
        title="Trends"
        subtitle={`${metric === 'bookings' ? 'New bookings' : 'Paid revenue'} over the last ${periodLabel}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
              {([7, 30, 90] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    p === period ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p === 7 ? '1 Week' : p === 30 ? '1 Month' : '3 Months'}
                </button>
              ))}
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
              {(['bookings', 'revenue'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    m === metric ? 'bg-sunset text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m === 'bookings' ? 'Bookings' : 'Revenue'}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-baseline justify-between mb-4 gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total ({periodLabel})</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {metric === 'bookings' ? total.toLocaleString('en-US') : formatBaht(total)}
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Avg per {period === 90 ? 'week' : 'day'}: <span className="font-bold text-slate-700">
              {metric === 'bookings'
                ? (total / buckets.length).toFixed(1)
                : formatBaht(Math.round(total / buckets.length))}
            </span>
          </div>
        </div>

        {/* SVG bar chart */}
        <div className="relative">
          <div className="flex items-end gap-1 h-44">
            {buckets.map(b => {
              const v = metric === 'bookings' ? b.bookingsCount : b.revenue;
              const heightPct = (v / maxValue) * 100;
              return (
                <div key={b.key} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
                  <div className="text-[9px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {metric === 'bookings' ? v : formatBaht(v)}
                  </div>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      metric === 'bookings' ? 'bg-gradient-to-t from-slate-900 to-slate-700' : 'bg-gradient-to-t from-sunset to-orange-400'
                    } ${v === 0 ? 'opacity-20' : ''} group-hover:brightness-110`}
                    style={{ height: `${Math.max(heightPct, v > 0 ? 4 : 2)}%` }}
                    title={`${b.label}: ${metric === 'bookings' ? v : formatBaht(v)}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 mt-2">
            {buckets.map((b, i) => {
              // For 30d, show every 3rd label to avoid crowding. For 90d (weeks), show every other.
              const stride = period === 30 ? 3 : period === 90 ? 2 : 1;
              const visible = i % stride === 0 || i === buckets.length - 1;
              return (
                <div key={b.key} className="flex-1 text-[9px] text-slate-400 text-center min-w-0 truncate">
                  {visible ? b.label : '·'}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
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
