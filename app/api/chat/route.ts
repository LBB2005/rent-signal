import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { AgentName } from '@/lib/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const perplexity = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY!,
  baseURL: 'https://api.perplexity.ai',
});

// ── Web search via Perplexity ─────────────────────────────────────────────
async function searchWeb(query: string): Promise<string> {
  const res = await perplexity.chat.completions.create({
    model: 'sonar-pro',
    messages: [
      {
        role: 'system',
        content:
          'You are a research assistant for a rental market app. Return factual, current data with specific numbers and sources.',
      },
      { role: 'user', content: query },
    ],
    max_tokens: 1200,
  });
  return res.choices[0]?.message?.content ?? 'No results found.';
}

// ── Specialist agent configs ───────────────────────────────────────────────
const AGENT_PROMPTS: Record<AgentName, string> = {
  pricing: `You are a rental pricing specialist inside a multi-agent research system.
Your ONLY job: find current, accurate rental price data for the area the user is asking about.
Research: median rent by unit type (studio/1BR/2BR/3BR), YoY price trends, how prices compare to the broader city, whether current asking prices are fair market value.
Use your search tool 1-2 times with specific queries. Return structured data with real numbers. Be concise — another agent will synthesize your output.`,

  social: `You are a social sentiment specialist inside a multi-agent research system.
Your ONLY job: find what real renters and residents say about the area on Reddit (r/[city], r/Moving, r/apartments), Yelp, and local forums.
Look for: common complaints, what people love, noise/neighbor issues, landlord quality, hidden gems, red flags.
Use your search tool 1-2 times. Include direct quotes when possible. Be concise — another agent will synthesize your output.`,

  neighborhood: `You are a neighborhood intelligence specialist inside a multi-agent research system.
Your ONLY job: assess the quality of life in the area.
Research: safety/crime stats, walkability score, noise levels (bars, traffic, nightlife), nearby amenities (restaurants, grocery, parks), neighborhood character and who lives there.
Use your search tool 1-2 times. Be specific with scores and data. Be concise — another agent will synthesize your output.`,

  commute: `You are a commute and transportation specialist inside a multi-agent research system.
Your ONLY job: assess how easy it is to get around from this neighborhood.
Research: public transit options and frequency, drive times to downtown and major employers, bikeability, parking situation, Uber/Lyft coverage.
Use your search tool 1-2 times. Give specific travel times. Be concise — another agent will synthesize your output.`,
};

const searchTool: Anthropic.Tool = {
  name: 'search_web',
  description:
    'Search the web for real-time data about neighborhoods, rental prices, Reddit posts, reviews, and local info.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Specific search query — always include city and neighborhood name.',
      },
    },
    required: ['query'],
  },
};

// ── CEO: decide which agents to run ───────────────────────────────────────
async function routeWithCEO(
  userMessage: string,
  areaContext: string | undefined
): Promise<AgentName[]> {
  const routingTool: Anthropic.Tool = {
    name: 'select_agents',
    description: 'Select which specialist agents to dispatch for this rental research query.',
    input_schema: {
      type: 'object' as const,
      properties: {
        agents: {
          type: 'array' as const,
          items: {
            type: 'string' as const,
            enum: ['pricing', 'social', 'neighborhood', 'commute'],
          },
          description:
            'Agents to run in parallel. Select all for broad appraisals. 1-2 for targeted questions.',
        },
      },
      required: ['agents'],
    },
  };

  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    system: `You are the CEO orchestrator of a rental research AI. Route queries to the right specialist agents.
Agent capabilities:
- pricing: rent prices, market data, is this price fair, price trends
- social: what people say on Reddit/Yelp, reviews, complaints, recommendations
- neighborhood: safety, walkability, noise, amenities, vibe, crime stats
- commute: transit options, drive times, parking, getting around
Rules:
- Price or value questions → pricing (always include)
- "What are people saying" / reviews / complaints → social
- Safety / noise / walkability / amenities → neighborhood
- Commute / transit / drive times → commute
- Broad appraisal or "tell me about this area" → all four
- Never select fewer than 1 agent`,
    tools: [routingTool],
    tool_choice: { type: 'any' as const },
    messages: [
      {
        role: 'user',
        content: `Area: ${areaContext ?? 'unknown'}\nUser question: ${userMessage}`,
      },
    ],
  });

  const toolUse = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
  );
  if (toolUse) {
    return (toolUse.input as { agents: AgentName[] }).agents;
  }
  return ['pricing', 'social'];
}

