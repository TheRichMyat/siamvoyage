import { QRCodeSVG } from 'qrcode.react';
import { getBookingCheckInUrl } from '../lib/bookingQr';

type BookingQrCardProps = {
  bookingId: string;
  compact?: boolean;
};

export function BookingQrCard({ bookingId, compact = false }: BookingQrCardProps) {
  const checkInUrl = getBookingCheckInUrl(bookingId);

  return (
    <div
      className={`flex flex-col items-center text-center ${
        compact ? 'p-4' : 'p-6'
      } bg-gradient-to-br from-tropical-bg/80 to-white rounded-2xl border-2 border-slate-100 shadow-sm`}
    >
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
        Check-in QR Code
      </div>
      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-inner">
        <QRCodeSVG
          value={checkInUrl}
          size={compact ? 140 : 180}
          level="M"
          includeMargin={false}
          fgColor="#0f172a"
          bgColor="#ffffff"
        />
      </div>
      <div className="mt-4 font-mono text-sm font-bold text-slate-900 tracking-wider">
        {bookingId}
      </div>
      <p className="mt-2 text-xs text-slate-500 max-w-[220px]">
        Show this code to staff at check-in
      </p>
    </div>
  );
}
