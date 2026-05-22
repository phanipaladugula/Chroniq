import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './components/layout/DashboardLayout'
import EventTypesPage from './pages/dashboard/EventTypesPage'
import BookingsPage from './pages/dashboard/BookingsPage'
import AvailabilityPage from './pages/dashboard/AvailabilityPage'
import BookingPage from './pages/public/BookingPage'
import ConfirmationPage from './pages/public/ConfirmationPage'
import CancelPage from './pages/public/CancelPage'
import ReschedulePage from './pages/public/ReschedulePage'

function App() {
  return (
    <Routes>
      {/* Dashboard (admin) */}
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/event-types" replace />} />
        <Route path="event-types" element={<EventTypesPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="availability" element={<AvailabilityPage />} />
      </Route>

      {/* Public booking pages */}
      <Route path="/:username/:slug" element={<BookingPage />} />
      <Route path="/booking/:uid" element={<ConfirmationPage />} />
      <Route path="/booking/:uid/cancel" element={<CancelPage />} />
      <Route path="/booking/:uid/reschedule" element={<ReschedulePage />} />
    </Routes>
  )
}

export default App
