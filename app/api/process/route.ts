import { NextRequest, NextResponse } from 'next/server';
import { extractMeetingData } from '@/lib/gemini';
import {
  assessQuality,
  buildProcessingNotes,
  computeEscalationSummary,
  triageActionItem,
  triageDecision,
} from '@/lib/triage';
import { formatEmailHtml, formatSlackMessage } from '@/lib/formatters';
import { ActionItem, Decision, ProcessingResult, UnresolvedQuestion } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcript, meetingContext } = body;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { success: false, error: 'No transcript provided.' },
        { status: 400 }
      );
    }

    // ── Step 1: Quality Assessment ─────────────────────────────────────────
    const { score: qualityScore, issues: qualityIssues } = assessQuality(transcript);

    if (qualityScore < 0.2) {
      const errorResult: Partial<ProcessingResult> = {
        success: false,
        qualityScore,
        qualityIssues,
        error:
          'Transcript quality is too low to process. Please provide a longer, more readable transcript.',
        metadata: {
          title: 'Unable to Process',
          date: null,
          duration: null,
          participants: [],
          meetingType: 'unknown',
        },
        executiveSummary: '',
        keyHighlights: [],
        actionItems: [],
        decisions: [],
        unresolvedQuestions: [],
        escalationSummary: {
          totalEscalations: 0,
          criticalEscalations: 0,
          reasons: ['Transcript quality too low'],
          requiresHumanReview: true,
        },
        slackMessage: '',
        emailHtml: '',
        processingNotes: ['❌ Processing aborted — transcript quality below minimum threshold'],
      };
      return NextResponse.json(errorResult, { status: 422 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GROQ_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    // ── Step 2: AI Extraction ──────────────────────────────────────────────
    let rawData;
    try {
      rawData = await extractMeetingData(transcript, meetingContext);
    } catch (aiError) {
      console.error('AI extraction error:', aiError);
      return NextResponse.json(
        {
          success: false,
          error: 'AI extraction failed. The transcript may be in an unsupported format.',
        },
        { status: 500 }
      );
    }

    // ── Step 3: Triage Action Items ────────────────────────────────────────
    const rawActions: ActionItem[] = (rawData.actionItems || []).map(
      (a: ActionItem) =>
        triageActionItem({
          id: a.id || `action-${Math.random().toString(36).slice(2, 8)}`,
          description: a.description,
          owner: a.owner,
          deadline: a.deadline,
          priority: a.priority || 'medium',
          confidence: typeof a.confidence === 'number' ? a.confidence : 0.7,
          notes: a.notes,
        })
    );

    // ── Step 4: Triage Decisions ───────────────────────────────────────────
    const rawDecisionsInput = (rawData.decisions || []).map((d: Decision) => ({
      id: d.id || `decision-${Math.random().toString(36).slice(2, 8)}`,
      description: d.description,
      madeBy: d.madeBy,
      confidence: typeof d.confidence === 'number' ? d.confidence : 0.7,
    }));

    const decisions: Decision[] = rawDecisionsInput.map((d: Omit<Decision, 'escalated' | 'escalationReasons' | 'confidenceLevel'>) =>
      triageDecision(d, rawDecisionsInput)
    );

    // ── Step 5: Unresolved Questions ───────────────────────────────────────
    const unresolvedQuestions: UnresolvedQuestion[] = (rawData.unresolvedQuestions || []).map(
      (q: UnresolvedQuestion) => ({
        id: q.id || `question-${Math.random().toString(36).slice(2, 8)}`,
        question: q.question,
        raisedBy: q.raisedBy,
        urgency: q.urgency || 'medium',
        needsEscalation: q.needsEscalation ?? (q.urgency === 'critical' || q.urgency === 'high'),
      })
    );

    // ── Step 6: Escalation Summary ─────────────────────────────────────────
    const escalationSummary = computeEscalationSummary(
      rawActions,
      decisions,
      unresolvedQuestions,
      qualityScore
    );

    // ── Step 7: Format Outputs ─────────────────────────────────────────────
    const partialResult: Partial<ProcessingResult> = {
      qualityScore,
      qualityIssues,
      metadata: rawData.metadata,
      executiveSummary: rawData.executiveSummary || '',
      keyHighlights: rawData.keyHighlights || [],
      actionItems: rawActions,
      decisions,
      unresolvedQuestions,
      escalationSummary,
    };

    const slackMessage = formatSlackMessage(partialResult as ProcessingResult);
    const emailHtml = formatEmailHtml(partialResult as ProcessingResult);
    const processingNotes = buildProcessingNotes(partialResult);

    const finalResult: ProcessingResult = {
      success: true,
      qualityScore,
      qualityIssues,
      metadata: rawData.metadata,
      executiveSummary: rawData.executiveSummary || '',
      keyHighlights: rawData.keyHighlights || [],
      actionItems: rawActions,
      decisions,
      unresolvedQuestions,
      escalationSummary,
      slackMessage,
      emailHtml,
      processingNotes,
    };

    return NextResponse.json(finalResult);
  } catch (err) {
    console.error('Processing route error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
