import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';

export const fetchSystemStats = async () => {
    const response = await axios.get(`${API_BASE_URL}/system`);
    return response.data;
};

export const fetchProcesses = async () => {
    const response = await axios.get(`${API_BASE_URL}/processes`);
    return response.data;
};

export const fetchThreats = async () => {
    const response = await axios.get(`${API_BASE_URL}/threats`);
    return response.data;
};

export const fetchConnections = async (signal) => {
    const response = await axios.get(`${API_BASE_URL}/connections`, { signal, timeout: 10000 });
    return response.data;
};
