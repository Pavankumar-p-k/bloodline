"use client"
import React, { useState } from 'react'
import Input from './Input'
import Button from './Button'
import { hospitalApi } from '../lib/api'
import { useToast } from './ToastContext'

export default function InventoryEditor({ onSaved }: { onSaved?: (item: any) => void }) {
  const [open, setOpen] = useState(false)
  const [bloodGroup, setBloodGroup] = useState('O+')
  const [units, setUnits] = useState(1)
  const [expiry, setExpiry] = useState('')
  const toast = useToast()

  const save = async () => {
    try {
      const res = await hospitalApi.inventory.create({ bloodGroup, units, expiry })
      toast.push({
        title: 'Saved', description: 'Inventory updated', type: 'success',
        id: 'inventory-updated'
      })
      onSaved && onSaved(res)
      setOpen(false)
    } catch (e) {
      toast.push({
        title: 'Error', description: 'Failed to save', type: 'error',
        id: 'inventory-save-error'
      })
    }
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Add / Update Inventory</Button>

  return (
    <div className="p-4 border rounded bg-white">
      <div className="space-y-2">
        <label className="block">
          <div className="text-sm mb-1">Blood group</div>
          <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className="border rounded px-3 py-2 w-full">
            <option>O+</option>
            <option>O-</option>
            <option>A+</option>
            <option>A-</option>
            <option>B+</option>
            <option>B-</option>
            <option>AB+</option>
            <option>AB-</option>
          </select>
        </label>
        <Input label="Units" type="number" value={units} onChange={(e) => setUnits(Number(e.target.value))} />
        <Input label="Expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        <div className="flex gap-2">
          <Button onClick={save}>Save</Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
