const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { execSync } = require('child_process');

function stripTSComments(code, fileName) {
  const sourceFile = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const commentRanges = [];

  function collect(node) {
    const text = sourceFile.text;

    const leading = ts.getLeadingCommentRanges(text, node.pos);
    if (leading) {
      for (const range of leading) {
        commentRanges.push(range);
      }
    }

    const trailing = ts.getTrailingCommentRanges(text, node.end);
    if (trailing) {
      for (const range of trailing) {
        commentRanges.push(range);
      }
    }

    if (node.kind === ts.SyntaxKind.JsxExpression && !node.expression) {
      commentRanges.push({
        pos: node.getStart(sourceFile),
        end: node.end
      });
    }

    ts.forEachChild(node, collect);
  }

  collect(sourceFile);

  const unique = [];
  const seenPos = new Set();
  for (const range of commentRanges) {
    if (!seenPos.has(range.pos)) {
      seenPos.add(range.pos);
      unique.push(range);
    }
  }

  unique.sort((a, b) => b.pos - a.pos);

  let stripped = code;
  for (const range of unique) {
    stripped = stripped.substring(0, range.pos) + stripped.substring(range.end);
  }

  return stripped;
}

function stripJavaGradleComments(code) {
  let result = '';
  let i = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  while (i < code.length) {
    const char = code[i];
    const nextChar = code[i + 1];
    if (inSingleQuote) {
      result += char;
      if (char === '\\') {
        result += nextChar || '';
        i += 2;
      } else {
        if (char === "'") inSingleQuote = false;
        i++;
      }
    } else if (inDoubleQuote) {
      result += char;
      if (char === '\\') {
        result += nextChar || '';
        i += 2;
      } else {
        if (char === '"') inDoubleQuote = false;
        i++;
      }
    } else if (char === '/' && nextChar === '/') {
      i += 2;
      while (i < code.length && code[i] !== '\n') {
        i++;
      }
    } else if (char === '/' && nextChar === '*') {
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        i++;
      }
      i += 2;
    } else {
      if (char === "'") inSingleQuote = true;
      else if (char === '"') inDoubleQuote = true;
      result += char;
      i++;
    }
  }
  return result;
}

function stripCSSComments(code) {
  let result = '';
  let i = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  while (i < code.length) {
    const char = code[i];
    const nextChar = code[i + 1];
    if (inSingleQuote) {
      result += char;
      if (char === '\\') {
        result += nextChar || '';
        i += 2;
      } else {
        if (char === "'") inSingleQuote = false;
        i++;
      }
    } else if (inDoubleQuote) {
      result += char;
      if (char === '\\') {
        result += nextChar || '';
        i += 2;
      } else {
        if (char === '"') inDoubleQuote = false;
        i++;
      }
    } else if (char === '/' && nextChar === '*') {
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        i++;
      }
      i += 2;
    } else {
      if (char === "'") inSingleQuote = true;
      else if (char === '"') inDoubleQuote = true;
      result += char;
      i++;
    }
  }
  return result;
}

function stripXMLComments(code) {
  let result = '';
  let i = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  while (i < code.length) {
    const char = code[i];
    if (inSingleQuote) {
      result += char;
      if (char === "'") inSingleQuote = false;
      i++;
    } else if (inDoubleQuote) {
      result += char;
      if (char === '"') inDoubleQuote = false;
      i++;
    } else if (code.substring(i, i + 4) === '<!--') {
      i += 4;
      while (i < code.length && code.substring(i, i + 3) !== '-->') {
        i++;
      }
      i += 3;
    } else {
      if (char === "'") inSingleQuote = true;
      else if (char === '"') inDoubleQuote = true;
      result += char;
      i++;
    }
  }
  return result;
}

function cleanupEmptyLines(code) {
  let lfCode = code.replace(/\r\n/g, '\n');
  const lines = lfCode.split('\n').map(line => line.trimEnd());
  lfCode = lines.join('\n');
  let cleaned = lfCode.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();
  return cleaned ? cleaned + '\n' : '';
}

const projectRoot = path.resolve(__dirname, '..');
const filesOutput = execSync('git ls-files', { cwd: projectRoot, encoding: 'utf-8' });
const files = filesOutput.split('\n').map(f => f.trim()).filter(Boolean);

console.log(`Found ${files.length} tracked files in git.`);

const skippedFiles = [
  '.gitignore',
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'package.json',
  'package-lock.json',
  'tsconfig.json'
];

let processedCount = 0;

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  const base = path.basename(file);
  
  if (skippedFiles.includes(base) || skippedFiles.includes(file)) {
    continue;
  }
  
  const fullPath = path.join(projectRoot, file);
  if (!fs.existsSync(fullPath)) continue;
  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) continue;

  let code = fs.readFileSync(fullPath, 'utf8');
  let originalCode = code;
  let updated = false;

  if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext)) {
    code = stripTSComments(code, fullPath);
    updated = true;
  } else if (['.java', '.gradle'].includes(ext)) {
    code = stripJavaGradleComments(code);
    updated = true;
  } else if (['.css', '.scss'].includes(ext)) {
    code = stripCSSComments(code);
    updated = true;
  } else if (['.xml', '.html', '.xhtml'].includes(ext)) {
    code = stripXMLComments(code);
    updated = true;
  }

  if (updated) {
    code = cleanupEmptyLines(code);
    if (code !== originalCode) {
      fs.writeFileSync(fullPath, code, 'utf8');
      console.log(`Stripped comments from: ${file}`);
      processedCount++;
    }
  }
}

console.log(`Done! Stripped comments from ${processedCount} files.`);
