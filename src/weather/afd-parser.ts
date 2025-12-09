/**
 * AFD Parser
 *
 * Parse NWS Area Forecast Discussion text into structured data.
 */

import type { AFDData, Hazard } from './types';

/**
 * Parse raw AFD text into structured data
 */
export function parseAFD(rawText: string): AFDData {
  const lines = rawText.split('\n');

  return {
    keyMessages: extractKeyMessages(rawText),
    discussion: extractDiscussion(rawText),
    hazards: extractHazards(rawText),
    aviation: extractAviation(rawText),
    issueTime: extractIssueTime(rawText),
    forecaster: extractForecaster(rawText),
    rawText,
  };
}

/**
 * Extract key messages section
 */
function extractKeyMessages(text: string): string[] {
  const messages: string[] = [];

  // Look for .KEY MESSAGES... or similar patterns
  const keyMessagesMatch = text.match(/\.KEY MESSAGES\.\.\.([\s\S]*?)(?=\n\n\.|\n\n&&|$)/i);

  if (keyMessagesMatch) {
    const section = keyMessagesMatch[1];
    // Split by bullet points or numbered items
    const items = section.split(/\n\s*[-*•]\s*|\n\s*\d+\.\s*/);

    for (const item of items) {
      const cleaned = item.trim().replace(/\s+/g, ' ');
      if (cleaned.length > 10) {
        messages.push(cleaned);
      }
    }
  }

  // If no key messages found, extract first substantive paragraph
  if (messages.length === 0) {
    const firstParagraph = text.match(/\n\n([A-Z][^.]+\.[^.]+\.)/);
    if (firstParagraph) {
      messages.push(firstParagraph[1].trim());
    }
  }

  return messages;
}

/**
 * Extract main discussion section
 */
function extractDiscussion(text: string): string {
  // Look for .DISCUSSION... or .SHORT TERM... sections
  const discussionMatch = text.match(
    /(?:\.DISCUSSION\.\.\.|\.SHORT TERM\.\.\.)([\s\S]*?)(?=\n\n\.|\n\n&&|$)/i
  );

  if (discussionMatch) {
    return cleanText(discussionMatch[1]);
  }

  // Fallback: extract everything between header and aviation
  const bodyMatch = text.match(/\n\n([\s\S]*?)(?=\.AVIATION|&&|$)/);
  if (bodyMatch) {
    return cleanText(bodyMatch[1]).slice(0, 2000); // Limit length
  }

  return '';
}

/**
 * Extract hazard information
 */
function extractHazards(text: string): Hazard[] {
  const hazards: Hazard[] = [];

  // Look for WATCH, WARNING, ADVISORY mentions
  const hazardPatterns = [
    /HIGH WIND (WATCH|WARNING|ADVISORY)[^.]*\./gi,
    /WINTER (STORM|WEATHER) (WATCH|WARNING|ADVISORY)[^.]*\./gi,
    /BLIZZARD (WATCH|WARNING)[^.]*\./gi,
    /FREEZE (WATCH|WARNING)[^.]*\./gi,
    /WIND CHILL (WATCH|WARNING|ADVISORY)[^.]*\./gi,
    /FIRE WEATHER (WATCH|WARNING)[^.]*\./gi,
    /RED FLAG (WATCH|WARNING)[^.]*\./gi,
  ];

  for (const pattern of hazardPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const fullMatch = match[0];
      hazards.push({
        type: extractHazardType(fullMatch),
        areas: extractAreas(text, match.index || 0),
        timing: extractTiming(fullMatch),
        description: cleanText(fullMatch),
      });
    }
  }

  return hazards;
}

/**
 * Extract hazard type from text
 */
function extractHazardType(text: string): string {
  const typeMatch = text.match(/(HIGH WIND|WINTER STORM|WINTER WEATHER|BLIZZARD|FREEZE|WIND CHILL|FIRE WEATHER|RED FLAG)\s*(WATCH|WARNING|ADVISORY)/i);
  return typeMatch ? `${typeMatch[1]} ${typeMatch[2]}` : 'HAZARD';
}

/**
 * Extract affected areas near hazard mention
 */
function extractAreas(text: string, position: number): string[] {
  // Look for zone codes or area names near the hazard mention
  const nearbyText = text.slice(Math.max(0, position - 200), position + 500);

  // Match zone codes like COZ039, COZ040
  const zoneMatches = nearbyText.match(/[A-Z]{2}Z\d{3}/g);
  if (zoneMatches) {
    return [...new Set(zoneMatches)];
  }

  // Match area names
  const areaMatch = nearbyText.match(/(?:for|across|in)\s+(?:the\s+)?([^.]+?)(?:from|through|after|\.)/i);
  if (areaMatch) {
    return [areaMatch[1].trim()];
  }

  return ['Denver Metro Area'];
}

/**
 * Extract timing from hazard text
 */
function extractTiming(text: string): string {
  const timingMatch = text.match(
    /(?:from|beginning|starting|through|until|ending)\s+([^.]+?)(?:\.|\s+for\s+)/i
  );
  return timingMatch ? timingMatch[1].trim() : '';
}

/**
 * Extract aviation section
 */
function extractAviation(text: string): string {
  const aviationMatch = text.match(/\.AVIATION\.\.\.([\s\S]*?)(?=\n\n\.|\n\n&&|$)/i);
  return aviationMatch ? cleanText(aviationMatch[1]) : '';
}

/**
 * Extract issue time from header
 */
function extractIssueTime(text: string): string {
  // Match patterns like "413 PM MST Sun Dec 7 2025"
  const timeMatch = text.match(/(\d{1,4}\s*(?:AM|PM)\s*[A-Z]{3}\s*\w+\s*\w+\s*\d+\s*\d{4})/i);
  return timeMatch ? timeMatch[1].trim() : new Date().toISOString();
}

/**
 * Extract forecaster initials
 */
function extractForecaster(text: string): string {
  // Look for initials at end like "...Smith" or ".../Smith"
  const forecasterMatch = text.match(/(?:\.{3}|\/)\s*(\w+)\s*$/m);
  return forecasterMatch ? forecasterMatch[1] : 'NWS Boulder';
}

/**
 * Clean text by removing extra whitespace and formatting
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\.{3,}/g, '...')
    .trim();
}
