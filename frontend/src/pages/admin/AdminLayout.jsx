import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'

export default function AdminLayout() {
  const navigate = useNavigate()
  const token = localStorage.getItem('admin_token')

  if (!token) return <Navigate to="/admin/login" replace />

  function logout() {
    localStorage.removeItem('admin_token')
    navigate('/admin/login')
  }

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-brand text-white' : 'text-bakfg/70'}`

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between border-b border-black/10 pb-3">
        <div className="flex items-center gap-4">
          <Link to="/return" className="text-sm text-brand hover:underline">
            חזרה לאתר
          </Link>
          <div className="flex gap-2">
            <NavLink to="/admin/requests" className={linkClass}>
              בקשות
            </NavLink>
            <NavLink to="/admin/clusters" className={linkClass}>
              קלאסטרים
            </NavLink>
          </div>
        </div>
        <button onClick={logout} className="text-sm text-bakfg/60 underline">
          התנתקות
        </button>
      </div>
      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  )
}
