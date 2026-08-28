export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentRun?: AgentRun[];
  sources?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  areaId: string;
  createdAt: Date;
}

export interface Area {
  id: string;
  name: string;
  city: string;
  state: string;
  createdAt: Date;
  messages: Message[];
}

export type AgentName = 'pricing' | 'social' | 'neighborhood' | 'commute' | 'research';
export type AgentStatus = 'pending' | 'running' | 'done' | 'error';

export interface AgentRun {
  agent: AgentName;
  status: AgentStatus;
}

export interface Listing {
  id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft?: number;
  latitude: number;
  longitude: number;
  photoUrl?: string;
  photoUrls?: string[];
  zillowUrl?: string;
}

export const AGENT_META: Record<AgentName, { label: string }> = {
  pricing:      { label: 'Pricing Agent'      },
  social:       { label: 'Sentiment Agent'    },
  neighborhood: { label: 'Neighborhood Agent' },
  commute:      { label: 'Commute Agent'      },
  research:     { label: 'Research Agent'     },
};
