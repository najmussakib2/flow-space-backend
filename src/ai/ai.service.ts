/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import config from 'config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({ apiKey: configService.get<string>('openai.apiKey')??config.openai.apiKey });
  }

  async summarize(content: string): Promise<string> {
    const res = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Summarize documents concisely in 3-5 bullet points.' },
        { role: 'user', content: `Summarize:\n\n${content}` },
      ],
      max_tokens: 500,
    });
    return res.choices[0].message.content as string;
  }

  async generateSubtasks(taskTitle: string, description?: string): Promise<string[]> {
    const res = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Generate 4-6 actionable subtasks. Return ONLY a JSON array of strings.' },
        { role: 'user', content: description ? `Task: ${taskTitle}\nDescription: ${description}` : `Task: ${taskTitle}` },
      ],
      max_tokens: 400,
    });
    return JSON.parse(res.choices[0].message.content as string);
  }

  async chat(message: string, context?: string): Promise<string> {
    const system = context
      ? `You are a helpful project management assistant. Context:\n\n${context}`
      : 'You are a helpful project management assistant.';
    const res = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: system }, { role: 'user', content: message }],
      max_tokens: 800,
    });
    return res.choices[0].message.content as string;
  }
}