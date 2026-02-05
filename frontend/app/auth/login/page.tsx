"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../../context/AuthContext'
import Input from '../../../components/Input'
import Button from '../../../components/Button'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})
type Form = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: Form) => {
    try {
      const res: any = await login(values.email, values.password)
      // support multiple possible shapes from backend/context
      const accessToken = res?.accessToken ?? res?.access_token ?? null
      const role = res?.role ?? res?.user?.role ?? 'donor'

      if (accessToken) {
        try { localStorage.setItem('accessToken', accessToken) } catch (_) {}
      }
      // redirect by role
      if (role === 'admin') router.push('/admin/dashboard')
      else if (role === 'hospital') router.push('/hospital/dashboard')
      else router.push('/donor/dashboard')
    } catch (err: any) {
      const msg = err?.message ?? 'Login failed'
      // show error on form
      setError('password', { type: 'manual', message: msg })
    }
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Login</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Email" type="email" {...register('email')} />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message as string}</p>}
        <Input label="Password" type="password" {...register('password')} />
        {errors.password && <p className="text-sm text-red-600">{errors.password.message as string}</p>}
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Login'}</Button>
      </form>
    </div>
  )
}
