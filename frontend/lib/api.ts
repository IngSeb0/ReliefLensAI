import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/backend";

export const api = {
  getHealth: () => axios.get(`${BASE_URL}/health`),
  runDemo: () => axios.post(`${BASE_URL}/api/demo/run`),
  getDemoScenario: () => axios.get(`${BASE_URL}/api/demo/scenario`),
  getDemoIncidents: () => axios.get(`${BASE_URL}/api/demo/incidents`),
  analyzeEvidenceIntake: (formData: FormData) =>
    axios.post(`${BASE_URL}/api/evidence/intake`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  analyzeImageEvidence: (formData: FormData) =>
    axios.post(`${BASE_URL}/api/demo/analyze-image`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  processBatch: (payload: unknown) => axios.post(`${BASE_URL}/api/reports/process`, payload),
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
