import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Keyboard, ScanLine } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const SCANNER_ID = 'siamvoyage-office-qr-reader';

function extractBookingId(value: string): string | null {
  const decoded = value.trim();
  const match = decoded.match(/SV-\d{8}-[A-Z0-9]{4}/i);
  return match ? match[0].toUpperCase() : null;
}

export function OfficeScan() {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [manualId, setManualId] = useState('');
  const [status, setStatus] = useState('Point the camera at a Siam Voyage voucher QR.');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const openBooking = async (rawValue: string) => {
    const bookingId = extractBookingId(rawValue);
    if (!bookingId) {
      setStatus('That code does not look like a Siam Voyage booking ID.');
      return;
    }
    setStatus(`Opening ${bookingId}...`);
    try {
      await scannerRef.current?.stop();
    } catch { /* camera may already be stopped */ }
    navigate(`/office/booking/${bookingId}`);
  };

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;

    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (cancelled) return;
        const cameraId = cameras.find(c => /back|rear|environment/i.test(c.label))?.id || cameras[0]?.id;
        if (!cameraId) throw new Error('No camera found on this device.');
        return scanner.start(
          cameraId,
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => void openBooking(decodedText),
          () => undefined
        );
      })
      .then(() => {
        if (!cancelled) setCameraReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setCameraError(err instanceof Error ? err.message : 'Camera access failed.');
          setStatus('Use manual entry below if camera access is unavailable.');
        }
      });

    return () => {
      cancelled = true;
      scanner.stop().catch(() => undefined).finally(() => {
        try {
          scanner.clear();
        } catch { /* ignore scanner cleanup race */ }
      });
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-ocean/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-ocean mb-3">
          <ScanLine size={14} /> QR Check-in
        </div>
        <h1 className="text-3xl font-serif font-bold text-slate-900">Scan customer voucher</h1>
        <p className="mt-2 text-slate-500">Successful scans open the booking detail automatically.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        <div className="rounded-2xl bg-slate-950 p-4 shadow-xl border border-slate-800">
          <div id={SCANNER_ID} className="overflow-hidden rounded-xl bg-black min-h-[320px]" />
          <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
            <Camera size={16} className={cameraReady ? 'text-emerald-400' : 'text-slate-400'} />
            <span>{cameraError ?? status}</span>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void openBooking(manualId);
          }}
          className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-4">
            <Keyboard size={17} className="text-sunset" /> Manual lookup
          </div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Booking ID</label>
          <input
            value={manualId}
            onChange={(e) => setManualId(e.target.value.toUpperCase())}
            placeholder="SV-20260622-HUUQ"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none"
          />
          <button type="submit" className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800">
            Open Booking
          </button>
        </form>
      </div>
    </div>
  );
}
