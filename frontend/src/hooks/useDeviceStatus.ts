import { useEffect, useState, useRef, useCallback } from 'react';
import { apiClient, API_BASE_URL } from '../api/client';

export interface DeviceStatus {
  percentage: number;
  weight: number;
  status: string;
  isEstimated: boolean;
  lastUpdated: string;
  isOnline: boolean;
}

const POLL_INTERVAL_MS = 45_000;
const ONLINE_THRESHOLD_MS = 20 * 60 * 1000; // 20 minutes

function checkIsOnline(timestampStr: string | null | undefined): boolean {
  if (!timestampStr) return false;
  let cleanTimestamp = timestampStr;
  if (!cleanTimestamp.endsWith('Z') && !cleanTimestamp.includes('+')) {
    cleanTimestamp += 'Z';
  }
  const timeDiff = Date.now() - new Date(cleanTimestamp).getTime();
  return timeDiff < ONLINE_THRESHOLD_MS;
}

/**
 * Hook that polls a device status endpoint and listens to
 * WebSocket updates for real-time cylinder data.
 */
export function useDeviceStatus(cylinderId: string | null): DeviceStatus {
  const [status, setStatus] = useState<DeviceStatus>({
    percentage: 0,
    weight: 0,
    status: 'NORMAL',
    isEstimated: false,
    lastUpdated: '',
    isOnline: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!cylinderId) return;
    try {
      const res = await apiClient.get(`/api/iot/cylinder/${cylinderId}/readings?limit=1`);
      if (res.data && res.data.length > 0) {
        const latest = res.data[0];
        const lastUpdated = latest.timestamp ?? new Date().toISOString();
        setStatus({
          percentage: latest.percent ?? 0,
          weight: latest.weight ?? 0,
          status: latest.status ?? 'NORMAL',
          isEstimated: latest.is_estimated ?? false,
          lastUpdated: lastUpdated,
          isOnline: checkIsOnline(lastUpdated),
        });
      }
    } catch {
      // API unavailable — mark offline but keep last known values
      setStatus(prev => ({ ...prev, isOnline: false }));
    }
  }, [cylinderId]);

  // Polling
  useEffect(() => {
    if (!cylinderId) return;
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cylinderId, fetchStatus]);

  // WebSocket for instant updates
  useEffect(() => {
    if (!cylinderId) return;
    const rawUser = localStorage.getItem('user');
    if (!rawUser) return;
    const user = JSON.parse(rawUser);
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/api/ws/${user.id}`;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'cylinder_update') {
            const lastUpdated = data.data.last_seen ?? new Date().toISOString();
            setStatus({
              percentage: data.data.percent ?? 0,
              weight: data.data.weight ?? 0,
              status: data.data.status ?? 'NORMAL',
              isEstimated: false,
              lastUpdated: lastUpdated,
              isOnline: checkIsOnline(lastUpdated),
            });
          }
        } catch { /* ignore malformed */ }
      };
      ws.onerror = () => setStatus(prev => ({ ...prev, isOnline: false }));
    } catch { /* WebSocket unavailable */ }

    return () => { if (ws) ws.close(); };
  }, [cylinderId]);

  return status;
}
