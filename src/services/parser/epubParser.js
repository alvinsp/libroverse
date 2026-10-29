import JSZip from 'jszip';
import { resolveZipEntry, blobToDataUrl } from '../../utils/domUtils.js';
import { splitHtmlByTocOrHeadings } from './tocSplitter.js';
import { normalizeEpubChapter } from './epubNormalizer.js';
import { buildBookPages } from './paginator.js';

function getXmlElements(doc, localName) {
  if (!doc) return [];
  if (typeof doc.getElementsByTagNameNS === 'function') {
    const list = Array.from(doc.getElementsByTagNameNS('*', localName));
    if (list.length > 0) return list;
  }
  if (typeof doc.getElementsByTagName === 'function') {
    const list = Array.from(doc.getElementsByTagName(localName));
    if (list.length > 0) return list;
    const opfList = Array.from(doc.getElementsByTagName('opf:' + localName));
    if (opfList.length > 0) return opfList;
    const dcList = Array.from(doc.getElementsByTagName('dc:' + localName));
    if (dcList.length > 0) return dcList;
  }
  if (typeof doc.querySelectorAll === 'function') {
    try {
      const q = Array.from(doc.querySelectorAll(`${localName}, opf\\:${localName}, dc\\:${localName}`));
      if (q.length > 0) return q;
    } catch (e) {}
  }
  return [];
}

/**
 * In-Browser EPUB Parser powered by JSZip
 */
