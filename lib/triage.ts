import {
  ActionItem,
  Decision,
  EscalationReason,
  EscalationSummary,
  ProcessingResult,
  UnresolvedQuestion,
} from '@/types';

const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.75,
  MEDIUM: 0.5,
  LOW: 0,
};

const ESCALATION_CONFIDENCE_THRESHOLD = 0.6;

export function classifyConfidence(score: number): 'high' | 'medium' | 'low' {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

export function triageActionItem(item: Omit<ActionItem, 'escalated' | 'escalationReasons' | 'confidenceLevel'>): ActionItem {
  const escalationReasons: EscalationReason[] = [];

  if (!item.owner || item.owner.trim() === '' || item.owner.toLowerCase() === 'unknown') {
    escalationReasons.push('no_owner');
  }

  if (item.confidence < ESCALATION_CONFIDENCE_THRESHOLD) {
    escalationReasons.push('low_confidence');
  }

  if (!item.deadline && item.priority === 'critical') {
    escalationReasons.push('ambiguous_deadline');
  }

  if (item.priority === 'critical') {
    escalationReasons.push('critical_urgency');
  }

  return {
    ...item,
    confidenceLevel: classifyConfidence(item.confidence),
    escalated: escalationReasons.length > 0,
    escalationReasons,
  };
}

export function triageDecision(
  item: Omit<Decision, 'escalated' | 'escalationReasons' | 'confidenceLevel'>,
  allDecisions: Array<Omit<Decision, 'escalated' | 'escalationReasons' | 'confidenceLevel'>>
): Decision {
  const escalationReasons: EscalationReason[] = [];

  if (item.confidence < ESCALATION_CONFIDENCE_THRESHOLD) {
    escalationReasons.push('low_confidence');
  }

  // Detect conflicts (look for contradictory keywords in other decisions)
  const contradictionKeywords = ['cancel', 'postpone', 'reverse', 'reject', 'not', 'don\'t', 'do not', 'against'];
  const hasConflict = allDecisions.some((other) => {
    if (other.id === item.id) return false;
    const descLower = other.description.toLowerCase();
    const itemLower = item.description.toLowerCase();
    // Check if they reference same topic but with opposing sentiment
    const itemWords = itemLower.split(' ').filter((w) => w.length > 4);
    const overlap = itemWords.filter((w) => descLower.includes(w));
    const hasOpposite = contradictionKeywords.some((kw) => descLower.includes(kw) || itemLower.includes(kw));
    return overlap.length >= 2 && hasOpposite;
  });

  if (hasConflict) {
    escalationReasons.push('conflict_detected');
  }

  if (!item.madeBy || item.madeBy.toLowerCase() === 'unknown') {
    escalationReasons.push('unclear_decision');
  }

  return {
    ...item,
    confidenceLevel: classifyConfidence(item.confidence),
    escalated: escalationReasons.length > 0,
    escalationReasons,
  };
}

export function computeEscalationSummary(
  actionItems: ActionItem[],
  decisions: Decision[],
  questions: UnresolvedQuestion[],
  qualityScore: number
): EscalationSummary {
  const allReasons: EscalationReason[] = [
    ...actionItems.flatMap((a) => a.escalationReasons),
    ...decisions.flatMap((d) => d.escalationReasons),
  ];

  const criticalEscalations =
    actionItems.filter((a) => a.priority === 'critical' && a.escalated).length +
    decisions.filter((d) => d.escalationReasons.includes('conflict_detected')).length +
    questions.filter((q) => q.urgency === 'critical').length;

  const uniqueReasons = [...new Set(allReasons)];
  const humanReadableReasons: string[] = uniqueReasons.map((r) => {
    const map: Record<EscalationReason, string> = {
      no_owner: 'Action items with no assigned owner',
      low_confidence: 'Items extracted with low confidence',
      conflict_detected: 'Conflicting decisions detected',
      ambiguous_deadline: 'Critical items with unclear deadlines',
      critical_urgency: 'Critical priority items requiring immediate attention',
      unclear_decision: 'Decisions with unclear ownership',
    };
    return map[r];
  });

  const totalEscalations =
    actionItems.filter((a) => a.escalated).length +
    decisions.filter((d) => d.escalated).length +
    questions.filter((q) => q.needsEscalation).length;

  const requiresHumanReview =
    qualityScore < 0.4 ||
    criticalEscalations > 0 ||
    uniqueReasons.includes('conflict_detected') ||
    totalEscalations > 3;

  return {
    totalEscalations,
    criticalEscalations,
    reasons: humanReadableReasons,
    requiresHumanReview,
  };
}

export function assessQuality(transcript: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 1.0;

  const words = transcript.trim().split(/\s+/);

  if (words.length < 50) {
    issues.push('Transcript is too short (fewer than 50 words)');
    score -= 0.5;
  }

  if (words.length < 20) {
    issues.push('Transcript is extremely short — unable to extract meaningful content');
    score = 0.1;
    return { score, issues };
  }

  // Check for speaker labels
  const hasSpeakers = /[A-Z][a-z]+\s*:|Speaker\s*\d+:|Person\s*\d+:/i.test(transcript);
  if (!hasSpeakers) {
    issues.push('No speaker labels detected — attribution may be inaccurate');
    score -= 0.15;
  }

  // Check for gibberish (very high ratio of non-alphabetic chars)
  const alphaRatio = (transcript.match(/[a-zA-Z]/g) || []).length / transcript.length;
  if (alphaRatio < 0.5) {
    issues.push('High proportion of non-text characters — transcript quality may be poor');
    score -= 0.3;
  }

  // Check for very repetitive content
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  const diversityRatio = uniqueWords.size / words.length;
  if (diversityRatio < 0.2 && words.length > 100) {
    issues.push('Very low vocabulary diversity — transcript may be repetitive or garbled');
    score -= 0.2;
  }

  return { score: Math.max(0, Math.min(1, score)), issues };
}

export function buildProcessingNotes(result: Partial<ProcessingResult>): string[] {
  const notes: string[] = [];

  if (result.qualityScore !== undefined && result.qualityScore < 0.7) {
    notes.push(`⚠️ Quality score: ${Math.round((result.qualityScore || 0) * 100)}% — results may be less accurate`);
  }

  const totalActions = result.actionItems?.length || 0;
  const escalatedActions = result.actionItems?.filter((a) => a.escalated).length || 0;
  if (escalatedActions > 0) {
    notes.push(`🚩 ${escalatedActions} of ${totalActions} action items require human review`);
  }

  const conflictDecisions = result.decisions?.filter((d) =>
    d.escalationReasons.includes('conflict_detected')
  ).length || 0;
  if (conflictDecisions > 0) {
    notes.push(`⚡ ${conflictDecisions} conflicting decision(s) detected — please resolve before acting`);
  }

  const criticalItems = result.actionItems?.filter((a) => a.priority === 'critical').length || 0;
  if (criticalItems > 0) {
    notes.push(`🔴 ${criticalItems} critical action item(s) detected — immediate attention required`);
  }

  return notes;
}
