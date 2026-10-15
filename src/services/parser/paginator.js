import { escapeHtml } from '../../utils/domUtils.js';
import { splitHtmlByTocOrHeadings } from './tocSplitter.js';
import { parseTextIntoChapters } from './txtParser.js';

export function paginateHtmlContent(html, wordsPerPage = 380) {
  if (!html || !html.trim()) return ['<p><em>Halaman kosong.</em></p>'];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstElementChild || doc.body;

    const children = Array.from(container.children);
    if (children.length === 0) {
      const rawText = container.textContent || html;
      const paragraphs = rawText.split(/\n\s*\n+/).filter((p) => p.trim().length > 0);
      if (paragraphs.length <= 1) {
        const words = rawText.trim().split(/\s+/).filter(Boolean);
        if (words.length <= wordsPerPage) {
          return [`<p>${escapeHtml(rawText)}</p>`];
        }
        const pages = [];
        for (let i = 0; i < words.length; i += wordsPerPage) {
          const chunk = words.slice(i, i + wordsPerPage).join(' ');
          pages.push(`<p>${escapeHtml(chunk)}</p>`);
        }
        return pages.length > 0 ? pages : [html];
      }
      const reconstituted = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
      return paginateHtmlContent(reconstituted, wordsPerPage);
    }

    const pages = [];
    let currentBlocks = [];
    let currentWordCount = 0;

    for (const el of children) {
      const isPageBreak =
        el.tagName.toLowerCase() === 'hr' ||
        el.classList.contains('pagebreak') ||
        el.getAttribute('epub:type') === 'pagebreak';

      if (isPageBreak && currentBlocks.length > 0) {
        pages.push(currentBlocks.map((b) => b.outerHTML).join(''));
        currentBlocks = [];
        currentWordCount = 0;
        continue;
      }

      const text = el.textContent || '';
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

      if (currentWordCount + wordCount > wordsPerPage && currentBlocks.length > 0) {
        pages.push(currentBlocks.map((b) => b.outerHTML).join(''));
        currentBlocks = [el];
        currentWordCount = wordCount;
      } else {
        currentBlocks.push(el);
        currentWordCount += wordCount;
      }
    }

    if (currentBlocks.length > 0) {
      pages.push(currentBlocks.map((b) => b.outerHTML).join(''));
    }

    return pages.length > 0 ? pages : [html];
  } catch (err) {
    console.warn('Pagination parsing error:', err);
    return [html];
  }
}

export function buildBookPages(book) {
  if (!book) return [];
  if (book.pagesList && book.pagesList.length > 0) {
    return book.pagesList;
  }

  // Smart splitting pass: Check if chapters contain sub-sections matching the book's Table of Contents or headings
  const initialChapters = book.chapters || [];
  const expandedChapters = [];

  // Gather known TOC titles from book
  const knownTocTitles = [];
  initialChapters.forEach((c) => {
    if (c.title) knownTocTitles.push(c.title);
  });
  // Check if any chapter is a Table of Contents ("Contents" / "Daftar Isi")
  initialChapters.forEach((c) => {
    if (/(?:contents|table of contents|daftar isi)/i.test(c.title || '')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(c.content || '', 'text/html');
      doc.querySelectorAll('li, a, p').forEach((el) => {
        const t = el.textContent.trim();
        if (t.length >= 3 && t.length <= 120 && !knownTocTitles.includes(t)) {
          knownTocTitles.push(t);
        }
      });
    }
  });

  initialChapters.forEach((ch, idx) => {
    if (ch.isHtml) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(ch.content || '', 'text/html');
      const splits = splitHtmlByTocOrHeadings(doc, knownTocTitles);
      if (splits && splits.length > 1) {
        splits.forEach((s) => expandedChapters.push(s));
      } else {
        expandedChapters.push(ch);
      }
    } else {
      const splits = parseTextIntoChapters(ch.content, ch.title || `Bab ${idx + 1}`);
      if (splits && splits.length > 1) {
        splits.forEach((s) => expandedChapters.push(s));
      } else {
        expandedChapters.push(ch);
      }
    }
  });

  book.chapters = expandedChapters;
  const chapters = expandedChapters;
  const pagesList = [];
  const toc = [];

  chapters.forEach((ch, chIdx) => {
    const chTitle = ch.title || `Bab ${chIdx + 1}`;
    const startPageIndex = pagesList.length;

    let chPages = [];
    if (ch.isHtml) {
      chPages = paginateHtmlContent(ch.content, 380);
    } else {
      const rawParas = (ch.content || '').split('\n\n').filter((p) => p.trim().length > 0);
      const htmlContent = rawParas
        .map((p) => {
          const trimmed = p.trim();
          if (trimmed.startsWith('[Exercise:') || trimmed.startsWith('Exercise:') || trimmed.startsWith('Latihan:')) {
            const labelMatch = trimmed.match(/^\[?(Exercise:[^\]\n]+|Latihan:[^\]\n]+)\]?/i);
            const label = labelMatch ? labelMatch[1] : 'Exercise';
            const body = trimmed.replace(/^\[?(Exercise:[^\]\n]+|Latihan:[^\]\n]+)\]?\s*/i, '');
            return `
              <div class="reader-exercise-box">
                <div class="reader-exercise-badge">💡 ${escapeHtml(label)}</div>
                ${body ? `<p class="reader-exercise-text">${escapeHtml(body)}</p>` : ''}
              </div>
            `;
          }
          return `<p>${escapeHtml(p)}</p>`;
        })
        .join('');
      chPages = paginateHtmlContent(htmlContent, 380);
    }

    if (chPages.length === 0) {
      chPages = ['<p><em>Tidak ada konten di bab ini.</em></p>'];
    }

    const isMajorPart =
      /^(part|bagian|book|jilid|volume|act|bab\s+\d+|chapter\s+\d+|introduction|dedication|foreword|prologue|epilogue|appendix|appendices|about\s+the\s+author)/i.test(
        chTitle.trim()
      );
    const depth = isMajorPart ? 1 : 2;

    chPages.forEach((pageHtml, pIdx) => {
      pagesList.push({
        globalPageIndex: pagesList.length,
        chapterIndex: chIdx,
        chapterTitle: chTitle,
        pageInChapter: pIdx + 1,
        totalInChapter: chPages.length,
        contentHtml: pageHtml
      });
    });

    toc.push({
      chapterIndex: chIdx,
      title: chTitle,
      startPageIndex: startPageIndex,
      totalPages: chPages.length,
      depth: depth
    });
  });

  if (pagesList.length === 0) {
    pagesList.push({
      globalPageIndex: 0,
      chapterIndex: 0,
      chapterTitle: book.title || 'Halaman Pembuka',
      pageInChapter: 1,
      totalInChapter: 1,
      contentHtml: `<p>${escapeHtml(book.synopsis || 'Selamat membaca di Libroverse.')}</p>`
    });
    toc.push({
      chapterIndex: 0,
      title: book.title || 'Halaman Pembuka',
      startPageIndex: 0,
      totalPages: 1,
      depth: 1
    });
  }

  book.pagesList = pagesList;
  book.totalPages = pagesList.length;
  book.toc = toc;
  return pagesList;
}
