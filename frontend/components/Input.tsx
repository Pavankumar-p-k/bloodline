"use client"
import React from 'react'

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string }

export default function Input({ label, className = '', ...rest }: Props) {
  return (
    <label className="block">
      {label && <div className="text-sm mb-1">{label}</div>}
      <input className={`border rounded px-3 py-2 w-full ${className}`} {...rest} />
    </label>
  )
}
