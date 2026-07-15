import { Link, Navigate, Route, Routes } from 'react-router-dom'
import ClusterListPage from './pages/ClusterListPage'
import RequestForm from './pages/RequestForm'
import Login from './pages/admin/Login'
import AdminLayout from './pages/admin/AdminLayout'
import RequestsTable from './pages/admin/RequestsTable'
import ClustersManager from './pages/admin/ClustersManager'

function PublicHeader() {
  return (
    <header className="bg-gradient-to-l from-navy via-navy to-brand-dark shadow-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <span className="font-heading text-xl font-bold text-white">bakbookim — בקשות קהילה</span>
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
              <Route path="/request" element={<RequestForm />} />
              <Route path="/request/:requestType" element={<RequestForm />} />
              <Route path="/:requestType" element={<ClusterListPage />} />
            </Routes>
            <PublicFooter />
          </>
        }
      />
    </Routes>
  )
}
