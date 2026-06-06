import { extractFromOcrTextWithLlm } from "../extraction/llmTextCleanup";
import type { ExtractionResult } from "../extraction/eventSchema";
import { extractTextFromImage } from "../ocr/extractText";
import { parseTextToExtractionResult } from "./extractEventFromText";
import type { ParsedEvent } from "../parser/parseEvent";

function parsedEventFromLlmExtraction(extractionResult: ExtractionResult, ocrFallback: string): ParsedEvent {
  const basis =
    extractionResult.extractedText.trim().length >= 8 ? extractionResult.extractedText : ocrFallback;
  const { parsedEvent } = parseTextToExtractionResult(basis);
  const ev = extractionResult.event;
  const c = ev.confidence ?? 0.5;
  const confidencePct = c <= 1 ? Math.round(c * 100) : Math.round(Math.min(100, Math.max(0, c)));
  return {
    ...parsedEvent,
    title: ev.title?.trim() || parsedEvent.title,
    location: ev.location?.trim() || parsedEvent.location,
    description: ev.description?.trim() || parsedEvent.description,
    confidence: confidencePct,
    warnings: Array.from(new Set([...(parsedEvent.warnings ?? []), ...extractionResult.ambiguityNotes])),
  };
}

export async function extractEventFromImage(file: File | Buffer): Promise<ParsedEvent> {
  const { parsedEvent } = await extractEventExtractionResultFromImage(file);
  return parsedEvent;
}

/**
 * Runs OCR, then **mandatory** structured text cleanup via LLM (`TURNUP_LLM_API_KEY` required).
 * Throws if the LLM is unavailable or returns invalid JSON after retries.
 */
export async function extractEventExtractionResultFromImage(file: File | Buffer): Promise<{
  parsedEvent: ParsedEvent;
  extractionResult: ExtractionResult;
}> {
  const ocrText = await extractTextFromImage(file);
  const extractionResult = await extractFromOcrTextWithLlm(ocrText);
  const parsedEvent = parsedEventFromLlmExtraction(extractionResult, ocrText);
  return { parsedEvent, extractionResult };
}
