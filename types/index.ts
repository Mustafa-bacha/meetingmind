export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type EscalationReason =
  | 'no_owner'
  | 'low_confidence'
  | 'conflict_detected'
  | 'ambiguous_deadline'
  | 'critical_urgency'
  | 'unclear_decision';

export interface ActionItem {
  id: string;
  description: string;
  owner: string | null;
  deadline: string | null;
  priority: Priority;
  confidence: number; // 0-1
  confidenceLevel: ConfidenceLevel;
  escalated: boolean;
  escalationReasons: EscalationReason[];
  notes?: string;
}

export interface Decision {
  id: string;
  description: string;
  madeBy: string | null;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  conflictsWith?: string; // id of conflicting decision
  escalated: boolean;
  escalationReasons: EscalationReason[];
}

export interface UnresolvedQuestion {
  id: string;
  question: string;
  raisedBy: string | null;
  urgency: Priority;
  needsEscalation: boolean;
}

export interface Participant {
  name: string;
  role?: string;
}

export interface MeetingMetadata {
  title: string;
  date: string | null;
  duration: string | null;
  participants: Participant[];
  meetingType: string;
}

export interface EscalationSummary {
  totalEscalations: number;
  criticalEscalations: number;
  reasons: string[];
  requiresHumanReview: boolean;
}

export interface ProcessingResult {
  success: boolean;
  qualityScore: number; // 0-1
  qualityIssues: string[];
  metadata: MeetingMetadata;
  executiveSummary: string;
  keyHighlights: string[];
  actionItems: ActionItem[];
  decisions: Decision[];
  unresolvedQuestions: UnresolvedQuestion[];
  escalationSummary: EscalationSummary;
  slackMessage: string;
  emailHtml: string;
  processingNotes: string[];
  error?: string;
}

export interface ProcessRequest {
  transcript: string;
  meetingContext?: string;
}
