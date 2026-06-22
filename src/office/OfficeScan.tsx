import { ScanLine } from 'lucide-react';

/**
 * Placeholder for Phase 10 QR scanner.
 * Future: open mobile camera, scan QR, auto-navigate to /office/booking/:bookingId
 */
export function OfficeScan() {
  return (
    <div className="max-w-lg mx-auto text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-ocean to-blue-600 flex items-center justify-center">
        <ScanLine size={36} className="text-white" />
      </div>
      <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">QR Scanner</h1>
      <p className="text-slate-500 mb-6">
        Camera-based check-in scanning will be available here. For now, open a booking from the dashboard or scan a customer voucher manually.
      </p>
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-sm text-slate-400">
        Scanner UI coming soon
      </div>
    </div>
  );
}
