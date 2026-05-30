import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type ModelProvider = 'anthropic' | 'openai' | 'deepseek';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
}

export interface ModelMeta {
  provider: ModelProvider;
  label: string;
  contextWindow: number;
}

export const AVAILABLE_MODELS: Record<string, ModelMeta> = {
  // Anthropic Claude
  'claude-opus-4-8':          { provider: 'anthropic', label: 'Claude Opus 4（最强）', contextWindow: 200000 },
  'claude-sonnet-4-6':        { provider: 'anthropic', label: 'Claude Sonnet 4.6（推荐）', contextWindow: 200000 },
  'claude-haiku-4-5-20251001':{ provider: 'anthropic', label: 'Claude Haiku 4.5（快速）', contextWindow: 200000 },
  // OpenAI
  'gpt-4o':                   { provider: 'openai', label: 'GPT-4o（最强）', contextWindow: 128000 },
  'gpt-4o-mini':              { provider: 'openai', label: 'GPT-4o Mini（快速）', contextWindow: 128000 },
  'gpt-4-turbo':              { provider: 'openai', label: 'GPT-4 Turbo', contextWindow: 128000 },
  // DeepSeek
  'deepseek-v4-pro':          { provider: 'deepseek', label: 'DeepSeek V4 Pro（最新旗舰）', contextWindow: 131072 },
  'deepseek-chat':            { provider: 'deepseek', label: 'DeepSeek V3（推荐）', contextWindow: 65536 },
  'deepseek-reasoner':        { provider: 'deepseek', label: 'DeepSeek R1（深度推理）', contextWindow: 65536 },
};

export function estimateTokens(text: string): number {
  // Rough estimate: Chinese ~1.5 chars/token, English ~4 chars/token
  // Mixed content: ~2.5 chars/token average
  return Math.ceil(text.length / 2.5);
}

export async function* streamGenerate(
  systemPrompt: string,
  userMessage: string,
  config: ModelConfig
): AsyncGenerator<string, void, unknown> {
  const { provider, model, apiKey, baseUrl, maxTokens = 4000 } = config;

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const stream = await client.messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        yield chunk.delta.text;
      }
    }
    return;
  }

  // OpenAI and DeepSeek both use OpenAI-compatible SDK
  const clientOptions: ConstructorParameters<typeof OpenAI>[0] = { apiKey };
  if (provider === 'deepseek') {
    clientOptions.baseURL = baseUrl || 'https://api.deepseek.com';
  }
  const client = new OpenAI(clientOptions);

  const stream = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

export async function generateSummary(
  content: string,
  config: ModelConfig
): Promise<string> {
  const { provider, model, apiKey, baseUrl } = config;

  const systemPrompt =
    '你是一位专业的小说助手，负责对章节内容进行简明摘要。摘要需要保留关键情节、人物变化、伏笔状态，供后续章节参考。';
  const userMessage = `请对以下章节内容进行摘要（300字以内），重点保留：情节发展、人物状态变化、未解决的伏笔线索：\n\n${content}`;

  let result = '';

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model,
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    result =
      response.content[0]?.type === 'text' ? response.content[0].text : '';
  } else {
    const clientOptions: ConstructorParameters<typeof OpenAI>[0] = { apiKey };
    if (provider === 'deepseek') {
      clientOptions.baseURL = baseUrl || 'https://api.deepseek.com';
    }
    const client = new OpenAI(clientOptions);
    const response = await client.chat.completions.create({
      model,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });
    result = response.choices[0]?.message?.content || '';
  }

  return result;
}
