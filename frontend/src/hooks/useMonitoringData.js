import { useState, useEffect, useRef } from 'react';
import { fetchSystemStats, fetchProcesses, fetchThreats } from '../services/api';

export const useMonitoringData = (refreshInterval = 2000) => {
    const [systemStats, setSystemStats] = useState(null);
    const [processes, setProcesses] = useState([]);
    const [threats, setThreats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    
    const isMounted = useRef(true);
    const isFetching = useRef(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        isMounted.current = true;
        
        const fetchData = async () => {
            if (!isMounted.current || isFetching.current) return;
            
            isFetching.current = true;
            try {
                const [sysData, procData, threatData] = await Promise.all([
                    fetchSystemStats(),
                    fetchProcesses(),
                    fetchThreats()
                ]);
                
                if (isMounted.current) {
                    setSystemStats(sysData);
                    setProcesses(procData);
                    setThreats(threatData.reverse());
                    setLastUpdated(new Date());
                    setError(null);
                }
            } catch (err) {
                console.error("Error fetching monitoring data:", err);
                if (isMounted.current) {
                    setError("Failed to connect to monitoring service. Retrying...");
                }
            } finally {
                isFetching.current = false;
                if (isMounted.current) {
                    setLoading(false);
                    timeoutRef.current = setTimeout(fetchData, refreshInterval);
                }
            }
        };

        fetchData();

        return () => {
            isMounted.current = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [refreshInterval]);

    return { systemStats, processes, threats, loading, error, lastUpdated };
};
