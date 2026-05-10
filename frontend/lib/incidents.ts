import type {
  AdminIncidentStatus,
  DemoIncident,
  EvidenceLocation,
  Priority,
  Severity,
} from "@/lib/types";

const VALID_PRIORITIES = new Set<Priority>(["P0", "P1", "P2", "P3"]);
const VALID_SEVERITIES = new Set<Severity>(["low", "medium", "high", "critical"]);
const VALID_STATUSES = new Set<AdminIncidentStatus>([
  "received",
  "new",
  "triaged",
  "in_review",
  "dispatched",
  "resolved",
  "rejected",
]);

type LegacyCoordinates = {
  lat?: number | null;
  lng?: number | null;
  lon?: number | null;
} | null;

type RawIncident = {
  incident_id?: string;
  id?: string;
  tracking_code?: string;
  status?: string;
  reviewed?: boolean;
  admin_notes?: string | null;
  assigned_team?: string | null;
  incident_type?: string;
  title?: string;
  summary?: string;
  description?: string;
  severity?: string;
  priority?: string;
  analysis_provider?: "qwen" | "rule_based_fallback";
  life_safety_risk?: boolean;
  detected_risks?: unknown;
  evidence_summary?: string;
  analysis_admin_notes?: string | null;
  location?: unknown;
  coordinates?: LegacyCoordinates;
  evidence?: unknown;
  evidence_findings?: unknown;
  recommended_resources?: unknown;
  confidence?: number;
  human_review_required?: boolean;
  safety_note?: string;
  updated_at?: string;
  created_at?: string;
  evidence_count?: number;
};

function normalizePriority(value: string | undefined): Priority {
  return VALID_PRIORITIES.has(value as Priority) ? (value as Priority) : "P2";
}

function normalizeSeverity(value: string | undefined, priority: Priority): Severity {
  if (VALID_SEVERITIES.has(value as Severity)) {
    return value as Severity;
  }
  if (priority === "P0") return "critical";
  if (priority === "P1") return "high";
  return "medium";
}

function normalizeStatus(value: string | undefined): AdminIncidentStatus {
  return VALID_STATUSES.has(value as AdminIncidentStatus)
    ? (value as AdminIncidentStatus)
    : "received";
}

function normalizeLocation(location: unknown, coordinates: LegacyCoordinates): EvidenceLocation {
  const coordsLat = coordinates?.lat ?? null;
  const coordsLng = coordinates?.lng ?? coordinates?.lon ?? null;

  if (location && typeof location === "object") {
    const candidate = location as Partial<EvidenceLocation>;
    return {
      lat: typeof candidate.lat === "number" ? candidate.lat : coordsLat,
      lng: typeof candidate.lng === "number" ? candidate.lng : coordsLng,
      label:
        typeof candidate.label === "string" && candidate.label.trim()
          ? candidate.label
          : "Location requires human review",
      source:
        candidate.source === "browser_geolocation" ||
        candidate.source === "map_click" ||
        candidate.source === "image_exif" ||
        candidate.source === "text_location" ||
        candidate.source === "unknown"
          ? candidate.source
          : "unknown",
      confidence: typeof candidate.confidence === "number" ? candidate.confidence : 0,
    };
  }

  return {
    lat: coordsLat,
    lng: coordsLng,
    label:
      typeof location === "string" && location.trim()
        ? location
        : "Location requires human review",
    source: "unknown",
    confidence: coordsLat !== null && coordsLng !== null ? 0.5 : 0,
  };
}

function normalizeEvidence(rawEvidence: unknown, summary: string): DemoIncident["evidence"] {
  if (rawEvidence && typeof rawEvidence === "object" && !Array.isArray(rawEvidence)) {
    const evidence = rawEvidence as Partial<DemoIncident["evidence"]>;
    return {
      image: {
        filename: evidence.image?.filename ?? null,
        content_type: evidence.image?.content_type ?? null,
        size_bytes: evidence.image?.size_bytes ?? null,
        exif_gps_found: evidence.image?.exif_gps_found ?? false,
        findings: evidence.image?.findings ?? null,
      },
      audio: {
        filename: evidence.audio?.filename ?? null,
        content_type: evidence.audio?.content_type ?? null,
        size_bytes: evidence.audio?.size_bytes ?? null,
        transcript: evidence.audio?.transcript ?? null,
        status: evidence.audio?.status ?? null,
      },
      text: {
        report_text: evidence.text?.report_text ?? summary,
        location_text: evidence.text?.location_text ?? "",
      },
    };
  }

  return {
    image: {
      filename: null,
      content_type: null,
      size_bytes: null,
      exif_gps_found: false,
    },
    audio: {
      filename: null,
      content_type: null,
      size_bytes: null,
      transcript: null,
      status: null,
    },
    text: {
      report_text: summary,
      location_text: "",
    },
  };
}

export function getIncidentId(
  incident: Partial<DemoIncident> & { id?: string; tracking_code?: string },
) {
  return incident.incident_id ?? incident.id ?? incident.tracking_code ?? "incident-unknown";
}

export function normalizeIncident(raw: RawIncident): DemoIncident {
  const priority = normalizePriority(raw.priority);
  const severity = normalizeSeverity(raw.severity, priority);
  const summary = raw.summary ?? raw.description ?? "No summary available.";

  return {
    incident_id: raw.incident_id ?? raw.id ?? raw.tracking_code ?? crypto.randomUUID(),
    tracking_code: raw.tracking_code,
    status: normalizeStatus(raw.status),
    reviewed: Boolean(raw.reviewed),
    admin_notes: raw.admin_notes ?? "",
    assigned_team: raw.assigned_team ?? "",
    incident_type: raw.incident_type ?? "field_report",
    title: raw.title ?? "Untitled incident",
    summary,
    severity,
    priority,
    analysis_provider:
      raw.analysis_provider === "qwen" ? "qwen" : "rule_based_fallback",
    life_safety_risk: raw.life_safety_risk ?? priority === "P0",
    detected_risks: Array.isArray(raw.detected_risks)
      ? raw.detected_risks.filter((item): item is string => typeof item === "string")
      : [],
    evidence_summary: raw.evidence_summary ?? summary,
    analysis_admin_notes: raw.analysis_admin_notes ?? "",
    location: normalizeLocation(raw.location, raw.coordinates ?? null),
    evidence: normalizeEvidence(raw.evidence, summary),
    evidence_findings: Array.isArray(raw.evidence_findings)
      ? raw.evidence_findings.filter((item): item is string => typeof item === "string")
      : [],
    recommended_resources: Array.isArray(raw.recommended_resources)
      ? raw.recommended_resources.filter((item): item is string => typeof item === "string")
      : [],
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0.5,
    human_review_required: raw.human_review_required ?? true,
    safety_note:
      raw.safety_note ?? "Decision support only. Not connected to emergency services.",
    updated_at: raw.updated_at,
    created_at: raw.created_at,
    evidence_count: raw.evidence_count,
  };
}

export function normalizeIncidents(raw: unknown): DemoIncident[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((incident) => normalizeIncident((incident ?? {}) as RawIncident));
}
