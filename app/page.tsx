'use client';

import { useState, useRef, useCallback } from 'react';
import { ProcessingResult } from '@/types';
import { SAMPLE_TRANSCRIPTS } from '@/lib/samples';

/* ── Helper Components ──────────────────────────────────────────────── */

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
      {copied ? '✓ Copied' : label}
    </button>
  );
}

function ConfidenceMeter({ score, level }: { score: number; level: string }) {
  return (
    <div className="confidence-meter">
      <span>Confidence</span>
      <div className="confidence-track">
        <div
          className={`confidence-fill confidence-${level}`}
          style={{ width: `${Math.round(score * 100)}%` }}
        />
      </div>
      <span>{Math.round(score * 100)}%</span>
    </div>
  );
}

function ActionItemCard({ item, index }: { item: ProcessingResult['actionItems'][0]; index: number }) {
  return (
    <div className={`action-card priority-${item.priority} ${item.escalated ? 'escalated' : ''}`}>
      <div className="action-header">
        <span className="action-description">
          <span style={{ color: 'var(--text-muted)', marginRight: 10, fontSize: 13 }}>#{index + 1}</span>
          {item.description}
        </span>
      </div>
      <div className="action-meta">
        <span className={`tag tag-priority-${item.priority}`}>
          {{ critical: '🔴', high: '🟠', medium: '🟡', low: '⚪' }[item.priority]} {item.priority.toUpperCase()}
        </span>
        {item.owner
          ? <span className="tag tag-owner">👤 {item.owner}</span>
          : <span className="tag tag-escalated">⚠ No owner</span>
        }
        {item.deadline && <span className="tag tag-deadline">📅 {item.deadline}</span>}
        {item.escalated
          ? <span className="tag tag-escalated">🚩 Review needed</span>
          : <span className="tag tag-success">✓ Auto-processed</span>
        }
      </div>
      <ConfidenceMeter score={item.confidence} level={item.confidenceLevel} />
      {item.escalationReasons.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--warning)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {item.escalationReasons.map((r) => {
            const labels: Record<string, string> = {
              no_owner: 'Unassigned owner',
              low_confidence: 'Low confidence extract',
              conflict_detected: 'Conflict detected',
              ambiguous_deadline: 'Unclear deadline',
              critical_urgency: 'Critical urgency',
              unclear_decision: 'Decision unclear',
            };
            return <span key={r} style={{ background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 4 }}>{labels[r] || r}</span>;
          })}
        </div>
      )}
      {item.notes && (
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          💬 {item.notes}
        </div>
      )}
    </div>
  );
}

function DecisionCard({ decision, index }: { decision: ProcessingResult['decisions'][0]; index: number }) {
  return (
    <div className={`decision-card ${decision.escalated ? 'escalated' : ''}`}>
      <div className="decision-icon">
        {decision.escalated ? '⚡' : '✅'}
      </div>
      <div className="decision-body">
        <div className="decision-text">{decision.description}</div>
        <div className="decision-meta" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
          {decision.madeBy && <span>👤 {decision.madeBy}</span>}
          {decision.escalated && (
            <span style={{ color: 'var(--danger)' }}>
              🚩 {decision.escalationReasons.map((r) => ({
                no_owner: 'No owner assigned',
                low_confidence: 'Low confidence',
                conflict_detected: 'Conflict with another decision',
                ambiguous_deadline: 'Unclear deadline',
                critical_urgency: 'Critical urgency',
                unclear_decision: 'Decision maker unclear',
              } as Record<string, string>)[r] || r).join(', ')}
            </span>
          )}
        </div>
        <ConfidenceMeter score={decision.confidence} level={decision.confidenceLevel} />
      </div>
    </div>
  );
}

