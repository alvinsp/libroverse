/**
 * EPUB Content Normalizer & Typography Beautifier
 *
 * Converts raw, messy publisher EPUB markup into clean, accessible,
 * beautifully readable book typography matching "The Celestial Odyssey".
 *
 * Key Capabilities:
 * 1. Distinguishes chapter main titles vs sub-headings vs body content.
 * 2. Eliminates duplicate chapter titles (prevents title from appearing both in reader-h1 and content body).
 * 3. Formats sub-headings (.reader-subheading) with elegant typography and accents.
 * 4. Cleanses destructive publisher inline styles (hardcoded fonts, black-on-black colors, crushed line-heights).
 * 5. Decorates lead paragraphs with classic book drop-caps.
 * 6. Structures callouts/exercises (.reader-exercise-box) and blockquotes (.reader-quote).
 * 7. Ensures images are centered, responsive, and retina-ready.
 */

import { escapeHtml } from '../../utils/domUtils.js';

export function normalizeTitle(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s\d]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove destructive inline styles and publisher clutter while keeping safe layout cues
 */
export function sanitizeElement(el) {
  if (!el || el.nodeType !== 1) return;

  // Obsolete presentation attributes to strip
  const obsoleteAttrs = [
    'color', 'face', 'size', 'bgcolor', 'background', 'border',
    'cellpadding', 'cellspacing', 'valign', 'clear', 'link', 'vlink', 'alink'
  ];
  obsoleteAttrs.forEach((attr) => el.removeAttribute(attr));

  // Strip fixed dimensions on non-media elements
  const tag = el.tagName.toLowerCase();
  if (tag !== 'img' && tag !== 'svg' && tag !== 'video' && tag !== 'canvas') {
    el.removeAttribute('width');
    el.removeAttribute('height');
  }

  // Sanitize style attribute
  if (el.hasAttribute('style')) {
    const rawStyle = el.getAttribute('style') || '';
    const safeStyleParts = [];

    // Parse style properties
    const rules = rawStyle.split(';').map((r) => r.trim()).filter(Boolean);
    rules.forEach((rule) => {
      const colonIdx = rule.indexOf(':');
      if (colonIdx === -1) return;
      const prop = rule.substring(0, colonIdx).trim().toLowerCase();
      const val = rule.substring(colonIdx + 1).trim();

      // Destructive styles that break theme, fonts, and responsiveness
      const isDestructive =
        prop.includes('color') ||
        prop.includes('background') ||
        prop.includes('font-family') ||
        prop.includes('font-size') ||
        prop.includes('line-height') ||
        prop.includes('margin') ||
        prop.includes('padding') ||
        prop.includes('text-indent') ||
        prop === 'width' ||
        prop === 'height' ||
        prop === 'letter-spacing';

      if (!isDestructive) {
        // Allow safe properties such as text-align, font-style, font-weight, text-decoration
        if (['text-align', 'font-style', 'font-weight', 'text-decoration', 'display'].includes(prop)) {
          safeStyleParts.push(`${prop}: ${val}`);
        }
      }
    });

    if (safeStyleParts.length > 0) {
      el.setAttribute('style', safeStyleParts.join('; '));
    } else {
      el.removeAttribute('style');
    }
  }

  // Clean publisher CSS class noise (e.g. calibre1, calibre2, MsoNormal, Apple-converted-space)
  if (el.hasAttribute('class')) {
    const classes = el.className.split(/\s+/).filter((c) => {
      const lower = c.toLowerCase();
      if (!lower) return false;
      if (lower.startsWith('calibre')) return false;
      if (lower.startsWith('mso')) return false;
      if (lower.startsWith('apple-')) return false;
      if (lower === 'para-standard' || lower === 'p-initial' || lower === 'standard' || lower === 'noindent') return false;
      return true;
    });

    if (classes.length > 0) {
      el.setAttribute('class', classes.join(' '));
    } else {
      el.removeAttribute('class');
    }
  }

  // Recursively sanitize children
  Array.from(el.children).forEach((child) => sanitizeElement(child));
}

