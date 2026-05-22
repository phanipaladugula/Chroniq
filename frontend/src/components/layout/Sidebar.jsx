import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Link, Calendar, Clock, X, Menu } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/event-types', label: 'Event Types', icon: Link },
  { path: '/bookings', label: 'Bookings', icon: Calendar },
  { path: '/availability', label: 'Availability', icon: Clock },
]

export default function Sidebar({ open, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleNav = (path) => {
    navigate(path)
    onClose?.()
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="sidebar-mobile-overlay" onClick={onClose} />}

      <aside className={`dashboard-sidebar${open ? ' open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <div className="sidebar-logo-icon">S</div>
            <span className="sidebar-logo-text">Scalar Cal</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              className={`sidebar-nav-item${location.pathname.startsWith(path) ? ' active' : ''}`}
              onClick={() => handleNav(path)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">JD</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">John Doe</div>
              <div className="sidebar-user-email">john@example.com</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
