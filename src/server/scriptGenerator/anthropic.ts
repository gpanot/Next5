// server-only. One Anthropic Messages call with a tool, read as a stream.
// Streaming matters: the model thinks for a while before it writes, and a plain request that stays silent
// that long gets its connection closed (UND_ERR_SOCKET). A stream keeps bytes flowing.
import { recordCost } from '../costs/ledger';
import { HttpError } from '../http';

export type ToolDef = { name: string; description: string; input_schema: object; strict?: boolean };

/** Per call: which model, how hard it thinks, and whether a refusal may be re-run on a fallback model. */
export type ClaudeOptions = { model?: string; effort?: 'low' | 'medium' | 'high'; fallbacks?: boolean };

type Usage = { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };

type StreamEvent = {
  type: string;
  content_block?: { type: string };
  delta?: { type: string; partial_json?: string; stop_reason?: string };
  message?: { usage?: Usage };
  usage?: Usage;
  error?: { message?: string };
};

type StreamState = { json: string; sawTool: boolean; stop: string; inputTokens: number; outputTokens: number };

const MODEL = process.env.SCRIPT_GENERATOR_MODEL || 'claude-sonnet-5-5';

/** List prices, micro-USD per token (claude-api skill table, cached 2026-10-06). Cache reads and writes count as input. */
const CLAUDE_PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
};

const recordUsage = (model: string, state: StreamState) => {
  const price = CLAUDE_PRICES[model];
  if (price) recordCost({ provider: 'anthropic', model, usdMicros: state.inputTokens * price.input + state.outputTokens * price.output });
};

/** Applies one SSE event to the running state: the tool input JSON text, the stop reason and the token counts. */
function applyEvent(ev: StreamEvent, state: StreamState) {
  if (ev.type === 'error') throw new HttpError(502, 'anthropic_error', ev.error?.message || 'Anthropic stream error');
  if (ev.type === 'message_start' && ev.message?.usage) {
    const u = ev.message.usage;
    state.inputTokens = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
  }
  if (ev.type === 'content_block_start' && ev.content_block?.type === 'tool_use') state.sawTool = true;
  if (ev.type === 'content_block_delta' && ev.delta?.type === 'input_json_delta') state.json += ev.delta.partial_json ?? '';
  if (ev.type === 'message_delta' && ev.delta?.stop_reason) state.stop = ev.delta.stop_reason;
  if (ev.type === 'message_delta' && ev.usage?.output_tokens !== undefined) state.outputTokens = ev.usage.output_tokens;
}

async function readStream(res: Response): Promise<StreamState> {
  if (!res.body) throw new HttpError(502, 'anthropic_error', 'Anthropic returned an empty response.');
  const state: StreamState = { json: '', sawTool: false, stop: '', inputTokens: 0, outputTokens: 0 };
  const decoder = new TextDecoder();
  const reader = res.body.getReader();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const data = part.split('\n').find((l) => l.startsWith('data: '));
      if (data) applyEvent(JSON.parse(data.slice(6)) as StreamEvent, state);
    }
  }
  return state;
}

/** Calls the model and returns the tool input as parsed JSON. Throws HttpError for every failure. */
export async function callClaude(system: string, user: string, tool: ToolDef, options: ClaudeOptions = {}): Promise<unknown> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new HttpError(500, 'missing_api_key', 'ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.');
  const model = options.model ?? MODEL;
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' };
  // On a policy refusal the API re-runs the request on a fallback model it picks by refusal category.
  if (options.fallbacks) headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        // The model thinks before it writes (2 to 3k tokens), so leave room for the full script after it.
        max_tokens: 16000,
        stream: true,
        system,
        messages: [{ role: 'user', content: user }],
        tools: [tool],
        // Opus 5.5 and Sonnet 5.5 reject forced tool_choice ('tool' / 'any'); the system prompt tells it to call the tool.
        tool_choice: { type: 'auto' },
        ...(options.effort ? { output_config: { effort: options.effort } } : {}),
        ...(options.fallbacks ? { fallbacks: 'default' } : {}),
      }),
    });
  } catch {
    throw new HttpError(502, 'anthropic_unreachable', 'Could not reach the Anthropic API. Try again.');
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new HttpError(502, 'anthropic_error', data.error?.message || `Anthropic API error ${res.status}`);
  }
  let state;
  try {
    state = await readStream(res);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(502, 'anthropic_stream', 'The connection to the Anthropic API dropped mid-answer. Try again.');
  }
  recordUsage(model, state);
  if (state.stop === 'refusal') throw new HttpError(422, 'model_refused', 'The writer declined this input. Change the topic or details and try again.');
  if (!state.sawTool || state.stop === 'max_tokens') {
    const why = state.stop === 'max_tokens' ? 'the answer was cut off' : 'no tool call';
    throw new HttpError(502, 'no_tool_result', `Model did not return a structured result (${why}). Try again.`);
  }
  try {
    return JSON.parse(state.json);
  } catch {
    throw new HttpError(502, 'no_tool_result', 'Model did not return a structured result (invalid JSON). Try again.');
  }
}