/**
 * Normalizes an EPUB chapter's HTML content:
 * - Detects and extracts the main chapter title (or verifies matching preferredTitle)
 * - Removes the duplicate chapter title from the body
 * - Detects and upgrades internal subheadings to <h2 class="reader-subheading">
 * - Adds drop-cap styling class to the lead paragraph
 * - Formats exercise/callout boxes and quotes
 */
export function normalizeEpubChapter(rawHtml, preferredTitle = '', tocTitles = []) {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return {
      title: preferredTitle || 'Bab Pembuka',
      content: '<p><em>Konten tidak tersedia.</em></p>'
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
  const root = doc.body.firstElementChild || doc.body;

  // 1. Remove unwanted elements (scripts, styles, links, meta, comments)
  root.querySelectorAll('script, style, link, meta, noscript, applet, object').forEach((n) => n.remove());

  // 2. Unwrap redundant single-child structural containers (div, section, article)
  let container = root;
  while (
    container.children.length === 1 &&
    ['section', 'div', 'main', 'article'].includes(container.firstElementChild.tagName.toLowerCase())
  ) {
    container = container.firstElementChild;
  }

  // 3. Sanitize inline styles and attributes across all elements
  sanitizeElement(container);

  // 4. Build a lookup map of known Table of Contents items
  const normTocMap = new Map();
  tocTitles.forEach((t) => {
    const raw = t.trim();
    const norm = normalizeTitle(raw);
    if (norm.length >= 3) {
      normTocMap.set(norm, raw);
    }
  });

  // 5. Intelligent Chapter Title Detection & Deduplication
  // Examine the beginning child elements (first 1 to 4 block nodes)
  const childNodes = Array.from(container.children);
  let detectedTitle = (preferredTitle || '').trim();
  const nodesToRemove = [];

  // Check if first elements represent a Chapter Label + Title pair (e.g. "Chapter 1" + "The Echo")
  if (childNodes.length >= 2) {
    const el1 = childNodes[0];
    const el2 = childNodes[1];
    const t1 = el1.textContent.trim();
    const t2 = el2.textContent.trim();

    const isChapLabel = /^(chapter|bab|part|bagian|book|jilid|volume|act)\s+[\d\wivxlcdm]+/i.test(t1) && t1.length <= 40;
    const isChapName = t2.length >= 2 && t2.length <= 120 && (el2.tagName.startsWith('H') || el2.className.includes('title'));

    if (isChapLabel && isChapName) {
      detectedTitle = `${t1}: ${t2}`;
      nodesToRemove.push(el1, el2);
    }
  }

  // If not matched as a pair, inspect the first element(s)
  if (nodesToRemove.length === 0 && childNodes.length > 0) {
    const firstEl = childNodes[0];
    const firstText = firstEl.textContent.trim();
    const firstNorm = normalizeTitle(firstText);
    const prefNorm = normalizeTitle(detectedTitle);

    // Case A: First element text matches or starts with the preferred title
    if (prefNorm && (firstNorm === prefNorm || firstNorm.startsWith(prefNorm) || prefNorm.startsWith(firstNorm))) {
      detectedTitle = detectedTitle || firstText;
      nodesToRemove.push(firstEl);
    }
    // Case B: First element text matches a known TOC entry
    else if (normTocMap.has(firstNorm)) {
      detectedTitle = normTocMap.get(firstNorm);
      nodesToRemove.push(firstEl);
    }
    // Case C: First element is an explicit h1 or title tag at the start of the chapter
    else if (firstEl.tagName === 'H1' || (firstEl.tagName === 'H2' && firstText.length <= 90)) {
      if (!detectedTitle || detectedTitle.startsWith('Bab ') || detectedTitle.startsWith('Bagian ')) {
        detectedTitle = firstText;
      }
      nodesToRemove.push(firstEl);
    }
  }

  // Remove the detected title element(s) from the content body so it does NOT duplicate reader-h1
  nodesToRemove.forEach((n) => n.remove());

  // 6. Subheading Recognition & Body Normalization
  // Identify remaining section headings, subtitles, exercise callouts, blockquotes, and lead paragraph
  let foundFirstLeadParagraph = false;
  const remainingElements = Array.from(container.children);

  remainingElements.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const text = el.textContent.trim();
    const lowerClasses = (el.className || '').toLowerCase();

    // Check for Exercise / Callout Box
    const exerciseMatch = text.match(/^\[?(Exercise|Latihan|Reflection|Refleksi|Case Study|Studi Kasus|Catatan|Note):?\s*([^\]\n]*)\]?/i);
    if (exerciseMatch || lowerClasses.includes('exercise') || lowerClasses.includes('reflection')) {
      const badgeText = exerciseMatch ? `${exerciseMatch[1]}` : 'Catatan Khusus';
      const bodyText = exerciseMatch ? text.replace(exerciseMatch[0], '').trim() : text;

      const calloutBox = document.createElement('div');
      calloutBox.className = 'reader-exercise-box';
      calloutBox.innerHTML = `
        <div class="reader-exercise-badge">💡 ${escapeHtml(badgeText)}</div>
        <div class="reader-exercise-text">${bodyText ? `<p>${escapeHtml(bodyText)}</p>` : el.innerHTML}</div>
      `;
      el.replaceWith(calloutBox);
      return;
    }

    // Check for Sub-headings (Internal section titles)
    const isHeadingTag = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag);
    const hasSubheadClass =
      lowerClasses.includes('subheading') ||
      lowerClasses.includes('subtitle') ||
      lowerClasses.includes('section-title') ||
      lowerClasses.includes('subhead');
    const isBoldShortLine =
      (tag === 'p' || tag === 'div') &&
      text.length >= 3 &&
      text.length <= 80 &&
      !/[.?!,;:]$/.test(text) &&
      (el.querySelector('b, strong') !== null || el.style.fontWeight === 'bold');

    if (isHeadingTag || hasSubheadClass || isBoldShortLine) {
      const subhead = document.createElement('h2');
      subhead.className = 'reader-subheading';
      subhead.textContent = text;
      el.replaceWith(subhead);
      return;
    }

    // Check for Blockquotes
    if (tag === 'blockquote' || lowerClasses.includes('quote') || lowerClasses.includes('blockquote')) {
      el.classList.add('reader-quote');
      return;
    }

    // Check for Images
    if (tag === 'img' || el.querySelector('img')) {
      const imgs = el.tagName === 'IMG' ? [el] : Array.from(el.querySelectorAll('img'));
      imgs.forEach((img) => {
        img.classList.add('reader-img');
        img.setAttribute('loading', 'lazy');
      });
      return;
    }

    // Check for Normal Body Paragraphs
    if (tag === 'p' || tag === 'div') {
      if (text.length === 0 && !el.querySelector('img')) {
        // Remove empty spacer paragraphs
        el.remove();
        return;
      }

      el.classList.add('reader-paragraph');

      // Tag the first substantive paragraph for elegant drop-cap styling (The Celestial Odyssey aesthetic)
      if (!foundFirstLeadParagraph && text.length >= 35) {
        el.classList.add('reader-lead-paragraph');
        foundFirstLeadParagraph = true;
      }
    }
  });

  // Final check: if container is empty, provide placeholder
  if (!container.innerHTML.trim() || container.textContent.trim().length === 0 && !container.querySelector('img')) {
    container.innerHTML = '<p class="reader-paragraph"><em>Konten bab ini siap dibaca.</em></p>';
  }

  return {
    title: detectedTitle || preferredTitle || 'Bab Pembuka',
    content: container.innerHTML
  };
}
