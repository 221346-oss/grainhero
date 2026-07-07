import { useEffect, useState, useRef, useCallback } from "react"
import { api } from "@/lib/api"

export interface FirebaseSensorData {
    temperature: number | null
    humidity: number | null
    tvoc_ppb: number | null
    lastUpdated: Date | null
}

const DEFAULT: FirebaseSensorData = {
    temperature: null,
    humidity: null,
    tvoc_ppb: null,
    lastUpdated: null,
}

/** Polling interval in milliseconds (3 seconds for near-real-time) */
const POLL_INTERVAL = 3000

/**
 * Hook that polls the backend for live Firebase sensor readings.
 * The backend uses firebase-admin (service account) to read from
 * Firebase Realtime Database, so no client-side Firebase auth is needed.
 */
export function useFirebaseSensorData(): FirebaseSensorData & { connected: boolean } {
    const [data, setData] = useState<FirebaseSensorData>(DEFAULT)
    const [connected, setConnected] = useState(false)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const fetchData = useCallback(async () => {
        try {
            const res = await api.get<{
                success: boolean; devices: Record<string, {
                    temperature: number | null
                    humidity: number | null
                    tvoc_ppb: number | null
                    timestamp: string | null
                }>
            }>("/api/firebase/live-sensors")

            if (res.ok && res.data?.success && res.data.devices) {
                const devices = res.data.devices
                const deviceIds = Object.keys(devices)

                if (deviceIds.length > 0) {
                    // Use the first device's data (user confirmed single silo/device)
                    const firstDevice = devices[deviceIds[0]]
                    setData({
                        temperature: firstDevice.temperature,
                        humidity: firstDevice.humidity,
                        tvoc_ppb: firstDevice.tvoc_ppb,
                        lastUpdated: new Date(),
                    })
                    setConnected(true)
                    return
                }
            }
            // No data or error
            setConnected(false)
        } catch {
            setConnected(false)
        }
    }, [])

    useEffect(() => {
        // Initial fetch
        fetchData()

        // Set up polling
        timerRef.current = setInterval(fetchData, POLL_INTERVAL)

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
        }
    }, [fetchData])

    return { ...data, connected }
}
