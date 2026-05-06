import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const api = {
  getHealth: () => axios.get(`${BASE_URL}/health`),
  runDemo: () => axios.post(`${BASE_URL}/api/demo/run`),
  getDemoScenario: () => axios.get(`${BASE_URL}/api/demo/scenario`),
  getIncidents: (sessionId?: string) =>
    axios.get(`${BASE_URL}/api/incidents`, {
      params: sessionId ? { session_id: sessionId } : {},
    }),
  getIncident: (id: string) => axios.get(`${BASE_URL}/api/incidents/${id}`),
  approveIncident: (id: string) =>
    axios.patch(`${BASE_URL}/api/incidents/${id}`, { human_approved: true }),
  generateDispatch: (id: string) =>
    axios.post(`${BASE_URL}/api/incidents/${id}/dispatch-message`),
  getAMDMetrics: () => axios.get(`${BASE_URL}/api/amd/performance`),
  getCrisisRoom: (sessionId: string) =>
    axios.get(`${BASE_URL}/api/crisis-room/${sessionId}`),
};
