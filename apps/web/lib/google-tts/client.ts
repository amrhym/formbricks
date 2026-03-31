import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";

interface Voice {
  name: string;
  languageCodes: string[];
  ssmlGender: string;
  naturalSampleRateHertz: number;
}

interface SynthesizeRequest {
  text: string;
  languageCode: string;
  voiceName: string;
}

let cachedApiKey: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000;

async function getApiKey(): Promise<string | null> {
  if (cachedApiKey && Date.now() - cacheTime < CACHE_TTL) return cachedApiKey;

  try {
    const integration = await prisma.integration.findFirst({
      where: { type: "googleAi" },
      select: { config: true },
    });
    const key = (integration?.config as any)?.key?.apiKey;
    if (key) {
      cachedApiKey = key;
      cacheTime = Date.now();
      return key;
    }
  } catch {
    // DB not available
  }

  cachedApiKey = process.env.GOOGLE_API_KEY || null;
  cacheTime = Date.now();
  return cachedApiKey;
}

export async function isGoogleTtsConfigured(): Promise<boolean> {
  return !!(await getApiKey());
}

export async function synthesizeSpeech(request: SynthesizeRequest): Promise<Buffer> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("Google TTS not configured");

  const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text: request.text },
      voice: { languageCode: request.languageCode, name: request.voiceName },
      // LINEAR16 PCM 8kHz mono — Genesys Cloud prompts require standard PCM WAV
      audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 8000 },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ status: response.status, error }, "Google TTS API error");
    throw new Error(`Google TTS error: ${response.status}`);
  }

  const data = await response.json();
  const audioBuffer = Buffer.from(data.audioContent, "base64");
  // LINEAR16 returns raw PCM — always needs WAV header
  return addWavHeader(audioBuffer, 8000, 16, 1);
}

export async function listVoices(languageCode?: string): Promise<Voice[]> {
  const apiKey = await getApiKey();
  if (!apiKey) return [];

  const url = languageCode
    ? `https://texttospeech.googleapis.com/v1/voices?languageCode=${languageCode}&key=${apiKey}`
    : `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();
  return data.voices || [];
}

/**
 * Wrap raw audio data in a WAV container.
 * @param audioFormat 1=PCM, 7=MULAW (u-law)
 */
function addWavHeader(
  pcmData: Buffer,
  sampleRate: number,
  bitsPerSample: number,
  channels: number,
  audioFormat: number = 1
): Buffer {
  const byteRate = (sampleRate * bitsPerSample * channels) / 8;
  const blockAlign = (bitsPerSample * channels) / 8;
  const dataSize = pcmData.length;
  const headerSize = 44;
  const header = Buffer.alloc(headerSize);
  header.write("RIFF", 0);
  header.writeUInt32LE(dataSize + headerSize - 8, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(audioFormat, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmData]);
}
