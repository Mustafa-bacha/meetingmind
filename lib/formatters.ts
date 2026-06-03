import { ActionItem, Decision, MeetingMetadata, ProcessingResult, UnresolvedQuestion } from '@/types';

export function formatSlackMessage(result: ProcessingResult): string {
  const lines: string[] = [];

  // Header
  lines.push(`*📋 Meeting Summary: ${result.metadata.title}*`);
  if (result.metadata.date) lines.push(`_${result.metadata.date}_`);
  if (result.metadata.participants.length > 0) {
    lines.push(`👥 Participants: ${result.metadata.participants.map((p) => p.name).join(', ')}`);
  }
  lines.push('');

  // Executive Summary
  lines.push('*🗝️ Executive Summary*');
  lines.push(result.executiveSummary);
  lines.push('');

  // Escalation Alert
  if (result.escalationSummary.requiresHumanReview) {
    lines.push('⚠️ *HUMAN REVIEW REQUIRED*');
    result.escalationSummary.reasons.forEach((r) => lines.push(`  • ${r}`));
    lines.push('');
  }

  // Decisions
  const decisions = result.decisions;
  if (decisions.length > 0) {
    lines.push('*✅ Decisions Made*');
    decisions.forEach((d, i) => {
      const flag = d.escalated ? ' 🚩' : '';
      lines.push(`${i + 1}. ${d.description}${flag}`);
      if (d.madeBy) lines.push(`   _Decision by: ${d.madeBy}_`);
    });
    lines.push('');
  }

  // Action Items
  const actions = result.actionItems;
  if (actions.length > 0) {
    lines.push('*📌 Action Items*');
    actions.forEach((a, i) => {
      const priorityEmoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '⚪' }[a.priority];
      const ownerStr = a.owner ? `@${a.owner}` : '⚠️ _No owner assigned_';
      const deadlineStr = a.deadline ? ` | Due: *${a.deadline}*` : '';
      const escalationFlag = a.escalated ? ' 🚩' : '';
      lines.push(`${i + 1}. ${priorityEmoji} ${a.description}${escalationFlag}`);
      lines.push(`   Owner: ${ownerStr}${deadlineStr}`);
    });
    lines.push('');
  }

  // Unresolved Questions
  const questions = result.unresolvedQuestions;
  if (questions.length > 0) {
    lines.push('*❓ Unresolved Questions*');
    questions.forEach((q, i) => {
      const urgencyFlag = q.urgency === 'critical' || q.urgency === 'high' ? ' ⚠️' : '';
      lines.push(`${i + 1}. ${q.question}${urgencyFlag}`);
      if (q.raisedBy) lines.push(`   _Raised by: ${q.raisedBy}_`);
    });
  }

  return lines.join('\n');
}

export function formatEmailHtml(result: ProcessingResult): string {
  const priorityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#6b7280',
  };

  const confidenceColors: Record<string, string> = {
    high: '#22c55e',
    medium: '#f59e0b',
    low: '#ef4444',
  };

  const decisionsHtml = result.decisions.length > 0
    ? `
    <h2 style="color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">✅ Decisions Made</h2>
    <ul style="padding-left:20px;">
      ${result.decisions.map((d) => `
        <li style="margin-bottom:12px;">
          <strong>${d.description}</strong>
          ${d.madeBy ? `<br/><span style="color:#64748b;font-size:13px;">Decision by: ${d.madeBy}</span>` : ''}
          ${d.escalated ? `<br/><span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:12px;">🚩 Review Required</span>` : ''}
        </li>
      `).join('')}
    </ul>`
    : '';

  const actionsHtml = result.actionItems.length > 0
    ? `
    <h2 style="color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">📌 Action Items</h2>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:10px;text-align:left;border:1px solid #e2e8f0;">#</th>
          <th style="padding:10px;text-align:left;border:1px solid #e2e8f0;">Action</th>
          <th style="padding:10px;text-align:left;border:1px solid #e2e8f0;">Owner</th>
          <th style="padding:10px;text-align:left;border:1px solid #e2e8f0;">Deadline</th>
          <th style="padding:10px;text-align:left;border:1px solid #e2e8f0;">Priority</th>
          <th style="padding:10px;text-align:left;border:1px solid #e2e8f0;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${result.actionItems.map((a, i) => `
          <tr style="border:1px solid #e2e8f0;">
            <td style="padding:10px;border:1px solid #e2e8f0;">${i + 1}</td>
            <td style="padding:10px;border:1px solid #e2e8f0;">${a.description}</td>
            <td style="padding:10px;border:1px solid #e2e8f0;">${a.owner || '<span style="color:#ef4444">⚠ Unassigned</span>'}</td>
            <td style="padding:10px;border:1px solid #e2e8f0;">${a.deadline || '—'}</td>
            <td style="padding:10px;border:1px solid #e2e8f0;">
              <span style="background:${priorityColors[a.priority]}20;color:${priorityColors[a.priority]};padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">
                ${a.priority.toUpperCase()}
              </span>
            </td>
            <td style="padding:10px;border:1px solid #e2e8f0;">
              ${a.escalated
                ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:12px;">🚩 Review</span>`
                : `<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:4px;font-size:12px;">✓ Auto</span>`
              }
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`
    : '';

  const questionsHtml = result.unresolvedQuestions.length > 0
    ? `
    <h2 style="color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">❓ Unresolved Questions</h2>
    <ul style="padding-left:20px;">
      ${result.unresolvedQuestions.map((q) => `
        <li style="margin-bottom:8px;">${q.question}
          ${q.raisedBy ? `<br/><span style="color:#64748b;font-size:13px;">Raised by: ${q.raisedBy}</span>` : ''}
        </li>
      `).join('')}
    </ul>`
    : '';

  const escalationBanner = result.escalationSummary.requiresHumanReview
    ? `
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;margin-bottom:24px;border-radius:4px;">
      <strong style="color:#92400e;">⚠️ Human Review Required</strong>
      <ul style="margin:8px 0 0;padding-left:20px;color:#92400e;">
        ${result.escalationSummary.reasons.map((r) => `<li>${r}</li>`).join('')}
      </ul>
    </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Meeting Summary: ${result.metadata.title}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:0 auto;padding:32px;color:#1e293b;background:#fff;">
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;border-radius:12px;margin-bottom:32px;">
    <h1 style="margin:0;color:#fff;font-size:24px;">📋 Meeting Summary</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px;">${result.metadata.title}</p>
    ${result.metadata.date ? `<p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">${result.metadata.date}</p>` : ''}
    ${result.metadata.participants.length > 0
      ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">👥 ${result.metadata.participants.map((p) => p.name).join(' · ')}</p>`
      : ''
    }
  </div>

  ${escalationBanner}

  <h2 style="color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">🗝️ Executive Summary</h2>
  <p style="line-height:1.6;color:#475569;">${result.executiveSummary}</p>

  ${decisionsHtml}
  ${actionsHtml}
  ${questionsHtml}

  <div style="margin-top:40px;padding:16px;background:#f8fafc;border-radius:8px;font-size:12px;color:#94a3b8;">
    Generated by Meeting-to-Action Pipeline AI Agent | ${new Date().toLocaleDateString()}
  </div>
</body>
</html>`;
}
