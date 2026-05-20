export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentRun?: AgentRun[];
}

export interface Area {
  id: string;
  name: string;
  city: string;
  state: string;
  createdAt: Date;
  messages: Message[];
}

export type AgentName = 'pricing' | 'social' | 'neighborhood' | 'commute';
export type AgentStatus = 'pending' | 'running' | 'done' | 'error';

export interface AgentRun {
  agent: AgentName;
  status: AgentStatus;
}

export const AGENT_META: Record<AgentName, { label: string; emoji: string }> = {
  pricing:      { label: 'Pricing Agent',    emoji: '💰' },
  social:       { label: 'Sentiment Agent',  emoji: '💬' },
  neighborhood: { label: 'Neighborhood Agent', emoji: '🏘️' },
  commute:      { label: 'Commute Agent',    emoji: '🚇' },
};
