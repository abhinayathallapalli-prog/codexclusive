/**
 * Transcript Quality & Clinical Normalization Pipeline.
 * Adheres to MediKiosk Speech Architecture:
 * 1. Preserves raw spoken text exactly as transcribed (Hinglish/Tenglish/Regional medical code-switching).
 * 2. Normalizes whitespaces, removes streaming artifact duplicates, cleans punctuation safely.
 * 3. Never invents medical facts or aggressively translates during transcription.
 * 4. Distinctly maintains rawSpeechTranscript, normalizedTranscript, patientConfirmedTranscript, and clinicalExtraction.
 */

export interface ProcessedTranscriptResult {
  rawTranscript: string;
  normalizedTranscript: string;
  detectedLanguage?: string;
  confidenceScore?: number;
  wordCount: number;
  containsAyurvedicTerms: boolean;
  detectedAyurvedicTerms: string[];
}

const COMMON_AYURVEDIC_KEYWORDS = [
  'vata', 'वात',
  'pitta', 'पित्त',
  'kapha', 'कफ',
  'dosha', 'दोष',
  'agni', 'अग्नि',
  'ama', 'आम',
  'dhatu', 'धातु',
  'mala', 'मल',
  'nadi', 'नाड़ी',
  'prakriti', 'प्रकृति',
  'vikriti', 'विकृति',
  'ayurveda', 'आयुर्वेद',
  'ayush', 'आयुष',
  'amlapitta', 'अम्लपित्त',
  'mandagni', 'मंदाग्नि',
  'dashavidha', 'दशविध',
];

/**
 * Clean whitespace and standardize spacing around punctuation without destroying natural scripts.
 */
export function cleanWhitespaceAndPunctuation(text: string): string {
  if (!text) return '';

  return (
    text
      // Normalize Unicode spaces
      .replace(/[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
      // Remove multiple consecutive spaces/tabs
      .replace(/[ \t]+/g, ' ')
      // Standardize spacing before punctuation marks (English and Indic purna viram)
      .replace(/\s+([.,!?:;|।])/g, '$1')
      // Ensure space after punctuation if missing (except at end of line)
      .replace(/([.,!?:;|।])([^\s0-9.,!?:;|।])/g, '$1 $2')
      .trim()
  );
}

/**
 * Remove accidental duplicate phrases caused by streaming interim buffer overlaps.
 * E.g., "headache for three days headache for three days" -> "headache for three days"
 */
export function deduplicateStreamingOverlaps(text: string): string {
  if (!text || text.length < 10) return text;

  const words = text.split(/\s+/);
  if (words.length < 4) return text;

  // Check for repeated half or whole sentence chunks
  const len = words.length;
  for (let windowSize = Math.floor(len / 2); windowSize >= 2; windowSize--) {
    for (let i = 0; i <= len - 2 * windowSize; i++) {
      const chunkA = words.slice(i, i + windowSize).join(' ').toLowerCase();
      const chunkB = words.slice(i + windowSize, i + 2 * windowSize).join(' ').toLowerCase();

      if (chunkA === chunkB && chunkA.length > 5) {
        // Remove the repeated duplicate chunk
        words.splice(i + windowSize, windowSize);
        return deduplicateStreamingOverlaps(words.join(' '));
      }
    }
  }

  return words.join(' ');
}

/**
 * Main normalization pipeline.
 * Keeps rawTranscript pristine while generating a clean, human-readable normalized version.
 */
export function processRawTranscript(
  rawTranscript: string,
  detectedLanguage?: string,
  confidenceScore?: number
): ProcessedTranscriptResult {
  const cleanRaw = (rawTranscript || '').trim();

  // Deduplicate and normalize
  const deduplicated = deduplicateStreamingOverlaps(cleanRaw);
  const normalized = cleanWhitespaceAndPunctuation(deduplicated);

  // Detect Ayurvedic and clinical vocabulary in the text
  const lowerNormalized = normalized.toLowerCase();
  const detectedAyurvedicTerms = COMMON_AYURVEDIC_KEYWORDS.filter((term) =>
    lowerNormalized.includes(term.toLowerCase())
  );

  return {
    rawTranscript: cleanRaw,
    normalizedTranscript: normalized,
    detectedLanguage: detectedLanguage || undefined,
    confidenceScore: typeof confidenceScore === 'number' ? Math.round(confidenceScore * 100) / 100 : undefined,
    wordCount: normalized ? normalized.split(/\s+/).length : 0,
    containsAyurvedicTerms: detectedAyurvedicTerms.length > 0,
    detectedAyurvedicTerms,
  };
}
