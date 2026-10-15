import { normalizeTitle } from './tocSplitter.js';

/**
 * Parses raw text into chapters by matching Table of Contents entries ("Contents")
 * or standard chapter headers.
 */
export function parseTextIntoChapters(text, defaultTitle = 'Bab') {
  if (!text) return [{ title: defaultTitle, content: '', isHtml: false }];

  const lines = text.split(/\r?\n/);
  const tocTitles = [];

  // 1. Look for a "Contents", "Table of Contents", or "Daftar Isi" block
  let inToc = false;
  let tocEndLine = -1;

  for (let i = 0; i < Math.min(lines.length, 250); i++) {
    const line = lines[i].trim();
    if (!inToc) {
      if (/^(contents|table of contents|daftar isi|isi buku)/i.test(line)) {
        inToc = true;
        continue;
      }
    } else {
      if (line.length === 0) {
        if (tocTitles.length > 2) {
          tocEndLine = i;
          break;
        }
      } else if (line.length > 2 && line.length < 100) {
        const cleanT = line.replace(/^\d+[\.\)]\s*/, '').replace(/\.{2,}\s*\d+$/, '').trim();
        if (cleanT.length >= 3) {
          tocTitles.push(cleanT);
        }
      }
    }
  }

  const normTocMap = new Map();
  tocTitles.forEach((t) => {
    const norm = normalizeTitle(t);
    if (norm.length >= 3) normTocMap.set(norm, t);
  });

  const chapters = [];
  let currentTitle = defaultTitle;
  let currentLines = [];

  const startLine = tocEndLine > 0 ? tocEndLine : 0;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const norm = normalizeTitle(trimmed);

    let isBoundary = false;
    let matchedTitle = null;

    if (normTocMap.has(norm)) {
      isBoundary = true;
      matchedTitle = normTocMap.get(norm);
    } else if (trimmed.length > 2 && trimmed.length < 90) {
      for (const [nKey, origTitle] of normTocMap.entries()) {
        if (norm.length >= 4 && nKey.length >= 4 && (norm === nKey || norm.startsWith(nKey) || nKey.startsWith(norm))) {
          isBoundary = true;
          matchedTitle = origTitle;
          break;
        }
      }
      if (!isBoundary && /^(?:bab|chapter|part|bagian|act|scene)\s+[\d\w]+/i.test(trimmed)) {
        isBoundary = true;
        matchedTitle = trimmed;
      }
    }

    if (isBoundary) {
      if (currentLines.length > 0) {
        chapters.push({
          title: currentTitle,
          content: currentLines.join('\n'),
          isHtml: false
        });
      }
      currentTitle = matchedTitle || trimmed;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    chapters.push({
      title: currentTitle,
      content: currentLines.join('\n'),
      isHtml: false
    });
  }

  // Fallback pagination if entire file was unformatted wall of text
  if (chapters.length <= 1 && lines.length > 250) {
    const chunked = [];
    const chunkSize = 200;
    for (let i = 0; i < lines.length; i += chunkSize) {
      const slice = lines.slice(i, i + chunkSize);
      chunked.push({
        title: `${defaultTitle} ${chunked.length + 1}`,
        content: slice.join('\n'),
        isHtml: false
      });
    }
    return chunked;
  }

  return chapters.length > 0 ? chapters : [{ title: defaultTitle, content: text, isHtml: false }];
}
