import axios from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/backend";

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE_URL.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return normalizedPath;
  }
  return `${API_BASE_URL}${normalizedPath}`;
}

export const api = {
  getHealth: () => axios.get(buildApiUrl("/health")),
  runDemo: () => axios.post(buildApiUrl("/api/demo/run")),
  getDemoScenario: () => axios.get(buildApiUrl("/api/demo/scenario")),
  getDemoIncidents: () => axios.get(buildApiUrl("/api/demo/incidents")),
  analyzeEvidenceIntake: (formData: FormData) =>
    axios.post(buildApiUrl("/api/evidence/intake"), formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  analyzeImageEvidence: (formData: FormData) =>
    axios.post(buildApiUrl("/api/demo/analyze-image"), formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  processBatch: (payload: unknown) => axios.post(buildApiUrl("/api/reports/process"), payload),
  getIncidents: (sessionId?: string) =>
    axios.get(buildApiUrl("/api/incidents"), {
      params: sessionId ? { session_id: sessionId } : {},
    }),
  getIncident: (id: string) => axios.get(buildApiUrl(`/api/incidents/${id}`)),
  approveIncident: (id: string) =>
    axios.patch(buildApiUrl(`/api/incidents/${id}`), { human_approved: true }),
  generateDispatch: (id: string) =>
    axios.post(buildApiUrl(`/api/incidents/${id}/dispatch-message`)),
  getAMDMetrics: () => axios.get(buildApiUrl("/api/amd/performance")),
  getCrisisRoom: (sessionId: string) =>
    axios.get(buildApiUrl(`/api/crisis-room/${sessionId}`)),
};
