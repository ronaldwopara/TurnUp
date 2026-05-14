import { extractTextFromImage } from "../ocr/extractText";
import { parseTextToExtractionResult } from "./extractEventFromText";
import type { ParsedEvent } from "../parser/parseEvent";
import type { ExtractionResult } from "../extraction/eventSchema";

export async function extractEventFromImage(file: File | Buffer): Promise<ParsedEvent> {
  const text = await extractTextFromImage(file);
  return parseTextToExtractionResult(text).parsedEvent;
}

export async function extractEventExtractionResultFromImage(file: File | Buffer): Promise<{
  parsedEvent: ParsedEvent;
  extractionResult: ExtractionResult;
}> {
  const text = await extractTextFromImage(file);
  return parseTextToExtractionResult(text);
}
