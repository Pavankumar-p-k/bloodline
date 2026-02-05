"use client"
import { useEffect, useState } from 'react'
import { emergency } from '../lib/api'

export default function useFetchEmergencyRequests(params?: any) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    emergency
      .listNearby(params)
      .then((res) => {
        if (mounted) setData(res || [])
      })
      .catch((err) => {
        if (mounted) setError(err)
      })
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [JSON.stringify(params)])

  return { data, loading, error }
}
