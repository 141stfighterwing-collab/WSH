import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPTS: Record<string, string> = {
  summarize: 'Summarize the following note concisely while preserving key information.',
  expand: 'Expand on the following note with more detail, examples, and context.',
  improve: 'Improve the writing quality of the following note, fixing grammar and enhancing clarity.',
  tags: 'Suggest relevant tags for the following note. Return only a JSON array of tag strings, no other text. Example: ["tag1", "tag2", "tag3"]',
  outline: 'Generate a structured outline based on the following note content.',
};

let aiUsageCount = 0;
let lastResetDate = new Date().toDateString();

export async function POST(request: NextRequest) {
  try {
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
      aiUsageCount = 0;
      lastResetDate = today;
    }

    const dailyLimit = parseInt(process.env.AI_DAILY_LIMIT || '800', 10);
    if (aiUsageCount >= dailyLimit) {
      return NextResponse.json(
        { error: 'Daily AI usage limit reached' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { content, action } = body as { content: string; action: string };

    if (!content || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: content, action' },
        { status: 400 }
      );
    }

    const validActions = ['summarize', 'expand', 'improve', 'tags', 'outline'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const systemPrompt = SYSTEM_PROMPTS[action] || SYSTEM_PROMPTS.summarize;
    const model = process.env.AI_SYNTHESIS_MODEL || 'glm-4-flash';
    const temperature = parseFloat(process.env.AI_SYNTHESIS_TEMPERATURE || '0.7');
    const maxTokens = parseInt(process.env.AI_SYNTHESIS_MAX_TOKENS || '4096', 10);

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      temperature,
      max_tokens: maxTokens,
      model,
    });

    const result = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    aiUsageCount++;

    return NextResponse.json({ result, tokensUsed, usageCount: aiUsageCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Synthesis API error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
