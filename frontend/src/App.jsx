import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import DashboardLayout from './components/layout/DashboardLayout'
import { EventTypesProvider } from './context/EventTypesContext'
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
      <Route path="/" element={
        <EventTypesProvider>
          <DashboardLayout />
        </EventTypesProvider>
      }>
        <Route index element={<Navigate to="/event-types" replace />} />
        <Route path="event-types" element={<EventTypesPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="availability" element={<AvailabilityPage />} />
      </Route>

      {/* Public booking pages — specific /booking/* routes MUST come before /:username/:slug */}
      <Route path="/booking/:uid/cancel" element={<CancelPage />} />
      <Route path="/booking/:uid/reschedule" element={<ReschedulePage />} />
      <Route path="/booking/:uid" element={<ConfirmationPage />} />
      <Route path="/:username/:slug" element={<BookingPage />} />
    </Routes>
  )
}

export default App
