import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { AgentName } from '@/lib/types';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Next.js does not override system env vars with .env.local — but Claude for
// Desktop injects ANTHROPIC_API_KEY='' into the system env, so we fall back
// to reading .env.local directly when the system value is empty.
let _envLocalCache: Record<string, string> | null = null;
function getEnvLocal(key: string): string {
  if (!_envLocalCache) {
    _envLocalCache = {};
    try {
      const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
      for (const line of raw.split('\n')) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
        if (m) _envLocalCache[m[1]] = m[2].trim();
      }
    } catch { /* .env.local missing — ignore */ }
  }
  return _envLocalCache[key] ?? '';
}

function getKey(name: string): string {
  const sys = process.env[name]?.trim();
  return sys || getEnvLocal(name);
}

function getClients() {
  const anthropic = new Anthropic({ apiKey: getKey('ANTHROPIC_API_KEY') });
  const perplexity = new OpenAI({
    apiKey: getKey('PERPLEXITY_API_KEY'),
    baseURL: 'https://api.perplexity.ai',
  });
  return { anthropic, perplexity };
}

// ── Retry helper for Anthropic overload/rate-limit errors ─────────────────
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const retryable = status === 529 || status === 429 || status === 500 || status === 408;
      if (!retryable || attempt === maxAttempts - 1) throw err;
      // Longer backoff: 3s, 8s — gives API capacity time to free up
      const delay = attempt === 0 ? 3000 : 8000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

function isOverloaded(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 529 || status === 429;
}

// ── Web search via Perplexity ─────────────────────────────────────────────
async function searchWeb(query: string): Promise<{ content: string; citations: string[] }> {
  const { perplexity } = getClients();
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
  const content = res.choices[0]?.message?.content ?? 'No results found.';
  // Perplexity adds a citations array to the response (not in OpenAI types)
  const citations: string[] = (res as unknown as { citations?: string[] }).citations ?? [];
  return { content, citations };
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

  research: `You are a housing research specialist inside a multi-agent rental research system.
Your ONLY job: find recent news articles, housing market reports, and authoritative data about this rental market.
Search 2 times: first for recent rental news ("[area] rental market 2025 news OR trends"), second for housing reports or data ("[area] housing affordability report OR study OR analysis").
Return key findings with specific dates, stats, and publication names. Be concise — another agent will synthesize your output.`,
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
  const { anthropic } = getClients();
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
            enum: ['pricing', 'social', 'neighborhood', 'commute', 'research'],
          },
          description:
            'Agents to run in parallel. Select all for broad appraisals. 1-2 for targeted questions.',
        },
      },
      required: ['agents'],
    },
  };

  const res = await withRetry(() => anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: `You are the CEO orchestrator of a rental research AI. Route queries to the right specialist agents.
Agent capabilities:
- pricing: rent prices, market data, is this price fair, price trends
- social: what people say on Reddit/Yelp, reviews, complaints, recommendations
- neighborhood: safety, walkability, noise, amenities, vibe, crime stats
- commute: transit options, drive times, parking, getting around
- research: recent news articles, housing reports, market trend studies, authoritative data sources
Rules:
- Price or value questions → pricing (always include)
- "What are people saying" / reviews / complaints → social
- Safety / noise / walkability / amenities → neighborhood
- Commute / transit / drive times → commute
- News / trends / reports / "what's happening" → research
- Broad appraisal or "tell me about this area" → all five agents
- Never select fewer than 1 agent`,
    tools: [routingTool],
    tool_choice: { type: 'any' as const },
    messages: [
      {
        role: 'user',
        content: `Area: ${areaContext ?? 'unknown'}\nUser question: ${userMessage}`,
      },
    ],
  }));

  const toolUse = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
  );
  if (toolUse) {
    return (toolUse.input as { agents: AgentName[] }).agents;
  }
  return ['pricing', 'social'];
}

const AGENT_MODELS: Record<AgentName, string> = {
  pricing:      'claude-haiku-4-5-20251001',
  social:       'claude-haiku-4-5-20251001',
  neighborhood: 'claude-haiku-4-5-20251001',
  commute:      'claude-haiku-4-5-20251001',
  research:     'claude-haiku-4-5-20251001',
};

const AGENT_MAX_TOKENS: Record<AgentName, number> = {
  pricing:      800,
  social:       1200,
  neighborhood: 800,
  commute:      800,
  research:     1000,
};

// ── Run a single specialist agent ─────────────────────────────────────────
async function runAgent(
  agentName: AgentName,
  userMessage: string,
  areaContext: string | undefined
): Promise<{ output: string; sources: string[] }> {
  const { anthropic } = getClients();
  const systemPrompt = areaContext
    ? `${AGENT_PROMPTS[agentName]}\n\nArea being researched: ${areaContext}`
    : AGENT_PROMPTS[agentName];

  let messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }];
  const collectedSources: string[] = [];

  while (true) {
    const res = await withRetry(() => anthropic.messages.create({
      model: AGENT_MODELS[agentName],
      max_tokens: AGENT_MAX_TOKENS[agentName],
      system: systemPrompt,
      tools: [searchTool],
      messages,
    }));

    if (res.stop_reason === 'tool_use') {
      const toolBlocks = res.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      );
      messages.push({ role: 'assistant', content: res.content });

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolBlocks) {
        if (block.name === 'search_web') {
          const { query } = block.input as { query: string };
          const { content, citations } = await searchWeb(query);
          collectedSources.push(...citations);
          results.push({ type: 'tool_result', tool_use_id: block.id, content });
        }
      }
      messages.push({ role: 'user', content: results });
      continue;
    }

    const text = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    return { output: text?.text ?? '', sources: collectedSources };
  }
}

