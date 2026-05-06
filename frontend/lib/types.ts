export type Priority = "P0" | "P1" | "P2" | "P3";

export type IncidentStatus =
  | "new"
  | "acknowledged"
  | "in_progress"
  | "resolved"
  | "cancelled";

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface EvidenceItem {
  id: string;
  modality: "text" | "image" | "audio" | "csv" | "video";
  description: string;
  raw_content?: string;
  confidence?: number;
  timestamp?: string;
}

export interface ResourceRecommendation {
  resource_type: string;
  quantity: number;
  urgency: string;
  notes?: string;
}

export interface DispatchMessage {
  message_id?: string;
  incident_id: string;
  recipient_unit: string;
  message_text: string;
  priority: Priority;
  generated_at?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: IncidentStatus;
  location: string;
  coordinates?: Coordinates;
  affected_people: number;
  confidence: number;
  evidence: EvidenceItem[];
  resource_recommendations?: ResourceRecommendation[];
  dispatch_message?: DispatchMessage;
  created_at: string;
  updated_at?: string;
  human_approved: boolean;
  operator_notes?: string;
  session_id?: string;
}

export interface AMDPerformanceMetric {
  gpu_utilization: number;
  memory_used_gb: number;
  memory_total_gb: number;
  tokens_per_second: number;
  requests_processed: number;
  avg_latency_ms: number;
  model_name?: string;
  rocm_version?: string;
  timestamp?: string;
}

export interface CrisisRoomSummary {
  session_id: string;
  total_incidents: number;
  p0_count: number;
  p1_count: number;
  p2_count: number;
  p3_count: number;
  incidents: Incident[];
  amd_metrics?: AMDPerformanceMetric;
  processing_time_ms?: number;
  created_at?: string;
  status?: string;
}
