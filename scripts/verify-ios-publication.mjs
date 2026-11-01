import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// A bundled podspec does not make a transitive CocoaPods dependency resolvable.
// Check the versions index as well as the spec: CDN indexing can lag publication.
export async function verifyIosPublication(ios, fetcher = globalThis.fetch) {
  const name = ios.pod;
  const version = ios.version;
  const shard = createHash('md5').update(name).digest('hex').slice(0, 3).split('');
  const indexURL = `https://cdn.cocoapods.org/all_pods_versions_${shard.join('_')}.txt`;
  const index = await fetcher(indexURL, { signal: AbortSignal.timeout(30000) });
  assert(index.ok, `CocoaPods version index HTTP ${index.status}`);
  const entry = (await index.text()).split(/\r?\n/).find(line => line.startsWith(`${name}/`));
  assert(entry?.split('/').slice(1).includes(version),
    `${name} ${version} is absent from the public CocoaPods index. Publish the native pod and wait for CDN indexing before releasing React Native. A local Podfile path must not stand in for this check.`);
  const specURL = `https://cdn.cocoapods.org/Specs/${shard.join('/')}/${name}/${version}/${name}.podspec.json`;
  const response = await fetcher(specURL, { signal: AbortSignal.timeout(30000) });
  assert(response.ok, `CocoaPods podspec HTTP ${response.status}`);
  const spec = await response.json();
  assert.equal(spec.name, name, 'Unexpected CocoaPods name');
  assert.equal(spec.version, version, 'Unexpected CocoaPods version');
  assert.equal(spec.source?.git, `https://github.com/${ios.repository}.git`, 'Unexpected CocoaPods source');
  assert.equal(spec.source?.tag, `v${version}`, 'Unexpected CocoaPods source tag');
  return { name, version, specURL };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const root = new URL('../', import.meta.url);
    const lock = JSON.parse(readFileSync(new URL('release/native-lock.json', root)));
    const podspec = readFileSync(new URL('PushPlatform.podspec', root), 'utf8');
    assert(podspec.includes(`s.dependency "${lock.ios.pod}", "${lock.ios.version}"`), 'Bridge dependency differs from the native lock');
    const result = await verifyIosPublication(lock.ios);
    console.log(`Public CocoaPods dependency verified: ${result.name} ${result.version} (${result.specURL})`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
