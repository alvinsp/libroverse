/**
 * Smart TOC and Chapter Boundary Splitting Engine
 */

export function normalizeTitle(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s\d]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits an HTML document into multiple chapters if elements match entries from
 * the book's Table of Contents ("Contents"), or denote distinct section headings.
 * Matching text becomes the title of the next chapter.
 */
export function splitHtmlByTocOrHeadings(chDoc, tocTitles = []) {
  if (!chDoc || !chDoc.body) return null;

  const normTocMap = new Map();
  tocTitles.forEach((t) => {
    const raw = t.trim();
    const norm = normalizeTitle(raw);
    if (norm.length >= 3) {
      normTocMap.set(norm, raw);
    }
  });

  // Unwrap single outer containers (e.g. body > section or body > div)
  let root = chDoc.body;
  while (
    root.children.length === 1 &&
    ['section', 'div', 'main', 'article'].includes(root.firstElementChild.tagName.toLowerCase())
  ) {
    root = root.firstElementChild;
  }

  const childNodes = Array.from(root.childNodes).filter((n) => {
    return n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
  });

  if (childNodes.length === 0) return null;

  const boundaryIndices = [];

  childNodes.forEach((node, idx) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node;
    const tag = el.tagName.toLowerCase();
    const cleanText = el.textContent.trim();

    // Check heading inside el or el itself
    const headingEl = el.querySelector('h1, h2, h3, h4, [class*="title"], [class*="heading"]');
    const targetText = headingEl ? headingEl.textContent.trim() : cleanText;
    const norm = normalizeTitle(targetText);

    let matchedTitle = null;

    // 1. Direct or fuzzy match with known Table of Contents item ("content")
    if (normTocMap.has(norm)) {
      matchedTitle = normTocMap.get(norm);
    } else {
      for (const [nKey, origTitle] of normTocMap.entries()) {
        if (norm.length >= 4 && nKey.length >= 4) {
          if (norm === nKey || norm.startsWith(nKey) || nKey.startsWith(norm)) {
            matchedTitle = origTitle;
            break;
          }
        }
      }
    }

    // 2. Fallback: Check explicit heading tags (h1, h2, h3)
    if (!matchedTitle && (tag === 'h1' || tag === 'h2' || tag === 'h3' || headingEl)) {
      if (targetText.length >= 3 && targetText.length <= 120) {
        matchedTitle = targetText;
      }
    }

    // 3. Fallback: Check standard chapter patterns in text
    if (!matchedTitle && (tag.startsWith('h') || tag === 'p' || tag === 'div')) {
      if (/^(part|bagian|book|jilid|chapter|bab|act|scene)\s+[\d\w]+/i.test(targetText) && targetText.length <= 120) {
        matchedTitle = targetText;
      }
    }

    if (matchedTitle) {
      boundaryIndices.push({
        index: idx,
        title: matchedTitle,
        element: el
      });
    }
  });

  if (boundaryIndices.length === 0) {
    return null;
  }

  // If exactly 1 boundary at start, treat that boundary title as the chapter title
  const firstBoundaryIdx = boundaryIndices[0].index;
  if (boundaryIndices.length === 1 && firstBoundaryIdx === 0) {
    return [{
      title: boundaryIndices[0].title,
      content: root.innerHTML,
      isHtml: true
    }];
  }

  const splitChapters = [];

  // Content before first boundary (frontmatter, dedication, or intro)
  if (firstBoundaryIdx > 0) {
    const preContainer = document.createElement('div');
    for (let i = 0; i < firstBoundaryIdx; i++) {
      preContainer.appendChild(childNodes[i].cloneNode(true));
    }
    const preText = preContainer.textContent.trim();
    if (preText.length > 20 || preContainer.querySelector('img')) {
      splitChapters.push({
        title: 'Halaman Pembuka',
        content: preContainer.innerHTML,
        isHtml: true
      });
    }
  }

  // Chapters from each boundary
  for (let b = 0; b < boundaryIndices.length; b++) {
    const curr = boundaryIndices[b];
    const nextIdx = b < boundaryIndices.length - 1 ? boundaryIndices[b + 1].index : childNodes.length;

    const chContainer = document.createElement('div');
    for (let i = curr.index; i < nextIdx; i++) {
      chContainer.appendChild(childNodes[i].cloneNode(true));
    }

    splitChapters.push({
      title: curr.title,
      content: chContainer.innerHTML,
      isHtml: true
    });
  }

  return splitChapters.length > 0 ? splitChapters : null;
}
