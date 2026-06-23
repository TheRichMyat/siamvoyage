import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App, { TourDetailPage } from './App';
import { ProtectedRoute } from './office/ProtectedRoute';
import { OfficeLayout } from './office/OfficeLayout';
import { OfficeLogin } from './office/OfficeLogin';
import { OfficeDashboard } from './office/OfficeDashboard';
import { OfficeBookingDetail } from './office/OfficeBookingDetail';
import { OfficeScan } from './office/OfficeScan';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/tour/:tourSlug" element={<TourDetailPage />} />
        <Route path="/office/login" element={<OfficeLogin />} />
        <Route
          path="/office"
          element={
            <ProtectedRoute>
              <OfficeLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OfficeDashboard />} />
          <Route path="booking/:bookingId" element={<OfficeBookingDetail />} />
          <Route path="scan" element={<OfficeScan />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
