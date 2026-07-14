const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('admin_token')
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 401) {
    localStorage.removeItem('admin_token')
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {
      // response had no JSON body
    }
    throw new Error(detail)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  getList: (requestType, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/lists/${requestType}${qs ? `?${qs}` : ''}`)
  },
  getClusterReasons: (clusterId, limit = 5) => request(`/clusters/${clusterId}/reasons?limit=${limit}`),
  submitRequests: (payload) => request('/requests', { method: 'POST', body: JSON.stringify(payload) }),
  joinExisting: (clusterId, payload) =>
    request(`/requests/join/${clusterId}`, { method: 'POST', body: JSON.stringify(payload) }),

  adminLogin: (username, password) =>
    request('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  adminListRequests: (search = '') =>
    request(`/admin/requests${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  adminUpdateRequest: (id, payload) =>
    request(`/admin/requests/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  adminDeleteRequest: (id) => request(`/admin/requests/${id}`, { method: 'DELETE' }),
  adminBulkDeleteRequests: (params) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/admin/requests/bulk?${qs}`, { method: 'DELETE' })
  },
  adminListClusters: () => request('/admin/clusters'),
  adminListClusterReasons: (clusterId) => request(`/admin/clusters/${clusterId}/reasons`),
  adminUpdateCluster: (id, payload) =>
    request(`/admin/clusters/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  adminMergeClusters: (sourceId, targetId) =>
    request('/admin/clusters/merge', {
      method: 'POST',
      body: JSON.stringify({ source_cluster_id: sourceId, target_cluster_id: targetId }),
    }),
}
