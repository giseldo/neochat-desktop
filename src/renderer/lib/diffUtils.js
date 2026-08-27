/**
 * Utility for computing line-by-line diffs in the frontend
 */

function normalizeLines(text = '') {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function computeLineDiff(oldText = '', newText = '') {
  const oldLines = normalizeLines(oldText).split('\n');
  const newLines = normalizeLines(newText).split('\n');

  const diff = [];
  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diff.push({ type: 'unchanged', text: oldLines[i], oldLine: i + 1, newLine: j + 1 });
      i++;
      j++;
    } else if (j < newLines.length && (i >= oldLines.length || !oldLines.includes(newLines[j]))) {
      diff.push({ type: 'added', text: newLines[j], newLine: j + 1 });
      j++;
    } else if (i < oldLines.length && (j >= newLines.length || !newLines.includes(oldLines[i]))) {
      diff.push({ type: 'removed', text: oldLines[i], oldLine: i + 1 });
      i++;
    } else {
      if (i < oldLines.length) {
        diff.push({ type: 'removed', text: oldLines[i], oldLine: i + 1 });
        i++;
      }
      if (j < newLines.length) {
        diff.push({ type: 'added', text: newLines[j], newLine: j + 1 });
        j++;
      }
    }
  }

  return diff;
}
