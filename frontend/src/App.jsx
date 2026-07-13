import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import ReturnList from './pages/ReturnList'
import NewList from './pages/NewList'
import RequestForm from './pages/RequestForm'
import Login from './pages/admin/Login'
import AdminLayout from './pages/admin/AdminLayout'
import RequestsTable from './pages/admin/RequestsTable'
import ClustersManager from './pages/admin/ClustersManager'

function PublicHeader() {
  const linkClass = ({ isActive }) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${isActive ? 'bg-brand text-white' : 'text-bakfg/70'}`

  return (
    <header className="border-b border-black/10 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <span className="font-heading text-xl font-bold text-navy">bakbookim — בקשות קהילה</span>
        <nav className="flex gap-2">
          <NavLink to="/return" className={linkClass}>
            בקשות לחזרה
          </NavLink>
          <NavLink to="/new" className={linkClass}>
            בקשות חדשות
          </NavLink>
        </nav>
      </div>
    </header>
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
          </>
        }
      />
    </Routes>
  )
}
