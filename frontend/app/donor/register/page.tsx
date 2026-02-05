"use client"
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '../../../context/AuthContext'
import Input from '../../../components/Input'
import Button from '../../../components/Button'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  blood_group: z.string().optional(),
  city: z.string().optional(),
  age: z.number().int().min(0).optional(),
})

export default function DonorRegisterPage() {
  const { signup } = useAuth()
  const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values: any) => {
    try {
      await signup({ email: values.email, password: values.password, role: 'donor', name: values.name })
      // The profile fields (phone, blood_group, city, age) are sent to backend via separate donor profile endpoint.
      // For now, after signup auto-redirect happens from AuthContext. Optionally call an endpoint to save additional profile data.
      // Example:
      // await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000'}/api/donor/profile`, { method: 'POST', body: JSON.stringify({ ...values }), headers:{'Content-Type':'application/json', Authorization: `Bearer ${localStorage.getItem('bl_token')}` } })
    } catch (err) {
      alert('Registration failed')
    }
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Register as Donor</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Full name" {...register('name')} />
        <Input label="Email" type="email" {...register('email')} />
        <Input label="Password" type="password" {...register('password')} />
        <Input label="Phone" {...register('phone')} />
        <Input label="Blood group" {...register('blood_group')} />
        <Input label="City" {...register('city')} />
        <Input label="Age" type="number" {...register('age', { valueAsNumber: true })} />
        <Button type="submit">Register</Button>
      </form>
    </div>
  )
}