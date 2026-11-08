import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const native = JSON.parse(fs.readFileSync(path.join(root, 'release/native-lock.json'))).android;
const destination = process.argv[2];
assert(destination, 'Usage: node scripts/fetch-native-maven.mjs DESTINATION');
const coordinate = `${native.group.replaceAll('.', '/')}/${native.artifact}/${native.version}`;
const prefix = `${native.artifact}-${native.version}`;
const repository = `https://raw.githubusercontent.com/${native.repository}/maven/`;
const folder = path.join(path.resolve(destination), coordinate);
fs.mkdirSync(folder, { recursive: true });
async function download(name) {
  assert(path.basename(name) === name, 'Unsafe artifact path');
  const response = await fetch(`${repository}${coordinate}/${name}`, { signal: AbortSignal.timeout(60000) });
  assert(response.ok, `${name}: public Maven HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const checksum = await fetch(`${repository}${coordinate}/${name}.sha256`, { signal: AbortSignal.timeout(30000) });
  assert(checksum.ok, `${name}: public Maven SHA256 HTTP ${checksum.status}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), (await checksum.text()).trim(), `${name}: published checksum differs`);
  fs.writeFileSync(path.join(folder, name), bytes);
  return bytes;
}
const module = JSON.parse((await download(`${prefix}.module`)).toString());
assert.deepEqual(module.component, { group: native.group, module: native.artifact, version: native.version, attributes: module.component.attributes });
await download(`${prefix}.pom`);
const files = new Map(module.variants.flatMap(variant => variant.files || []).map(file => [file.name, file]));
for (const [name, expected] of files) {
  const bytes = await download(name);
  assert.equal(bytes.length, expected.size, `${name}: module size differs`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256, `${name}: module SHA256 differs`);
}
console.log(`Public Maven dependency verified and staged: ${native.group}:${native.artifact}:${native.version} → ${folder}`);
