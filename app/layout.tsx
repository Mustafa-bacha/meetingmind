import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MeetingMind — AI Meeting-to-Action Pipeline',
  description:
    'Transform raw, messy meeting transcripts into structured decisions, action items, and formatted Slack/email digests — automatically. AI agent with smart human escalation.',
  keywords: [
    'meeting transcript',
    'AI agent',
    'action items',
    'workflow automation',
    'meeting summary',
    'productivity',
    'Gemini AI',
  ],
  openGraph: {
    title: 'MeetingMind — AI Meeting-to-Action Pipeline',
    description: 'Stop wasting hours reviewing meeting transcripts. Let AI do it.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <div className="layout">{children}</div>
      </body>
    </html>
  );
}
