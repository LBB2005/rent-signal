'use client';

const IconDollar = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M8 1v14M5 4.5C5 3.12 6.34 2 8 2s3 1.12 3 2.5S9.66 7 8 7s-3 1.12-3 2.5S6.34 12 8 12s3-1.12 3-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const IconBuildings = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="6" width="6" height="9" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <rect x="9" y="3" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4 9h1M4 11.5h1M11 6h1M11 8.5h1M11 11h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
const IconChat = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M2 3h12v8H9l-3 3v-3H2V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M5 7h6M5 5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
const IconShield = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5L2 4v4c0 3.5 2.5 6 6 7 3.5-1 6-3.5 6-7V4L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconTransit = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M3 7h10" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="5.5" cy="9" r="1" fill="currentColor" />
    <circle cx="10.5" cy="9" r="1" fill="currentColor" />
    <path d="M5 13l1.5-2M11 13l-1.5-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
const IconPin = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M8 1C5.8 1 4 2.8 4 5c0 3.5 4 8.5 4 8.5S12 8.5 12 5c0-2.2-1.8-4-4-4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <circle cx="8" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const PROMPTS = [
  {
    icon: <IconDollar />,
    label: 'Is this price fair?',
    prompt: 'Is this rental price fair for the area? What does the market look like right now?',
  },
  {
    icon: <IconBuildings />,
    label: 'Compare neighborhoods',
    prompt: 'Compare this neighborhood to nearby alternatives. Which is better value for renters?',
  },
  {
    icon: <IconChat />,
    label: 'What are people saying?',
    prompt: 'Search Reddit and Yelp — what are real residents saying about living here?',
  },
  {
    icon: <IconShield />,
    label: 'Noise & safety check',
    prompt: 'How is the noise level and safety in this area? Any red flags I should know about?',
  },
  {
    icon: <IconTransit />,
    label: 'Commute analysis',
    prompt: 'How is the commute from here? Walk me through transit options and drive times.',
  },
  {
    icon: <IconPin />,
    label: 'Best areas for me',
    prompt: 'What are the best neighborhoods for a young professional renter in this city?',
  },
];

interface PromptChipsProps {
  onSelectPrompt: (prompt: string) => void;
  areaName?: string;
}

const A = {
  ink: '#1A1916',
  mute: '#75736A',
  faint: '#A6A39A',
  hair: '#EBE7DC',
  brand: '#3F7D4A',
  brandDeep: '#2E5E37',
  brandSoft: '#EEF3E9',
  brandSoftBorder: '#DDE8D2',
};

const FONT  = "var(--font-inter), 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";
const SERIF = "var(--font-source-serif), 'Source Serif 4', Georgia, serif";

export default function PromptChips({ onSelectPrompt, areaName }: PromptChipsProps) {
  return (
    <div style={{ width: '100%', maxWidth: 640, margin: '0 auto', padding: '20px 32px', fontFamily: FONT }}>
      {/* Welcome header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 999,
          background: A.brandSoft, border: `1px solid ${A.brandSoftBorder}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
        }}>
          <svg width="18" height="18" viewBox="0 0 14 14">
            <path d="M7 1l1.4 4.2L12.5 7 8.4 8.4 7 12.5 5.6 8.4 1.5 7l4.1-1.4L7 1z" fill={A.brand} />
          </svg>
        </div>
        <h2 style={{
          fontFamily: SERIF, fontSize: 28, fontWeight: 400, color: A.ink,
          margin: '0 0 8px', letterSpacing: '-0.022em', lineHeight: 1.25,
        }}>
          {areaName ? `What should we look into in ${areaName.split(',')[0]}?` : 'Where are you looking to rent?'}
        </h2>
        <p style={{ fontSize: 15, color: A.mute, margin: '0 0 28px', lineHeight: 1.55, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
          Ask about rents, neighborhoods, listings, schools, parking — Rent Signal searches Zillow, Reddit, and Yelp in real time.
        </p>
      </div>

      {/* Suggestion cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => onSelectPrompt(p.prompt)}
            className="suggestion-card"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 14px',
              background: '#FFFFFF',
              border: `1px solid ${A.hair}`,
              borderRadius: 12, textAlign: 'left', cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            <span style={{ flexShrink: 0, marginTop: 1, color: A.mute }}>{p.icon}</span>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 600, color: A.ink, margin: 0, letterSpacing: '-0.01em' }}>
                {p.label}
              </p>
              <p style={{ fontSize: 12, color: A.faint, margin: '3px 0 0', lineHeight: 1.4 }}>
                {p.prompt.length > 60 ? p.prompt.slice(0, 60) + '…' : p.prompt}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