// ── Run a single specialist agent ─────────────────────────────────────────
async function runAgent(
  agentName: AgentName,
  userMessage: string,
  areaContext: string | undefined
): Promise<string> {
  const systemPrompt = areaContext
    ? `${AGENT_PROMPTS[agentName]}\n\nArea being researched: ${areaContext}`
    : AGENT_PROMPTS[agentName];

  let messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }];

  while (true) {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      tools: [searchTool],
      messages,
    });

    if (res.stop_reason === 'tool_use') {
      const toolBlocks = res.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      );
      messages.push({ role: 'assistant', content: res.content });

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolBlocks) {
        if (block.name === 'search_web') {
          const { query } = block.input as { query: string };
          const result = await searchWeb(query);
          results.push({ type: 'tool_result', tool_use_id: block.id, content: result });
        }
      }
      messages.push({ role: 'user', content: results });
      continue;
    }

    const text = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    return text?.text ?? '';
  }
}

// ── CEO: synthesize all agent reports into one answer ────────────────────
async function synthesize(
  userMessage: string,
  areaContext: string | undefined,
  reports: { agent: AgentName; output: string }[]
): Promise<string> {
  const agentLabels: Record<AgentName, string> = {
    pricing: '💰 Pricing',
    social: '💬 Social Sentiment',
    neighborhood: '🏘️ Neighborhood',
    commute: '🚇 Commute',
  };

  const reportsText = reports
    .map(({ agent, output }) => `=== ${agentLabels[agent]} Report ===\n${output}`)
    .join('\n\n');

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `You are the lead analyst at RentAI. You have received reports from specialist agents and must synthesize them into one clear, helpful response for a renter.
Guidelines:
- Conversational and direct — no corporate speak
- Give concrete verdicts and recommendations, not just data summaries
- Use markdown (headers, bullets, bold) for readability
- Under 400 words unless depth is clearly needed
- End with a clear bottom line or "should I rent here?" verdict
${areaContext ? `\nArea: ${areaContext}` : ''}`,
    messages: [
      {
        role: 'user',
        content: `User question: "${userMessage}"\n\n${reportsText}`,
      },
    ],
  });

  const text = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  return text?.text ?? '';
}

// ── Main SSE route ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { messages, areaContext } = await req.json();
  const lastUserMessage: string = messages[messages.length - 1]?.content ?? '';

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      function send(event: string, data: object) {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          closed = true;
        }
      }

      function close() {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch { /* already closed by client disconnect */ }
      }

      try {
        // Step 1 — CEO routing (fast, Haiku)
        send('status', { message: 'CEO routing your question...' });
        const selectedAgents = await routeWithCEO(lastUserMessage, areaContext);
        send('routing', { agents: selectedAgents });

        // Step 2 — Specialist agents run in parallel
        const agentPromises = selectedAgents.map(async (agentName) => {
          send('agent', { agent: agentName, status: 'running' });
          try {
            const output = await runAgent(agentName, lastUserMessage, areaContext);
            send('agent', { agent: agentName, status: 'done' });
            return { agent: agentName, output };
          } catch (err) {
            console.error(`Agent ${agentName} failed:`, err);
            send('agent', { agent: agentName, status: 'error' });
            return { agent: agentName, output: 'Agent encountered an error and was skipped.' };
          }
        });

        const reports = await Promise.all(agentPromises);

        // Step 3 — CEO synthesis
        send('status', { message: 'Compiling final report...' });
        const finalResponse = await synthesize(
          lastUserMessage,
          areaContext,
          reports as { agent: AgentName; output: string }[]
        );

        send('response', { content: finalResponse, agents: selectedAgents });
      } catch (err) {
        console.error('Multi-agent pipeline error:', err);
        send('error', { message: 'Failed to process request' });
      } finally {
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
