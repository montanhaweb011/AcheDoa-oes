import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const script = readFileSync(new URL('../public/theme.js', import.meta.url), 'utf8');
for (const [name, stored, systemDark, expected] of [
  ['respeita modo escuro do dispositivo', null, true, 'dark'],
  ['respeita modo claro do dispositivo', null, false, 'light'],
  ['escolha clara prevalece sobre dispositivo', 'light', true, 'light'],
  ['escolha escura prevalece sobre dispositivo', 'dark', false, 'dark'],
  ['ignora preferência inválida', 'invalid', true, 'dark'],
]) test(name, () => {
  const document = {documentElement: {dataset: {}}};
  runInNewContext(script, {document, localStorage: {getItem: () => stored}, window: {matchMedia: () => ({matches: systemDark})}});
  assert.equal(document.documentElement.dataset.theme, expected);
});
test('continua funcionando quando armazenamento é bloqueado', () => {
  const document = {documentElement: {dataset: {}}};
  runInNewContext(script, {document, localStorage: {getItem() {throw Error('blocked')}}, window: {matchMedia: () => ({matches: true})}});
  assert.equal(document.documentElement.dataset.theme, 'dark');
});
