import axios from 'axios'

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

/* ================= AUTH ================= */

export const authApi = {
  signup: (data: {
    email: string
    password: string
    role: string
  }) => api.post('/api/auth/signup', data),

  login: (data: {
    email: string
    password: string
  }) => api.post('/api/auth/login', data)
}

/* ================= DONOR ================= */

export const donorApi = {
  register: (data: {
    name: string
    phone: string
    blood_group: string
    city: string
    age: number
  }) => api.post('/api/donor/register', data),

  profile: () => api.get('/api/donor/profile')
}

/* ================= EMERGENCY ================= */

export const emergencyApi = {
  create: (data: any) => api.post('/api/emergency', data),
  list: () => api.get('/api/emergency')
}

/* ================= HOSPITAL ================= */

export const hospitalApi = {
  profile: () => api.get('/api/hospital/profile'),

  emergencies: () => api.get('/api/hospital/emergencies'),

  createEmergency: (data: {
    blood_group: string
    units_required: number
    city: string
    urgency_level: string
  }) => api.post('/api/emergency', data),

  fulfill: (data: { requestId: string }) =>
    api.patch('/api/emergency/fulfill', data),

  inventory: {
    list: () => api.get('/api/hospital/inventory'),
    create: (data: any) => api.post('/api/hospital/inventory', data),
    update: (id: string, data: any) =>
      api.put(`/api/hospital/inventory/${id}`, data),
    remove: (id: string) =>
      api.delete(`/api/hospital/inventory/${id}`)
  }
}