const fs = require('fs');
const path = require('path');

const replacements = [
  // Navigation / KPI icons -> empty (label is enough)
  [/\uD83D\uDCCA/g,''], [/\uD83D\uDCE6/g,''], [/\uD83C\uDFE2/g,''],
  [/\uD83D\uDC65/g,''], [/\u2705/g,''],        [/\uD83D\uDD04/g,''],
  [/\uD83D\uDCEC/g,''], [/\uD83D\uDCF1/g,''],  [/\uD83D\uDD0D/g,''],
  [/\uD83D\uDCC8/g,''], [/\uD83D\uDC64/g,''],  [/\u26A1/g,''],
  [/\uD83D\uDDA5/g,''], [/\uD83D\uDCB3/g,''],  [/\uD83D\uDD14/g,''],
  [/\uD83D\uDCB0/g,''], [/\uD83D\uDD01/g,''],  [/\uD83C\uDFAA/g,''],
  [/\uD83D\uDEE1/g,''], [/\uD83D\uDC51/g,''],  [/\uD83D\uDD2E/g,''],
  // Buttons
  [/\u2795/g,'+'],  [/\u270F\uFE0F/g,'Edit'], [/\uD83D\uDDD1/g,'Del'],
  [/\uD83D\uDCBE/g,'Save'], [/\u21BA/g,'Refresh'], [/\u2715/g,'X'],
  [/\uD83D\uDCE4/g,'Send'], [/\uD83D\uDCE5/g,'Download'],
  // Status
  [/\u26A0\uFE0F/g,'!'], [/\u26A0/g,'!'], [/\u23F3/g,'...'],
  [/\u274C/g,'X'], [/\u23F0/g,'!'], [/\uD83D\uDEA8/g,'!'],
  [/\uD83D\uDE80/g,''], [/\uD83D\uDD10/g,''], [/\uD83D\uDCCB/g,''],
  [/\uD83D\uDCE4/g,''], [/\uD83D\uDD11/g,''], [/\uD83D\uDE48/g,'Hide'],
  [/\uD83D\uDC41/g,'Show'], [/\uD83D\uDEAA/g,''],
  // Info
  [/\u2139\uFE0F/g,'i'], [/\u2139/g,'i'],
  // Specific emojis by codepoint ranges using regex
  [/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ''],  // surrogate pairs (all emoji)
  [/[\u2600-\u27FF]/g, ''],                   // misc symbols
  [/[\u2300-\u23FF]/g, ''],                   // misc technical
  [/[\u2B00-\u2BFF]/g, ''],                   // misc symbols arrows
  [/[\u25A0-\u25FF]/g, ''],                   // geometric shapes
  [/[\u2190-\u21FF]/g, ''],                   // arrows (but keep ->)
  [/\uFE0F/g, ''],                            // variation selector
  [/\u200D/g, ''],                            // zero width joiner
];

const srcDir = path.join(__dirname, 'src');
let filesChanged = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesChanged++;
    console.log('  Cleaned:', path.relative(srcDir, filePath));
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walkDir(full);
    else if (file.endsWith('.jsx') || file.endsWith('.js')) processFile(full);
  }
}

console.log('Removing emojis from frontend source files...');
walkDir(srcDir);
console.log('Done. ' + filesChanged + ' files updated.');