export async function parseEpubFile(file) {
  const zip = await JSZip.loadAsync(file);

  // 1. Locate container.xml to find the OPF package path
  const containerEntry =
    zip.file('META-INF/container.xml') ||
    zip.file('meta-inf/container.xml') ||
    resolveZipEntry(zip, '', 'META-INF/container.xml');

  let opfPath = 'content.opf';
  if (containerEntry) {
    try {
      const containerXml = await containerEntry.async('text');
      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerXml, 'application/xml');
      const rootfiles = getXmlElements(containerDoc, 'rootfile');
      if (rootfiles.length > 0 && rootfiles[0].getAttribute('full-path')) {
        opfPath = rootfiles[0].getAttribute('full-path');
      } else {
        const match = containerXml.match(/full-path=["']([^"']+)["']/i);
        if (match) opfPath = match[1];
      }
    } catch (e) {
      console.warn('Error reading container.xml:', e);
    }
  }

  // Fallback: If opfPath not found directly, locate any .opf file in the ZIP archive
  let opfEntry = resolveZipEntry(zip, '', opfPath);
  if (!opfEntry) {
    const foundOpfKey = Object.keys(zip.files).find((k) => k.toLowerCase().endsWith('.opf') && !zip.files[k].dir);
    if (foundOpfKey) {
      opfPath = foundOpfKey;
      opfEntry = zip.file(foundOpfKey);
    }
  }

  if (!opfEntry) {
    throw new Error(`Gagal menemukan paket metadata OPF EPUB di "${opfPath}"`);
  }

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // 2. Read OPF file with namespace-resilient tag extraction
  const opfXml = await opfEntry.async('text');
  const parser = new DOMParser();
  const opfDoc = parser.parseFromString(opfXml, 'application/xml');

  const titleNodes = getXmlElements(opfDoc, 'title');
  const rawTitle = titleNodes.length > 0 ? titleNodes[0].textContent?.trim() : null;
  const title = rawTitle || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  const creatorNodes = getXmlElements(opfDoc, 'creator');
  const author = creatorNodes.length > 0 ? creatorNodes[0].textContent?.trim() : 'Koleksi Pengguna';

  const langNodes = getXmlElements(opfDoc, 'language');
  const language = langNodes.length > 0 ? langNodes[0].textContent?.trim() : 'id';

  const descNodes = getXmlElements(opfDoc, 'description');
  const description =
    descNodes.length > 0
      ? descNodes[0].textContent?.trim()
      : 'Buku digital koleksi pribadi yang diunggah ke Libroverse.';

  // 3. Extract Manifest Items
  const manifestItems = getXmlElements(opfDoc, 'item');
  const manifest = {};
  manifestItems.forEach((it) => {
    const id = it.getAttribute('id');
    if (id) {
      manifest[id] = {
        href: it.getAttribute('href'),
        mediaType: it.getAttribute('media-type') || '',
        properties: it.getAttribute('properties') || ''
      };
    }
  });

  // 4. Extract Cover Image
  let coverDataUrl = null;
  const coverItem = manifestItems.find((it) => {
    const props = it.getAttribute('properties') || '';
    const id = (it.getAttribute('id') || '').toLowerCase();
    const mediaType = it.getAttribute('media-type') || '';
    return (
      props.includes('cover-image') ||
      id.includes('cover') ||
      (mediaType.startsWith('image/') && (id.includes('thumb') || id.includes('front')))
    );
  });

  if (coverItem) {
    const href = coverItem.getAttribute('href');
    const coverZipEntry = resolveZipEntry(zip, opfDir, href);
    if (coverZipEntry) {
      try {
        const blob = await coverZipEntry.async('blob');
        coverDataUrl = await blobToDataUrl(blob);
      } catch (e) {
        console.warn('Cover extraction error:', e);
      }
    }
  }

  // 5. Extract Table of Contents from NCX, EPUB 3 Navigation Document, or TOC Files
  const tocTitles = [];
  const ncxItem = manifestItems.find(
    (it) => it.getAttribute('media-type') === 'application/x-dtbncx+xml' || (it.getAttribute('id') || '').toLowerCase().includes('ncx')
  );
  if (ncxItem) {
    const ncxEntry = resolveZipEntry(zip, opfDir, ncxItem.getAttribute('href'));
    if (ncxEntry) {
      try {
        const ncxXml = await ncxEntry.async('text');
        const ncxDoc = parser.parseFromString(ncxXml, 'application/xml');
        const labels = Array.from(ncxDoc.getElementsByTagName('text'));
        labels.forEach((l) => {
          const t = l.textContent?.trim();
          if (t && t.length >= 2 && !tocTitles.includes(t)) tocTitles.push(t);
        });
      } catch (e) {
        console.warn('NCX extraction error:', e);
      }
    }
  }

  // Also check EPUB 3 navigation item (properties="nav")
  const navItem = manifestItems.find(
    (it) => (it.getAttribute('properties') || '').includes('nav') || (it.getAttribute('id') || '').toLowerCase().includes('toc')
  );
  if (navItem) {
    const navEntry = resolveZipEntry(zip, opfDir, navItem.getAttribute('href'));
    if (navEntry) {
      try {
        const navHtml = await navEntry.async('text');
        const navDoc = parser.parseFromString(navHtml, 'text/html');
        const links = Array.from(navDoc.querySelectorAll('nav[epub\\:type="toc"] li, ol.toc li, ul.toc li, nav li a, .toc a, a'));
        links.forEach((l) => {
          const t = l.textContent?.trim();
          if (t && t.length >= 2 && !tocTitles.includes(t)) tocTitles.push(t);
        });
      } catch (e) {
        console.warn('Nav doc extraction error:', e);
      }
    }
  }

  // 6. Extract Chapters via Spine & Split by Table of Contents
  const itemrefs = getXmlElements(opfDoc, 'itemref');
  const chapters = [];

  for (let i = 0; i < itemrefs.length; i++) {
    const idref = itemrefs[i].getAttribute('idref');
    const item = manifest[idref];
    if (!item || !item.href) continue;

    const chEntry = resolveZipEntry(zip, opfDir, item.href);
    if (!chEntry) continue;

    try {
      const rawHtml = await chEntry.async('text');
      const chDoc = parser.parseFromString(rawHtml, 'text/html');

      // Sanitize scripts and styles
      chDoc.querySelectorAll('script, style, link, meta, noscript').forEach((el) => el.remove());

      // Resolve inline images in chapter
      const imgEls = Array.from(chDoc.querySelectorAll('img'));
      for (const img of imgEls) {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('data:') && !src.startsWith('http')) {
          const imgEntry = resolveZipEntry(zip, opfDir, src);
          if (imgEntry) {
            try {
              const imgBlob = await imgEntry.async('blob');
              const imgData = await blobToDataUrl(imgBlob);
              img.setAttribute('src', imgData);
            } catch (err) {}
          }
        }
      }

      // Check if this document contains multiple sections matching the Table of Contents
      const splitChapters = splitHtmlByTocOrHeadings(chDoc, tocTitles);
      if (splitChapters && splitChapters.length > 0) {
        splitChapters.forEach((sc) => chapters.push({ ...sc, isAlreadyNormalized: true }));
      } else {
        const rawHeading =
          chDoc.querySelector('h1, h2, h3, title')?.textContent?.trim() || `Bab ${chapters.length + 1}`;
        const rawContent = chDoc.body ? chDoc.body.innerHTML : rawHtml;
        const normalized = normalizeEpubChapter(rawContent, rawHeading, tocTitles);
        const plainText = (chDoc.body ? chDoc.body.textContent : '').trim();

        if (plainText.length > 0 || chDoc.querySelector('img, svg, table')) {
          chapters.push({
            title: normalized.title || rawHeading,
            content: normalized.content,
            isHtml: true,
            isAlreadyNormalized: true
          });
        }
      }
    } catch (chErr) {
      console.warn(`Error reading chapter item ${idref}:`, chErr);
    }
  }

  // Fallback: Read any HTML or XHTML files if spine was empty
  if (chapters.length === 0) {
    const htmlFiles = Object.keys(zip.files).filter(
      (n) => (n.toLowerCase().endsWith('.html') || n.toLowerCase().endsWith('.xhtml') || n.toLowerCase().endsWith('.htm')) &&
             !zip.files[n].dir &&
             !n.toLowerCase().includes('cover')
    );
    htmlFiles.sort();
    for (let i = 0; i < htmlFiles.length; i++) {
      try {
        const rawHtml = await zip.file(htmlFiles[i]).async('text');
        const doc = parser.parseFromString(rawHtml, 'text/html');
        doc.querySelectorAll('script, style, link, meta, noscript').forEach((el) => el.remove());
        const rawTitle = doc.querySelector('h1, h2, title')?.textContent?.trim() || `Bagian ${i + 1}`;
        const normalized = normalizeEpubChapter(doc.body ? doc.body.innerHTML : rawHtml, rawTitle, tocTitles);
        chapters.push({
          title: normalized.title || rawTitle,
          content: normalized.content,
          isHtml: true,
          isAlreadyNormalized: true
        });
      } catch (e) {}
    }
  }

  if (chapters.length === 0) {
    chapters.push({
      title: 'Bab Pembuka',
      content: `<p>Berhasil mengekstrak ${file.name}. Selamat membaca di pembaca Libroverse.</p>`,
      isHtml: true,
      isAlreadyNormalized: true
    });
  }

  const bookData = {
    title,
    author,
    language,
    description,
    coverDataUrl,
    chapters
  };

  // Compile full pages list and table of contents
  buildBookPages(bookData);

  return bookData;
}
