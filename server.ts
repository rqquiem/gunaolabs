import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const TTS_MODEL = 'gemini-3.8-flash-lite-tts';

const ALLOWED_VOICES = new Set(['Charon', 'Fenrir', 'Kore', 'Puck', 'Zephyr']);

const STYLE_PROMPTS: Record<string, string> = {
  warmStoryteller:
    'Warm, engaging animated film narrator with crisp comedic timing and clear articulation.',
  cinematicTrailer:
    'Deep, dramatic cinematic trailer narrator with bold pauses and theatrical gravitas.',
  snappyComedy:
    'Fast, punchy comedic storyteller with playful inflections and energetic punchlines.',
  documentary:
    'Calm, articulate documentary narrator with steady studio clarity and poised delivery.',
  energeticHost:
    'Upbeat, expressive short-form video host with bright energy and dynamic emphasis.',
};

const DIALOGUE_STYLE_PROMPT =
  'Expressive animated character dialogue with lively, natural vocal acting and clear diction.';

const MAX_TEXT_LENGTH = 500;
const MAX_CACHE_ENTRIES = 96;

interface CachedWav {
  buffer: Buffer;
  createdAt: number;
}

const ttsCache = new Map<string, CachedWav>();

function getCache(key: string): Buffer | null {
  const hit = ttsCache.get(key);
  if (!hit) return null;
  // Refresh LRU recency
  ttsCache.delete(key);
  ttsCache.set(key, hit);
  return hit.buffer;
}

function setCache(key: string, buffer: Buffer): void {
  if (ttsCache.has(key)) {
    ttsCache.delete(key);
  } else if (ttsCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = ttsCache.keys().next().value;
    if (oldestKey) {
      ttsCache.delete(oldestKey);
    }
  }
  ttsCache.set(key, { buffer, createdAt: Date.now() });
}

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function stripEmphasisMarkers(raw: string): string {
  return raw
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/narrator/status', (_req: Request, res: Response) => {
    const aiAvailable = Boolean(process.env.GEMINI_API_KEY?.trim());
    res.json({
      aiAvailable,
      model: TTS_MODEL,
      voices: Array.from(ALLOWED_VOICES),
    });
  });

  app.post('/api/narrator/tts', async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        text?: unknown;
        voice?: unknown;
        style?: unknown;
        role?: unknown;
      } | null;

      if (!body || typeof body.text !== 'string') {
        res.status(400).json({ error: 'Missing required speech text.' });
        return;
      }

      const cleanedText = stripEmphasisMarkers(body.text);
      if (!cleanedText) {
        res.status(400).json({ error: 'Speech text cannot be empty.' });
        return;
      }
      if (cleanedText.length > MAX_TEXT_LENGTH) {
        res.status(400).json({
          error: `Speech text exceeds ${MAX_TEXT_LENGTH} character limit.`,
        });
        return;
      }

      const voice =
        typeof body.voice === 'string' && ALLOWED_VOICES.has(body.voice)
          ? body.voice
          : 'Charon';

      const styleKey =
        typeof body.style === 'string' && Object.prototype.hasOwnProperty.call(STYLE_PROMPTS, body.style)
          ? body.style
          : 'warmStoryteller';

      const role = body.role === 'dialogue' ? 'dialogue' : 'voiceover';
      const styleInstruction =
        role === 'dialogue'
          ? DIALOGUE_STYLE_PROMPT
          : STYLE_PROMPTS[styleKey];

      const cacheKey = `${TTS_MODEL}|${voice}|${role}|${styleKey}|${cleanedText}`;
      const cached = getCache(cacheKey);
      if (cached) {
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Cache-Control', 'private, max-age=3600');
        res.setHeader('X-Narrator-Cache', 'HIT');
        res.status(200).send(cached);
        return;
      }

      const ai = createGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: 'AI studio narrator is unavailable because GEMINI_API_KEY is not configured.',
          fallbackRecommended: true,
        });
        return;
      }

      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanedText,
                speechMetadata: {
                  style: styleInstruction,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.status(502).json({
          error: 'Narrator model returned no audio data.',
        });
        return;
      }

      // Unary Gemini 3.8 TTS returns a complete 24kHz mono 16-bit WAV file
      const wavBuffer = Buffer.from(base64Audio, 'base64');
      setCache(cacheKey, wavBuffer);

      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Narrator-Cache', 'MISS');
      res.status(200).send(wavBuffer);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate narrator voice.';
      const status =
        /429|RESOURCE_EXHAUSTED/i.test(message)
          ? 429
          : /403|PERMISSION_DENIED|API_KEY_INVALID/i.test(message)
            ? 403
            : 500;
      res.status(status).json({ error: message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Stagecraft 3D server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
