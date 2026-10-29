/**
 * DOM and Data Utility Functions
 */

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function normalizePosixPath(baseDir, relativePath) {
  if (!relativePath) return '';
  let clean = relativePath.replace(/\\/g, '/');
  if (baseDir) {
    clean = (baseDir.endsWith('/') ? baseDir : baseDir + '/') + clean;
  }
  const parts = clean.split('/');
  const stack = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(p);
    }
  }
  return stack.join('/');
}

export function resolveZipEntry(zip, opfDir, href) {
  if (!href || !zip) return null;
  // Strip URL fragments (#hash) and query parameters (?query)
  const cleanHref = href.split('#')[0].split('?')[0].trim();
  if (!cleanHref) return null;

  // Build candidate paths (both decoded and raw)
  const candidateHrefs = [cleanHref];
  try {
    const decoded = decodeURIComponent(cleanHref);
    if (decoded && decoded !== cleanHref) candidateHrefs.push(decoded);
  } catch (e) {}

  for (const cand of candidateHrefs) {
    const target = normalizePosixPath(opfDir, cand);
    let entry = zip.file(target);
    if (entry && !zip.files[entry.name]?.dir) return entry;

    const rawClean = normalizePosixPath('', cand);
    entry = zip.file(rawClean);
    if (entry && !zip.files[entry.name]?.dir) return entry;

    const lowerTarget = target.toLowerCase();
    const baseName = target.split('/').pop().toLowerCase();
    const allKeys = Object.keys(zip.files);

    const matchedKey = allKeys.find((k) => k.toLowerCase() === lowerTarget && !zip.files[k].dir);
    if (matchedKey) return zip.file(matchedKey);

    const matchedEndKey = allKeys.find(
      (k) => (k.toLowerCase().endsWith('/' + baseName) || k.toLowerCase() === baseName) && !zip.files[k].dir
    );
    if (matchedEndKey) return zip.file(matchedEndKey);
  }

  return null;
}

export function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
