export type Role = 'donor' | 'hospital' | 'admin'

export interface User {
  id: string
  email: string
  name?: string
  role: Role
}

export interface EmergencyRequest {
  id: string
  bloodGroup: string
  units: number
  city: string
  urgency: 'low' | 'medium' | 'high'
  status?: string
}
