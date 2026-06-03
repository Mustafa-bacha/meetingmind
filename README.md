# 🧠 MeetingMind — AI Meeting-to-Action Pipeline

> An AI agent that transforms raw, messy meeting transcripts into structured decisions, action items, and formatted Slack/email digests — with intelligent human escalation.

**Live Demo**: [Deploy your own on Vercel](#deploy)

---

## 🚀 What it does

Paste any meeting transcript (even messy, garbled, or with crosstalk) and the agent:

1. **Assesses quality** — scores transcript readability, rejects unusable input gracefully
2. **Extracts with AI** — uses Groq (LLaMA 3.3 70B) to pull decisions, actions, questions, and participants
3. **Triages each item** — assigns confidence scores (0–100%) per extracted item
4. **Escalates intelligently** — flags items needing human review (no owner, low confidence, conflicts)
5. **Formats outputs** — generates Slack-ready message and HTML email digest

---

## 🤖 Agent Escalation Logic

| Trigger | Agent Action |
|---|---|
| Transcript < 20 words | ❌ Reject with guidance |
| No speaker labels | ⚠️ Quality warning |
| Action item with no owner | 🚩 Flag for human assignment |
| Confidence < 60% | 🟡 Yellow flag — verify |
| Conflicting decisions | 🔴 Escalate — human must resolve |
| Critical priority item | 🔴 Urgent alert |
| Everything clean | ✅ Full auto-output |

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router) + Vanilla CSS (dark glassmorphism)
- **AI**: [Groq](https://groq.com) — LLaMA 3.3 70B with JSON mode
- **Deployment**: Vercel

---

## ⚡ Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/meetingmind.git
cd meetingmind
npm install
cp .env.example .env.local
# Add your GROQ_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🚢 Deploy

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Fork this repo
2. Import on [vercel.com/new](https://vercel.com/new)
3. Add environment variable:
   ```
   GROQ_API_KEY = your_groq_api_key_here
   ```
4. Click Deploy ✅

Get a free Groq API key at [console.groq.com](https://console.groq.com)

---

## 📁 Project Structure

```
├── app/
│   ├── globals.css          # Design system (dark mode, glassmorphism)
│   ├── layout.tsx           # Root layout + SEO
│   ├── page.tsx             # Main UI
│   └── api/process/
│       └── route.ts         # 7-step AI agent pipeline
├── lib/
│   ├── gemini.ts            # Groq AI client (LLaMA 3.3 70B)
│   ├── triage.ts            # Escalation rules engine
│   ├── formatters.ts        # Slack + Email formatters
│   └── samples.ts           # Demo transcripts
└── types/index.ts           # TypeScript interfaces
```

---

## 📝 Case Study

Built as a workflow automation case study demonstrating:
- Real agentic decision-making (not just text summarization)
- Graceful failure handling for messy/ambiguous input
- Human-in-the-loop escalation design
- Production-ready deployment
