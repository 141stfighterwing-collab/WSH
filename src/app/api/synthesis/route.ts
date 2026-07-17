import { NextRequest, NextResponse } from 'next/server';
import { addLog } from '@/lib/logger';

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

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'it', 'to', 'for', 'of', 'with', 'as', 'by', 'from', 'that', 'but', 'or', 'not', 'are', 'be', 'this', 'will', 'can', 'if', 'has', 'have', 'had', 'was', 'were', 'been', 'you', 'your', 'they', 'their', 'them', 'our', 'ours', 'about', 'into', 'over', 'under', 'than', 'then', 'there', 'here', 'also', 'just', 'more', 'most', 'some', 'such', 'very', 'much', 'many', 'when', 'where', 'what', 'who', 'why', 'how'
]);

let aiUsageCount = 0;
let lastResetDate = new Date().toDateString();

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s#/-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function extractKeywords(text: string): Array<{ term: string; count: number }> {
  const freq = new Map<string, number>();
  for (const token of tokenize(text)) {
    if (/^\d+$/.test(token)) continue;
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return [...freq.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));
}

function titleCase(term: string): string {
  return term
    .split(/[-/]/)
    .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : part)
    .join(' ');
}

function summarizeLocally(content: string): string {
  const plain = stripHtml(content);
  const sentences = splitSentences(plain);
  if (sentences.length === 0) return 'No content available to summarize.';
  if (sentences.length <= 3) return sentences.join(' ');

  const keywords = new Set(extractKeywords(plain).slice(0, 12).map((k) => k.term));
  const scored = sentences.map((sentence, index) => {
    const words = tokenize(sentence);
    let score = 0;
    for (const word of words) {
      if (keywords.has(word)) score += 2;
      if (/^[A-Z0-9_-]{2,}$/.test(word)) score += 1;
    }
    if (index === 0) score += 1.5;
    if (sentence.length > 60 && sentence.length < 260) score += 1;
    return { sentence, index, score };
  });

  const selected = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(4, Math.max(2, Math.ceil(sentences.length / 4))))
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);

  return selected.join(' ');
}

