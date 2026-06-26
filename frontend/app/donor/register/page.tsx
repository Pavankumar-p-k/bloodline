"use client"
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../context/AuthContext'
import Input from '../../../components/Input'
import Button from '../../../components/Button'
import { supabase } from '../../../lib/supabaseClient'

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  blood_group: z.string().optional(),
  city: z.string().optional(),
  age: z.number({ invalid_type_error: "Age must be a number" }).int().min(0).optional(),
})

export default function DonorRegisterPage() {
  const router = useRouter()
  const { signup } = useAuth()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values: any) => {
    try {
      const role = await signup(values.email, values.password, 'donor')
      if (role !== 'donor') {
        throw new Error('Signup failed: unexpected role')
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({
            name: values.name,
            phone: values.phone || null,
            blood_group: values.blood_group || null,
            city: values.city || null,
            age: values.age || null,
          })
          .eq("id", user.id)
        if (profileErr) console.warn("Profile update warning:", profileErr)
      }
      router.push("/donor/dashboard")
    } catch (err: any) {
      alert(err?.message || 'Registration failed')
    }
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Register as Donor</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input label="Full name" {...register('name')} />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
        </div>
        <div>
          <Input label="Email" type="email" {...register('email')} />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>}
        </div>
        <div>
          <Input label="Password" type="password" {...register('password')} />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>}
        </div>
        <Input label="Phone" {...register('phone')} />
        <Input label="Blood group" {...register('blood_group')} />
        <Input label="City" {...register('city')} />
        <div>
          <Input label="Age" type="number" {...register('age', { valueAsNumber: true })} />
          {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age.message as string}</p>}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Registering..." : "Register"}
        </Button>
      </form>
    </div>
  )
}
