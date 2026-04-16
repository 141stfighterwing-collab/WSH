import { NextRequest, NextResponse } from 'next/server';

// ── Provider Model Maps ──────────────────────────────────────────────────
const CLAUDE_MODELS: Record<string, string> = {
  'claude-sonnet-4-20250514': 'claude-sonnet-4-20250514',
  'claude-haiku-4-20250414': 'claude-haiku-4-20250414',
  'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022': 'claude-3-5-haiku-20241022',
};

const OPENAI_MODELS: Record<string, string> = {
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
  'gpt-4-turbo': 'gpt-4-turbo',
  'gpt-3.5-turbo': 'gpt-3.5-turbo',
};

const GEMINI_MODELS: Record<string, string> = {
  'gemini-2.5-pro': 'gemini-2.5-pro-preview-05-06',
  'gemini-2.5-flash': 'gemini-2.5-flash-preview-04-17',
  'gemini-2.0-flash': 'gemini-2.0-flash',
};

const SYSTEM_PROMPTS: Record<string, string> = {
  summarize: 'Summarize the following note concisely while preserving key information.',
  expand: 'Expand on the following note with more detail, examples, and context.',
  improve: 'Improve the writing quality of the following note, fixing grammar and enhancing clarity.',
  tags: 'Suggest relevant tags for the following note. Return only a JSON array of tag strings, no other text. Example: ["tag1", "tag2", "tag3"]',
  outline: 'Generate a structured outline based on the following note content.',
};

let aiUsageCount = 0;
let lastResetDate = new Date().toDateString();

// ── Claude (Anthropic) ───────────────────────────────────────────────────
async function callClaude(systemPrompt: string, content: string, model: string, temperature: number, maxTokens: number) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODELS[model] || model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API error ${res.status}`);
  }

  const data = await res.json();
  const result = data.content?.[0]?.text || '';
  const tokensUsed = data.usage?.input_tokens + data.usage?.output_tokens || 0;
  return { result, tokensUsed };
}

// ── OpenAI ───────────────────────────────────────────────────────────────
async function callOpenAI(systemPrompt: string, content: string, model: string, temperature: number, maxTokens: number) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODELS[model] || model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error ${res.status}`);
  }

  const data = await res.json();
  const result = data.choices?.[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || 0;
  return { result, tokensUsed };
}

// ── Gemini (Google) ──────────────────────────────────────────────────────
async function callGemini(systemPrompt: string, content: string, model: string, temperature: number, maxTokens: number) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const geminiModel = GEMINI_MODELS[model] || model;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: content }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error ${res.status}`);
  }

  const data = await res.json();
  const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const tokensUsed = data.usageMetadata?.totalTokenCount || 0;
  return { result, tokensUsed };
}

// ── Router ────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Daily limit reset
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
      aiUsageCount = 0;
      lastResetDate = today;
    }

    const dailyLimit = parseInt(process.env.AI_DAILY_LIMIT || '800', 10);
    if (aiUsageCount >= dailyLimit) {
      return NextResponse.json({ error: 'Daily AI usage limit reached' }, { status: 429 });
    }

    // Parse body — accept optional provider/model overrides from client
    const body = await request.json();
    const { content, action, provider: clientProvider, model: clientModel } = body as {
      content: string;
      action: string;
      provider?: string;
      model?: string;
    };

    if (!content || !action) {
      return NextResponse.json({ error: 'Missing required fields: content, action' }, { status: 400 });
    }

    const validActions = ['summarize', 'expand', 'improve', 'tags', 'outline'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, { status: 400 });
    }

    const systemPrompt = SYSTEM_PROMPTS[action] || SYSTEM_PROMPTS.summarize;

    // Determine provider and model:
    // 1. Client override (from settings) takes priority
    // 2. Fall back to env var AI_PROVIDER
    // 3. Fall back to checking which API keys are configured
    const provider = clientProvider || process.env.AI_PROVIDER || detectProvider();
    const temperature = parseFloat(process.env.AI_SYNTHESIS_TEMPERATURE || '0.7');
    const maxTokens = parseInt(process.env.AI_SYNTHESIS_MAX_TOKENS || '4096', 10);

    let result = '';
    let tokensUsed = 0;
    let usedProvider = provider;

    if (provider === 'claude') {
      const model = clientModel || process.env.AI_SYNTHESIS_MODEL || 'claude-sonnet-4-20250514';
      const r = await callClaude(systemPrompt, content, model, temperature, maxTokens);
      result = r.result;
      tokensUsed = r.tokensUsed;
    } else if (provider === 'openai') {
      const model = clientModel || process.env.AI_SYNTHESIS_MODEL || 'gpt-4o-mini';
      const r = await callOpenAI(systemPrompt, content, model, temperature, maxTokens);
      result = r.result;
      tokensUsed = r.tokensUsed;
    } else if (provider === 'gemini') {
      const model = clientModel || process.env.AI_SYNTHESIS_MODEL || 'gemini-2.0-flash';
      const r = await callGemini(systemPrompt, content, model, temperature, maxTokens);
      result = r.result;
      tokensUsed = r.tokensUsed;
    } else {
      return NextResponse.json(
        { error: 'No AI provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY environment variable.' },
        { status: 400 },
      );
    }

    aiUsageCount++;

    return NextResponse.json({
      result,
      tokensUsed,
      usageCount: aiUsageCount,
      provider: usedProvider,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Synthesis API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Provider GET endpoint — returns which provider is available ──────────
export async function GET() {
  const available: Record<string, boolean> = {
    claude: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
  };

  const configured = Object.entries(available)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const defaultProvider = process.env.AI_PROVIDER || configured[0] || '';

  return NextResponse.json({
    provider: defaultProvider,
    available,
    configured,
    model: process.env.AI_SYNTHESIS_MODEL || '',
  });
}

/** Auto-detect which provider is available based on API keys */
function detectProvider(): string {
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return '';
}
