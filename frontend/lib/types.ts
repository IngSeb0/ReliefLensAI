export type Priority = "P0" | "P1" | "P2" | "P3";
export type Severity = "low" | "medium" | "high" | "critical";
export type LocationSource = "browser_geolocation" | "map_click" | "image_exif" | "text_location" | "unknown";

export type IncidentStatus = "new" | "acknowledged" | "in_progress" | "resolved";
export type AdminIncidentStatus = "received" | "new" | "triaged" | "in_review" | "dispatched" | "resolved" | "rejected";

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface EvidenceItem {
  id: string;
  report_id?: string;
  modality: "text" | "image" | "audio" | "csv" | "location" | "video";
  description: string;
  file_path?: string | null;
  timestamp?: string;
}

export interface ResourceRecommendation {
  id: string;
  incident_id: string;
  resource_type: string;
  description: string;
  quantity?: number | null;
  urgency: string;
  rationale: string;
}

export interface DispatchMessage {
  id: string;
  incident_id: string;
  channel: string;
  message: string;
  brigade_target?: string | null;
  created_at?: string;
  approved?: boolean;
}

export interface Incident {
  id: string;
  session_id?: string;
  title: string;
  description: string;
  priority: Priority;
  status: IncidentStatus;
  signal_ids?: string[];
  evidence: EvidenceItem[];
  location?: string | null;
  coordinates?: Coordinates | null;
  affected_people?: number | null;
  confidence: number;
  created_at: string;
  updated_at?: string;
  human_approved: boolean;
  notes?: string | null;
}

export interface AMDPerformanceMetric {
  timestamp?: string;
  gpu_utilization: number;
  memory_used_gb: number;
  memory_total_gb: number;
  tokens_per_second: number;
  requests_processed: number;
  avg_latency_ms: number;
  model_name: string;
  rocm_version?: string | null;
  power_watts?: number | null;
}

export interface CrisisRoomSummary {
  session_id: string;
  scenario_name: string;
  total_reports: number;
  total_signals: number;
  total_incidents: number;
  incidents_by_priority: Record<string, number>;
  critical_incidents: Incident[];
  resource_recommendations: ResourceRecommendation[];
  dispatch_messages: DispatchMessage[];
  amd_metrics?: AMDPerformanceMetric | null;
  processing_time_seconds: number;
  created_at: string;
  status: string;
}

export interface EvidenceLocation {
  lat: number | null;
  lng: number | null;
  label: string;
  source: LocationSource;
  confidence: number;
}

export interface EvidencePayload {
  image: {
    filename: string | null;
    content_type: string | null;
    size_bytes: number | null;
    exif_gps_found: boolean;
  };
  audio: {
    filename: string | null;
    content_type: string | null;
    size_bytes: number | null;
    transcript: string | null;
    status: string | null;
  };
  text: {
    report_text: string;
    location_text: string;
  };
}

export interface DemoIncident {
  incident_id: string;
  tracking_code?: string;
  status?: AdminIncidentStatus;
  reviewed?: boolean;
  admin_notes?: string;
  assigned_team?: string;
  incident_type: string;
  title: string;
  summary: string;
  severity: Severity;
  priority: Priority;
  location: EvidenceLocation;
  evidence: EvidencePayload;
  evidence_findings: string[];
  recommended_resources: string[];
  confidence: number;
  human_review_required: boolean;
  safety_note: string;
  updated_at?: string;
  created_at?: string;
  evidence_count?: number;
}

export type ImageAnalysisResponse = DemoIncident;

export interface AdminLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AdminMeResponse {
  username: string;
  role: string;
}

export interface AdminTelemetryResponse {
  health: string;
  demo_mode: boolean;
  app_env: string;
  amd_metrics?: AMDPerformanceMetric | null;
  rocm_status?: string | null;
}
