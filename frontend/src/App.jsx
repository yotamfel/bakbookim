import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import ReturnList from './pages/ReturnList'
import NewList from './pages/NewList'
import RequestForm from './pages/RequestForm'
import Login from './pages/admin/Login'
import AdminLayout from './pages/admin/AdminLayout'
import RequestsTable from './pages/admin/RequestsTable'
import ClustersManager from './pages/admin/ClustersManager'

function PublicHeader() {
  const linkClass = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-white text-navy shadow-sm' : 'text-white/80 hover:bg-white/10 hover:text-white'
    }`

  return (
    <header className="bg-gradient-to-l from-navy via-navy to-brand-dark shadow-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <span className="font-heading text-xl font-bold text-white">bakbookim — בקשות קהילה</span>
        <nav className="flex gap-2">
          <NavLink to="/return" className={linkClass}>
            התגעגענו אליהם
          </NavLink>
          <NavLink to="/new" className={linkClass}>
            בא לנו לנסות
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

function PublicFooter() {
  return (
    <footer className="mx-auto max-w-3xl px-4 py-6 text-center">
      <Link to="/admin/login" className="text-xs text-bakfg/30 transition-colors hover:text-bakfg/60">
        ניהול
      </Link>
    </footer>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="requests" replace />} />
        <Route path="requests" element={<RequestsTable />} />
        <Route path="clusters" element={<ClustersManager />} />
      </Route>

      <Route
        path="*"
        element={
          <>
            <PublicHeader />
            <Routes>
              <Route path="/" element={<Navigate to="/return" replace />} />
              <Route path="/return" element={<ReturnList />} />
              <Route path="/new" element={<NewList />} />
              <Route path="/request/:requestType" element={<RequestForm />} />
            </Routes>
            <PublicFooter />
          </>
        }
      />
    </Routes>
  )
}
