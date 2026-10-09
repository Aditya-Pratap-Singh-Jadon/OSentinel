import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

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
