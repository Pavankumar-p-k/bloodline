"use client"
import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }

export default function Button({ variant = 'primary', className = '', ...rest }: Props) {
  const base = 'px-4 py-2 rounded-md font-medium inline-flex items-center justify-center'
  const variants: Record<string, string> = {
    primary: 'bg-blood text-white shadow',
    ghost: 'bg-white border'
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />
}