// ── Build synthesis prompts (shared by streaming path) ───────────────────
function buildSynthesisInput(
  userMessage: string,
  areaContext: string | undefined,
  reports: { agent: AgentName; output: string }[]
): { systemPrompt: string; userContent: string } {
  const agentLabels: Record<AgentName, string> = {
    pricing:      'Pricing',
    social:       'Social Sentiment',
    neighborhood: 'Neighborhood',
    commute:      'Commute',
    research:     'Research',
  };

  const reportsText = reports
    .map(({ agent, output }) => `=== ${agentLabels[agent]} Report ===\n${output}`)
    .join('\n\n');

  const systemPrompt = `You are the lead analyst at Rent Signal. You have received reports from specialist agents and must synthesize them into a detailed, insightful response for a renter.

Guidelines:
- Write like a sharp, knowledgeable friend — direct, opinionated, no corporate fluff
- Give concrete verdicts with real numbers, not vague summaries
- Use ## headers and bullet points to organize long responses
- Be as thorough as the question demands — a full appraisal deserves real depth
- Always end with a clear bottom-line verdict

Rich output formats — use these whenever they add clarity:

MARKDOWN TABLES — for side-by-side comparisons:
| Address | Price | vs Median | Walk | Verdict |
|---------|-------|-----------|------|---------|
| 1604 Lucile | $2,650 | -$170 | 79 | Under market |

CHART BLOCKS — for price comparisons, score breakdowns, or trends. Output exactly:
\`\`\`chart
{"type":"bar","title":"Rent Comparison","data":[{"name":"1604 Lucile","value":2650},{"name":"2841 Rowena","value":2750},{"name":"Median","value":2820,"fill":"#78716C"}]}
\`\`\`

LINE CHARTS for trends:
\`\`\`chart
{"type":"line","title":"Silver Lake Rent Trend","data":[{"name":"Jan","value":2700},{"name":"Feb","value":2740}]}
\`\`\`

MAP BLOCKS — when showing property or neighborhood locations. Output exactly:
\`\`\`map
{"center":{"lat":34.086,"lng":-118.27},"zoom":14,"markers":[{"lat":34.086,"lng":-118.27,"label":"A","title":"1604 Lucile Ave","price":"$2,650/mo"}]}
\`\`\`

Rules for rich output:
- Use a chart when comparing 3+ numeric values (prices, scores, etc.)
- Use a map when locations are central to the answer
- Use a table when comparing listings or neighborhoods across multiple attributes
- Never output a code block without valid JSON inside it
${areaContext ? `\nArea being researched: ${areaContext}` : ''}`;

  return { systemPrompt, userContent: `User question: "${userMessage}"\n\n${reportsText}` };
}

// ── Stream synthesis, emitting chunk events as tokens arrive ──────────────
async function streamSynthesis(
  userMessage: string,
  areaContext: string | undefined,
  reports: { agent: AgentName; output: string }[],
  send: (event: string, data: object) => void
): Promise<string> {
  const { anthropic } = getClients();
  const { systemPrompt, userContent } = buildSynthesisInput(userMessage, areaContext, reports);

  const candidates = [
    { model: 'claude-sonnet-4-6',        maxTokens: 3000 },
    { model: 'claude-haiku-4-5-20251001', maxTokens: 2000 },
  ];

  for (let i = 0; i < candidates.length; i++) {
    const { model, maxTokens } = candidates[i];
    let chunksSent = false;
    let fullContent = '';
    try {
      const stream = anthropic.messages.stream({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      });
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          chunksSent = true;
          fullContent += event.delta.text;
          send('chunk', { text: event.delta.text });
        }
      }
      return fullContent;
    } catch (err: unknown) {
      const isLast = i === candidates.length - 1;
      if (!chunksSent && isOverloaded(err) && !isLast) {
        console.warn(`Synthesis: ${model} overloaded, falling back`);
        continue;
      }
      throw err;
    }
  }

  throw new Error('All synthesis models failed');
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
            const { output, sources } = await runAgent(agentName, lastUserMessage, areaContext);
            send('agent', { agent: agentName, status: 'done' });
            return { agent: agentName, output, sources };
          } catch (err) {
            console.error(`Agent ${agentName} failed:`, err);
            send('agent', { agent: agentName, status: 'error' });
            return { agent: agentName, output: 'Agent encountered an error and was skipped.', sources: [] as string[] };
          }
        });

        const reports = await Promise.all(agentPromises);

        // Deduplicate all sources collected across agents
        const allSources = [...new Set(reports.flatMap(r => r.sources))];

        // Step 3 — CEO synthesis (streamed token-by-token via chunk events)
        send('status', { message: 'Compiling final report...' });
        const finalResponse = await streamSynthesis(
          lastUserMessage,
          areaContext,
          reports.map(r => ({ agent: r.agent, output: r.output })) as { agent: AgentName; output: string }[],
          send
        );

        send('response', { content: finalResponse, agents: selectedAgents, sources: allSources });
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
