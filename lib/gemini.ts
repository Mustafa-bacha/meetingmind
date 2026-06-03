import Groq from 'groq-sdk';

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');
  return new Groq({ apiKey });
}

export const EXTRACTION_PROMPT = (transcript: string, context?: string) => `
You are an expert meeting analyst AI. Your job is to carefully parse a meeting transcript and extract structured information.

${context ? `Meeting Context: ${context}\n` : ''}

TRANSCRIPT:
"""
${transcript}
"""

Extract and return a JSON object with EXACTLY this structure (no extra text, just the JSON):
{
  "metadata": {
    "title": "string - inferred meeting title",
    "date": "string or null - date mentioned in transcript",
    "duration": "string or null - duration if mentioned",
    "participants": [{"name": "string", "role": "string or null"}],
    "meetingType": "string - e.g. standup, planning, retrospective, review, all-hands, 1:1, other"
  },
  "executiveSummary": "string - 2-3 sentence summary of the meeting",
  "keyHighlights": ["string array - top 3-5 most important points"],
  "actionItems": [
    {
      "id": "action-1",
      "description": "string - clear, specific action",
      "owner": "string or null - person responsible (null if unclear)",
      "deadline": "string or null - due date or timeframe",
      "priority": "critical|high|medium|low",
      "confidence": 0.85,
      "notes": "string or null - any relevant context"
    }
  ],
  "decisions": [
    {
      "id": "decision-1",
      "description": "string - the decision made",
      "madeBy": "string or null - who made/approved it",
      "confidence": 0.9
    }
  ],
  "unresolvedQuestions": [
    {
      "id": "question-1",
      "question": "string - the open question",
      "raisedBy": "string or null",
      "urgency": "critical|high|medium|low",
      "needsEscalation": false
    }
  ]
}

RULES:
- confidence scores: 1.0 = crystal clear, 0.0 = very uncertain. Be realistic.
- owner should be null (not "unknown") if truly unclear
- Extract only information present in the transcript - do not invent details
- If a decision seems to contradict another, note it in the description
- priority: critical=must be done today, high=this week, medium=this month, low=someday
- Return ONLY valid JSON, absolutely no markdown, no code fences, no extra text
`;

export async function extractMeetingData(transcript: string, context?: string) {
  const client = getGroqClient();
  const prompt = EXTRACTION_PROMPT(transcript, context);

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are a precise meeting analyst. Always respond with valid JSON only. No markdown, no explanation, no code fences — just raw JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.2,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });

  const text = completion.choices[0]?.message?.content || '{}';
  return JSON.parse(text);
}
