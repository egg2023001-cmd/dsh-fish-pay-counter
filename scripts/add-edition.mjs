// Run in a clean checkout. Only community/lines.json is updated.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('../community/lines.json', import.meta.url));
const editions = JSON.parse(fs.readFileSync(target, 'utf8'));
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai',
  year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
if (editions.some(issue => issue.day === day)) {
  console.log(day + ' already exists');
} else {
  const lines = JSON.parse(fs.readFileSync(0, 'utf8'));
  const normalize = text => text.normalize('NFKC').replace(/[\p{P}\p{Z}\s]/gu, '');
  const known = new Set(editions.flatMap(issue => issue.lines).map(normalize));
  const client = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8');
  if (!Array.isArray(lines) || lines.length !== 4) throw Error('Expected four original lines');
  for (const line of lines) {
    if (typeof line !== 'string' || line !== line.trim() || [...line].length < 4 || [...line].length > 32
      || /[<>@\\/\p{Cc}\p{Cf}]|https?:|www\.|\d{5,}/iu.test(line)
      || known.has(normalize(line)) || client.includes("'" + line + "'")) throw Error('Invalid or repeated line');
    known.add(normalize(line));
  }
  const next = [...editions, { day, lines }].slice(-90);
  fs.writeFileSync(target, JSON.stringify(next, null, 2) + '\n');
  console.log(day + ' added four lines');
}
