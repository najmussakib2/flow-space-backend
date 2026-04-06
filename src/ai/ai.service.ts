/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import config from 'config';   // your custom config file

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

type AiProvider = 'groq' | 'openai' | 'anthropic';

@Injectable()
export class AiService {
  private groq: Groq;
  private openai: OpenAI;
  private anthropic: Anthropic;

  private currentProvider: AiProvider = 'groq'; // Default provider

  constructor(private configService: ConfigService) {
    // Initialize all three clients
    this.groq = new Groq({
      apiKey: this.getApiKey('groq'),
    });

    this.openai = new OpenAI({
      apiKey: this.getApiKey('openai'),
    });

    this.anthropic = new Anthropic({
      apiKey: this.getApiKey('anthropic'),
    });

    // Determine which provider to use (supports both ConfigService and your custom config)
    const providerFromEnv = this.configService.get<string>('AI_PROVIDER')?.toLowerCase();
    const providerFromConfig = config.ai?.provider?.toLowerCase();

    const provider = (providerFromEnv || providerFromConfig) as AiProvider | undefined;

    if (provider && ['groq', 'openai', 'anthropic'].includes(provider)) {
      this.currentProvider = provider;
      console.log(`🚀 AI Provider initialized: ${this.currentProvider.toUpperCase()}`);
    } else {
      console.log(`🚀 AI Provider initialized (default): GROQ`);
    }
  }

  /**
   * Helper to get API key with fallback:
   * 1. Try ConfigService (env)
   * 2. Fallback to your custom config object
   */
  private getApiKey(provider: 'groq' | 'openai' | 'anthropic'): string {
    let key: string | undefined;

    if (provider === 'groq') {
      key = this.configService.get<string>('GROQ_API_KEY') ?? config.ai.groq_apiKey;
    } 
    else if (provider === 'openai') {
      key = this.configService.get<string>('OPENAI_API_KEY') ?? config.ai.openai_apiKey;
    } 
    else if (provider === 'anthropic') {
      key = this.configService.get<string>('ANTHROPIC_API_KEY') ?? 
            config.ai.claude_anthropic_apiKey;
    }

    if (!key) {
      throw new Error(`API key for ${provider.toUpperCase()} is missing`);
    }

    return key;
  }

  /** Switch provider at runtime (optional) */
  setProvider(provider: AiProvider): void {
    this.currentProvider = provider;
    console.log(`🔄 AI Provider switched to: ${provider.toUpperCase()}`);
  }

  getCurrentProvider(): AiProvider {
    return this.currentProvider;
  }

  private async complete(
    system: string,
    prompt: string,
    maxTokens = 800,
  ): Promise<string> {
    switch (this.currentProvider) {
      case 'groq':
        return this.completeWithGroq(system, prompt, maxTokens);

      case 'openai':
        return this.completeWithOpenAI(system, prompt, maxTokens);

      case 'anthropic':
        return this.completeWithAnthropic(system, prompt, maxTokens);

      default:
        throw new Error(`Unsupported AI provider: ${this.currentProvider}`);
    }
  }

  // ====================== Groq ======================
  private async completeWithGroq(system: string, prompt: string, maxTokens: number): Promise<string> {
    const res = await this.groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    });
    return res.choices[0]?.message?.content ?? '';
  }

  // ====================== OpenAI ======================
  private async completeWithOpenAI(system: string, prompt: string, maxTokens: number): Promise<string> {
    const res = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    });
    return res.choices[0]?.message?.content ?? '';
  }

  // ====================== Anthropic ======================
  private async completeWithAnthropic(system: string, prompt: string, maxTokens: number): Promise<string> {
    const res = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    });

    return (res.content[0] as any)?.text ?? '';
  }

  // ====================== Public Methods ======================
  async summarize(content: string): Promise<string> {
    return this.complete(
      'Summarize documents concisely in 3-5 bullet points.',
      `Summarize:\n\n${content}`,
      500,
    );
  }

  async generateSubtasks(taskTitle: string, description?: string): Promise<string[]> {
    const prompt = description
      ? `Task: ${taskTitle}\nDescription: ${description}`
      : `Task: ${taskTitle}`;

    const raw = await this.complete(
      'Generate 4-6 actionable subtasks. Return ONLY a JSON array of strings, no markdown. Example: ["Task 1", "Task 2"]',
      prompt,
      400,
    );

    try {
      return JSON.parse(raw.trim());
    } catch {
      console.error('AI subtasks JSON parse failed:', raw);
      throw new Error('Failed to generate subtasks');
    }
  }

  async chat(message: string, context?: string): Promise<string> {
    const system = context
      ? `You are a helpful project management assistant. Context:\n\n${context}`
      : 'You are a helpful project management assistant.';

    return this.complete(system, message, 800);
  }
}