function generateTagsLocally(content: string): string[] {
  const plain = stripHtml(content);
  const keywords = extractKeywords(plain);
  const tags: string[] = [];
  const seen = new Set<string>();

  const addTag = (raw: string) => {
    const cleaned = raw
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (!cleaned || cleaned.length < 3 || seen.has(cleaned)) return;
    seen.add(cleaned);
    tags.push(cleaned);
  };

  const acronymMatches = plain.match(/\b[A-Z]{2,}(?:[-_][A-Z0-9]+)?\b/g) || [];
  acronymMatches.forEach(addTag);

  const hashtagMatches = plain.match(/#([A-Za-z0-9_-]{3,})/g) || [];
  hashtagMatches.forEach((tag) => addTag(tag.slice(1)));

  for (const keyword of keywords) {
    addTag(keyword.term);
    if (tags.length >= 8) break;
  }

  return tags.slice(0, Math.max(4, Math.min(tags.length, 8)));
}

function generateOutlineLocally(content: string): string {
  const plain = stripHtml(content);
  const sentences = splitSentences(plain);
  const keywords = extractKeywords(plain).slice(0, 8);

  if (sentences.length === 0) {
    return '## Overview\n\n- No content available\n';
  }

  const overview = summarizeLocally(content);
  const topicLines = keywords.slice(0, 5).map((k) => `- ${titleCase(k.term)}`);

  const nextStepsCandidates = sentences
    .filter((s) => /should|need|next|follow up|todo|action|required|plan/i.test(s))
    .slice(0, 4)
    .map((s) => `- ${s}`);

  const fallbackSteps = sentences
    .slice(0, 3)
    .map((s) => `- Review: ${s}`);

  return [
    '## Overview',
    overview,
    '',
    '## Key Topics',
    ...(topicLines.length ? topicLines : ['- General Notes']),
    '',
    '## Suggested Next Steps',
    ...((nextStepsCandidates.length ? nextStepsCandidates : fallbackSteps)),
  ].join('\n');
}

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
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
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

function runLocalAlgorithm(action: string, content: string) {
  if (action === 'summarize') {
    return { result: summarizeLocally(content), tokensUsed: 0, provider: 'local-algorithm' };
  }
  if (action === 'tags') {
    return { result: JSON.stringify(generateTagsLocally(content)), tokensUsed: 0, provider: 'local-algorithm' };
  }
  if (action === 'outline') {
    return { result: generateOutlineLocally(content), tokensUsed: 0, provider: 'local-algorithm' };
  }
  return null;
}

// ── Router ────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let action = 'unknown';
  let provider = '';
  try {
    const body = await request.json();
    const { content, action: bodyAction, provider: clientProvider, model: clientModel } = body as {
      content: string;
      action: string;
      provider?: string;
      model?: string;
    };
    action = bodyAction;

    if (!content || !action) {
      return NextResponse.json({ error: 'Missing required fields: content, action' }, { status: 400 });
    }

    const validActions = ['summarize', 'expand', 'improve', 'tags', 'outline'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, { status: 400 });
    }

    const localResult = runLocalAlgorithm(action, content);
    if (localResult) {
      addLog('info', `Local synthesis OK: provider=${localResult.provider}, action=${action}`, 'ai-engine');
      return NextResponse.json({
        result: localResult.result,
        tokensUsed: localResult.tokensUsed,
        usageCount: aiUsageCount,
        provider: localResult.provider,
      });
    }

    // Daily limit reset for AI-backed actions only
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
      aiUsageCount = 0;
      lastResetDate = today;
    }

    const dailyLimit = parseInt(process.env.AI_DAILY_LIMIT || '800', 10);
    if (aiUsageCount >= dailyLimit) {
      return NextResponse.json({ error: 'Daily AI usage limit reached' }, { status: 429 });
    }

    const systemPrompt = SYSTEM_PROMPTS[action] || SYSTEM_PROMPTS.summarize;
    provider = clientProvider || process.env.AI_PROVIDER || detectProvider();
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
        { error: 'No AI provider configured. Set an API key in Settings > AI Engine, or configure ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in your .env file.' },
        { status: 400 },
      );
    }

    aiUsageCount++;

    addLog('info', `AI synthesis OK: provider=${usedProvider}, model=${clientModel || process.env.AI_SYNTHESIS_MODEL || 'default'}, tokens=${tokensUsed}, action=${action}`, 'ai-engine');

    return NextResponse.json({
      result,
      tokensUsed,
      usageCount: aiUsageCount,
      provider: usedProvider,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Synthesis API error:', message);
    addLog('error', `AI synthesis FAILED: ${message} (action=${action || 'unknown'}, provider=${provider || 'unknown'})`, 'ai-engine');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Public model catalogs (no secrets) ───────────────────────────────────
const MODEL_CATALOG: Record<string, { id: string; label: string }[]> = {
  claude: [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { id: 'claude-haiku-4-20250414', label: 'Claude Haiku 4' },
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  gemini: [
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ],
};

/** Key format patterns for client-side validation before saving */
const KEY_PATTERNS: Record<string, { regex: RegExp; hint: string }> = {
  ANTHROPIC_API_KEY: { regex: /^sk-ant-api03-[A-Za-z0-9_-]{80,}$/, hint: 'Claude keys start with sk-ant-api03- (95+ chars)' },
  OPENAI_API_KEY: { regex: /^sk-[A-Za-z0-9_-]{20,}$/, hint: 'OpenAI keys start with sk- (48+ chars)' },
  GEMINI_API_KEY: { regex: /^AIzaSy[A-Za-z0-9_-]{33}$/, hint: 'Gemini keys start with AIzaSy (39 chars)' },
};

// ── Provider GET endpoint — returns which provider is available + models ──
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

  const models: Record<string, { id: string; label: string }[]> = {};
  for (const [prov, isConfigured] of Object.entries(available)) {
    if (isConfigured && MODEL_CATALOG[prov]) {
      models[prov] = MODEL_CATALOG[prov];
    }
  }

  return NextResponse.json({
    provider: defaultProvider,
    available,
    configured,
    model: process.env.AI_SYNTHESIS_MODEL || '',
    models,
    keyPatterns: Object.fromEntries(
      Object.entries(KEY_PATTERNS).map(([k, v]) => [k, { hint: v.hint }]),
    ),
  });
}

/** Auto-detect which provider is available based on API keys */
function detectProvider(): string {
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return '';
}
