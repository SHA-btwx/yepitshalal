import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../classify-evidence.mjs', import.meta.url), 'utf8');
const pick = (name) => {
  const start = src.indexOf(`const ${name} = `);
  const end = src.indexOf(';\n', start);
  return new Function(`return ${src.slice(start + `const ${name} = `.length, end)};`)();
};
const NEGATIVE = pick('NEGATIVE');
const PARTIAL_NOT = pick('PARTIAL_NOT');
const NEGATED = pick('NEGATED');
const CERT_CLAIM = pick('CERT_CLAIM');
const FULLY = pick('FULLY');
const any = (re, x) => [].concat(re).some((r) => r.test(x));

const cases = [
  ['NEGATIVE', NEGATIVE, 'Our dishes are not Halal.', true],
  ['NEGATIVE', NEGATIVE, "I'm afraid our meat is not halal, but we offer seafood", true],
  ['NEGATIVE', NEGATIVE, 'we are not halal certified but all our meat is halal', false],
  ['NEGATIVE', NEGATIVE, 'we are not halal-certified as pork is also used', false],
  ['NEGATIVE', NEGATIVE, "We don't serve halal meat", true],
  ['PARTIAL_NOT', PARTIAL_NOT, 'Our chicken wings are not halal.', true],
  ['PARTIAL_NOT', PARTIAL_NOT, 'our kitchen is not halal certified', false],
  ['NEGATED', NEGATED, 'No pork served', true],
  ['NEGATED', NEGATED, 'Vegan Roll (Pork Free)', true],
  ['NEGATED', NEGATED, 'zero contact with non-Halal elements', true],
  ['NEGATED', NEGATED, "as we don't handle any pork ingredients", true],
  ['NEGATED', NEGATED, 'Pork Pibil . 7.95', false],
  ['NEGATED', NEGATED, 'serve non-halal meat, pork products and alcohol', false],
  ['CERT_CLAIM', CERT_CLAIM, 'Halal-certified meats. No pork served', true],
  ['CERT_CLAIM', CERT_CLAIM, 'All our meat is HMC certified', true],
  ['FULLY', FULLY, 'All our meat is 100% halal', true],
  ['FULLY', FULLY, 'We are a fully halal restaurant', true],
  ['FULLY', FULLY, 'Halal options available', false],
];

let failed = 0;
for (const [name, re, text, expected] of cases) {
  const got = any(re, text);
  if (got !== expected) failed++;
  console.log(`${got === expected ? 'ok  ' : 'FAIL'} ${name.padEnd(12)} ${text}`);
}
console.log(failed ? `${failed} failed` : 'all passed');
if (failed) process.exitCode = 1;