function QuestionCard({ question, index }: { question: ProcessingResult['unresolvedQuestions'][0]; index: number }) {
  return (
    <div className="question-card">
      <div className="question-number">{index + 1}</div>
      <div style={{ flex: 1 }}>
        <div className="question-text">{question.question}</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {question.raisedBy && (
            <span className="tag tag-owner" style={{ fontSize: 11 }}>👤 {question.raisedBy}</span>
          )}
          <span className={`tag tag-priority-${question.urgency}`} style={{ fontSize: 11 }}>
            {question.urgency.toUpperCase()}
          </span>
          {question.needsEscalation && (
            <span className="tag tag-escalated" style={{ fontSize: 11 }}>🚩 Escalate</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────── */

type Tab = 'summary' | 'actions' | 'decisions' | 'questions' | 'slack' | 'email';

export default function Home() {
  const [transcript, setTranscript] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcess = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, meetingContext: context }),
      });
      const data = await res.json();
      if (!data.success && data.error) {
        setError(data.error);
      } else {
        setResult(data);
        setActiveTab('summary');
      }
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setTranscript(e.target?.result as string || '');
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/plain') handleFileRead(file);
  }, []);

  const handleReset = () => {
    setResult(null);
    setError(null);
    setTranscript('');
    setContext('');
  };

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  const escalatedActions = result?.actionItems.filter((a) => a.escalated).length || 0;
  const escalatedDecisions = result?.decisions.filter((d) => d.escalated).length || 0;
  const totalEscalations = escalatedActions + escalatedDecisions + (result?.unresolvedQuestions.filter((q) => q.needsEscalation).length || 0);

  return (
    <>
      {/* ── Header ── */}
      <header className="header">
        <div className="container">
          <div className="header-inner">
            <div className="logo">
              <div className="logo-icon">🧠</div>
              <div>
                <div className="logo-text">MeetingMind</div>
                <div className="logo-sub">AI Workflow Agent</div>
              </div>
            </div>
            <span className="badge badge-ai">⚡ Powered by Groq · LLaMA 3.3 70B</span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: '0 0 60px' }}>
        <div className="container">

          {/* ── Hero ── */}
          {!result && !loading && (
            <section className="hero">
              <div className="hero-eyebrow">
                <span>✦</span>
                <span>Agentic Workflow Automation</span>
              </div>
              <h1 className="hero-title">
                Turn Messy Meetings Into<br />
                <span>Structured Action</span>
              </h1>
              <p className="hero-subtitle">
                Paste any meeting transcript — even with crosstalk, missing speakers, or garbled audio.
                Our AI agent extracts decisions, action items, and flags what needs human review.
              </p>
              <div className="hero-stats">
                <div className="stat">
                  <div className="stat-value">80%</div>
                  <div className="stat-label">Auto-processed</div>
                </div>
                <div className="stat">
                  <div className="stat-value">&lt;10s</div>
                  <div className="stat-label">Processing time</div>
                </div>
                <div className="stat">
                  <div className="stat-value">7</div>
                  <div className="stat-label">Agent steps</div>
                </div>
                <div className="stat">
                  <div className="stat-value">∞</div>
                  <div className="stat-label">Transcript formats</div>
                </div>
              </div>
            </section>
          )}

          {/* ── Input Card ── */}
          {!result && !loading && (
            <div className="glass-card input-section">
              <div className="section-label">Upload or Paste Transcript</div>

              {/* Drop Zone */}
              <div
                className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="drop-icon">📄</span>
                <p className="drop-text">Drop a .txt transcript file here</p>
                <p className="drop-hint">Supports any format — speaker labels, raw text, messy audio transcripts</p>
                <button className="drop-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  Browse file
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleFileRead(e.target.files[0])}
                />
              </div>

              <div className="divider">or paste directly</div>

              {/* Textarea */}
              <textarea
                id="transcript-input"
                className="transcript-textarea"
                placeholder={`Paste your meeting transcript here...\n\nExample:\nSarah: Let's kick off. Today's agenda...\nMarcus: Before we start, the Jenkins pipeline...\n\n(Speaker labels optional — AI works either way)`}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={12}
              />

              {wordCount > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  {wordCount} words
                  {wordCount < 50 && <span style={{ color: 'var(--warning)', marginLeft: 8 }}>⚠ Min. 50 words recommended</span>}
                </div>
              )}

              {/* Sample Transcripts */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Try a sample:</div>
                <div className="sample-buttons">
                  {Object.entries(SAMPLE_TRANSCRIPTS).map(([name, text]) => (
                    <button
                      key={name}
                      className="sample-btn"
                      onClick={() => setTranscript(text)}
                    >
                      {name === 'Product Sprint' ? '✓ Clean meeting' : name === 'Messy Standup' ? '⚡ Messy standup' : '🔴 Conflict example'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Context */}
              <div style={{ marginTop: 24 }}>
                <div className="section-label">Meeting Context (Optional)</div>
                <input
                  id="context-input"
                  className="context-input"
                  type="text"
                  placeholder="e.g. Weekly product sprint planning · Q2 engineering team · 5 participants"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
              </div>

              {/* Submit */}
              <button
                id="process-btn"
                className="submit-btn"
                onClick={handleProcess}
                disabled={!transcript.trim() || wordCount < 10}
              >
                🚀 Analyze with AI Agent
              </button>

              {/* How it works */}
              <div style={{ marginTop: 28, padding: '20px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>How the agent works</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  {[
                    { step: '1', label: 'Quality Check', desc: 'Assesses transcript readability' },
                    { step: '2', label: 'AI Extraction', desc: 'Gemini parses structure & intent' },
                    { step: '3', label: 'Triage', desc: 'Scores confidence per item' },
                    { step: '4', label: 'Escalation', desc: 'Flags items needing human review' },
                    { step: '5', label: 'Format', desc: 'Outputs Slack + Email ready' },
                  ].map((s) => (
                    <div key={s.step} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--accent-tertiary)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>{s.step}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Processing State ── */}
          {loading && (
            <div className="glass-card processing-overlay">
              <div className="processing-spinner" />
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Agent Processing...</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Running your transcript through the 7-step pipeline</p>
              <div className="processing-steps">
                {[
                  '🔍 Assessing transcript quality',
                  '🤖 Extracting with Gemini AI',
                  '⚖️ Triaging & scoring confidence',
                  '🚩 Computing escalations',
                ].map((step, i) => (
                  <div key={i} className="processing-step">
                    <span className="step-dot" />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Error State ── */}
          {error && !loading && (
            <div className="glass-card">
              <div className="error-card">
                <div className="error-icon">⚠️</div>
                <div className="error-title">Processing Failed</div>
                <div className="error-message">{error}</div>
                <button className="reset-btn" style={{ marginTop: 20 }} onClick={handleReset}>
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {result && !loading && (
            <div>
              {/* Results Header */}
              <div className="results-header">
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                    📋 {result.metadata.title}
                  </h2>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {result.metadata.date && <span>📅 {result.metadata.date}</span>}
                    {result.metadata.participants.length > 0 && (
                      <span>👥 {result.metadata.participants.map((p) => p.name).join(', ')}</span>
                    )}
                    <span>📝 {result.metadata.meetingType}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="quality-bar-wrapper">
                    <span>Quality</span>
                    <div className="quality-bar">
                      <div className="quality-fill" style={{ width: `${Math.round(result.qualityScore * 100)}%` }} />
                    </div>
                    <span style={{ fontWeight: 600, color: result.qualityScore > 0.7 ? 'var(--success)' : result.qualityScore > 0.4 ? 'var(--warning)' : 'var(--danger)' }}>
                      {Math.round(result.qualityScore * 100)}%
                    </span>
                  </div>
                  <button className="reset-btn" onClick={handleReset} id="reset-btn">↩ New Analysis</button>
                </div>
              </div>

              {/* Escalation Banner */}
              {result.escalationSummary.requiresHumanReview && (
                <div className={`escalation-banner ${result.escalationSummary.criticalEscalations > 0 ? 'escalation-critical' : ''}`}>
                  <div className="escalation-title">
                    {result.escalationSummary.criticalEscalations > 0 ? '🔴' : '⚠️'}
                    {' '}Human Review Required — {result.escalationSummary.totalEscalations} item(s) flagged
                  </div>
                  <ul className="escalation-reasons">
                    {result.escalationSummary.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Metric Cards */}
              <div className="summary-grid" style={{ marginBottom: 28 }}>
                {[
                  { value: result.actionItems.length, label: 'Action Items', color: 'var(--accent-primary)' },
                  { value: result.decisions.length, label: 'Decisions', color: 'var(--success)' },
                  { value: result.unresolvedQuestions.length, label: 'Open Questions', color: 'var(--info)' },
                  { value: totalEscalations, label: 'Needs Review', color: totalEscalations > 0 ? 'var(--warning)' : 'var(--success)' },
                  { value: `${Math.round(result.qualityScore * 100)}%`, label: 'Quality Score', color: 'var(--text-primary)' },
                ].map((m) => (
                  <div key={m.label} className="metric-card">
                    <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
                    <div className="metric-label">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="tabs">
                {([
                  { id: 'summary', label: '📋 Summary' },
                  { id: 'actions', label: '📌 Actions', count: result.actionItems.length, warn: escalatedActions },
                  { id: 'decisions', label: '✅ Decisions', count: result.decisions.length, warn: escalatedDecisions },
                  { id: 'questions', label: '❓ Questions', count: result.unresolvedQuestions.length },
                  { id: 'slack', label: '💬 Slack' },
                  { id: 'email', label: '📧 Email' },
                ] as Array<{ id: Tab; label: string; count?: number; warn?: number }>).map((tab) => (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`tab-badge ${tab.warn && tab.warn > 0 ? 'tab-badge-warn' : ''}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="glass-card">

                {/* Summary Tab */}
                {activeTab === 'summary' && (
                  <div>
                    <div className="section-label">Executive Summary</div>
                    <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: 28 }}>
                      {result.executiveSummary}
                    </p>

                    {result.keyHighlights.length > 0 && (
                      <>
                        <div className="section-label">Key Highlights</div>
                        <div className="highlights-list">
                          {result.keyHighlights.map((h, i) => (
                            <div key={i} className="highlight-item">
                              <div className="highlight-dot" />
                              {h}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {result.qualityIssues.length > 0 && (
                      <>
                        <div className="section-label" style={{ marginTop: 24 }}>Quality Issues Detected</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {result.qualityIssues.map((issue, i) => (
                            <div key={i} style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--warning)' }}>
                              ⚠️ {issue}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {result.processingNotes.length > 0 && (
                      <>
                        <div className="section-label" style={{ marginTop: 24 }}>Processing Notes</div>
                        <div className="processing-notes">
                          {result.processingNotes.map((note, i) => (
                            <div key={i} className="note-item">{note}</div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Actions Tab */}
                {activeTab === 'actions' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div className="section-label" style={{ margin: 0 }}>
                        Action Items
                      </div>
                      {escalatedActions > 0 && (
                        <span className="tag tag-escalated">🚩 {escalatedActions} need review</span>
                      )}
                    </div>
                    {result.actionItems.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No action items detected in this transcript.
                      </div>
                    ) : (
                      <div className="items-list">
                        {result.actionItems.map((item, i) => (
                          <ActionItemCard key={item.id} item={item} index={i} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Decisions Tab */}
                {activeTab === 'decisions' && (
                  <div>
                    <div className="section-label">Decisions Made</div>
                    {result.decisions.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No clear decisions detected in this transcript.
                      </div>
                    ) : (
                      <div className="items-list">
                        {result.decisions.map((d, i) => (
                          <DecisionCard key={d.id} decision={d} index={i} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Questions Tab */}
                {activeTab === 'questions' && (
                  <div>
                    <div className="section-label">Unresolved Questions</div>
                    {result.unresolvedQuestions.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No unresolved questions detected.
                      </div>
                    ) : (
                      <div className="items-list">
                        {result.unresolvedQuestions.map((q, i) => (
                          <QuestionCard key={q.id} question={q} index={i} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Slack Tab */}
                {activeTab === 'slack' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div className="section-label" style={{ margin: 0 }}>Slack Message</div>
                      <CopyButton text={result.slackMessage} label="Copy for Slack" />
                    </div>
                    <div className="code-block" style={{ position: 'relative' }}>
                      {result.slackMessage}
                    </div>
                    <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                      💡 Paste this directly into any Slack channel. Bold and italic formatting will render automatically.
                    </div>
                  </div>
                )}

                {/* Email Tab */}
                {activeTab === 'email' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div className="section-label" style={{ margin: 0 }}>Email Digest</div>
                      <CopyButton text={result.emailHtml} label="Copy HTML" />
                    </div>
                    <div className="email-preview">
                      <div className="email-toolbar">
                        <div className="email-toolbar-dots">
                          <div className="dot dot-red" />
                          <div className="dot dot-yellow" />
                          <div className="dot dot-green" />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Meeting Summary: {result.metadata.title}
                        </span>
                        <div />
                      </div>
                      <iframe
                        className="email-iframe"
                        srcDoc={result.emailHtml}
                        title="Email Preview"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="container">
          <p>
            MeetingMind — AI Meeting-to-Action Pipeline &nbsp;·&nbsp; Built with{' '}
            <a href="https://groq.com" target="_blank" rel="noopener noreferrer">Groq (LLaMA 3.3 70B)</a>
            {' '}and Next.js &nbsp;·&nbsp; Case Study Submission
          </p>
        </div>
      </footer>
    </>
  );
}
