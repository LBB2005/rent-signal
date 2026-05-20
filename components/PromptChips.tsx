'use client';

const PROMPTS = [
  {
    icon: '💰',
    label: 'Is this price fair?',
    prompt: 'Is this rental price fair for the area? What does the market look like right now?',
  },
  {
    icon: '🏘️',
    label: 'Compare neighborhoods',
    prompt: 'Compare this neighborhood to nearby alternatives. Which is better value for renters?',
  },
  {
    icon: '💬',
    label: 'What are people saying?',
    prompt: 'Search Reddit and Yelp — what are real residents saying about living here?',
  },
  {
    icon: '🔊',
    label: 'Noise & safety check',
    prompt: 'How is the noise level and safety in this area? Any red flags I should know about?',
  },
  {
    icon: '🚇',
    label: 'Commute analysis',
    prompt: 'How is the commute from here? Walk me through transit options and drive times.',
  },
  {
    icon: '🎯',
    label: 'Best areas for me',
    prompt: 'What are the best neighborhoods for a young professional renter in this city?',
  },
];

interface PromptChipsProps {
  onSelectPrompt: (prompt: string) => void;
  areaName?: string;
}

export default function PromptChips({ onSelectPrompt, areaName }: PromptChipsProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Welcome header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-[#D4622A] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L1 7h2v7h4v-4h2v4h4V7h2L8 1z" fill="white" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-[#1A1A1A] mb-2">
          {areaName ? `Research ${areaName}` : 'Where are you looking to rent?'}
        </h2>
        <p className="text-[#6B6B6B] text-[15px] max-w-sm mx-auto leading-relaxed">
          Ask anything about neighborhoods, pricing, and what real renters say — powered by live web data.
        </p>
      </div>

      {/* Prompt chips grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => onSelectPrompt(p.prompt)}
            className="flex items-start gap-3 p-4 bg-white border border-[#E8E4DC] rounded-xl text-left hover:border-[#D4622A] hover:bg-[#FDF8F5] transition-all group"
          >
            <span className="text-xl flex-shrink-0 mt-0.5">{p.icon}</span>
            <div>
              <p className="text-[13px] font-semibold text-[#1A1A1A] group-hover:text-[#D4622A] transition-colors">
                {p.label}
              </p>
              <p className="text-[12px] text-[#9B8F84] mt-0.5 leading-snug line-clamp-2">
                {p.prompt}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
