import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../src/assets/data');
const outputPath = path.join(dataDir, 'wubi_phrase_dictionary.json');

const sourceFiles = fs
  .readdirSync(dataDir)
  .filter((fileName) => fileName.endsWith('.dict.yaml'))
  .sort();

const phraseDict = new Map();

for (const fileName of sourceFiles) {
  const content = fs.readFileSync(path.join(dataDir, fileName), 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed === '---' || trimmed === '...') {
      continue;
    }

    const parts = rawLine
      .split(/\t+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length < 2) {
      continue;
    }

    const [phrase, code] = parts;
    if (Array.from(phrase).length < 2) {
      continue;
    }

    const normalizedCode = code.toLowerCase();
    const existingCodes = phraseDict.get(phrase) ?? [];
    if (!existingCodes.includes(normalizedCode)) {
      existingCodes.push(normalizedCode);
      phraseDict.set(phrase, existingCodes);
    }
  }
}

const output = Object.fromEntries(
  [...phraseDict.entries()].sort(([left], [right]) =>
    left.localeCompare(right, 'zh-Hans-CN'),
  ),
);

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log(
  `Generated ${path.relative(process.cwd(), outputPath)} with ${phraseDict.size} phrase entries from ${sourceFiles.length} sources.`,
);
