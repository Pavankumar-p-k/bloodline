export type AppRole = 'donor' | 'hospital' | 'admin'

export interface Profile {
  id: string
  email: string
  role: AppRole
  created_at?: string
  is_suspended?: boolean
}
