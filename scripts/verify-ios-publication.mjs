import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// A public Git tag alone does not make a CocoaPods dependency installable.
// Require both native pods in the public CDN index and validate their specs.
export async function verifyIosPublication(ios, fetcher = globalThis.fetch) {
  assert(!ios.workingTree, "Native sources are a working-tree candidate. Commit, tag and refresh native-lock.json before publishing.");
  const name = ios.pod;
  const version = ios.version;
  const tag = `v${version}`;
  const repo = ios.repository;
  assert(repo && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo), 'Unexpected iOS repository');
  assert(/^[a-f0-9]{40}$/.test(ios.commit), 'Expected full native iOS commit SHA');

  const refURL = `https://api.github.com/repos/${repo}/git/ref/tags/${tag}`;
  const refResponse = await fetcher(refURL, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'pushplatform-rn-verify' },
    signal: AbortSignal.timeout(30000),
  });
  assert(refResponse.ok, `GitHub tag ${tag} HTTP ${refResponse.status}`);
  const ref = await refResponse.json();
  let objectSha = ref.object?.sha;
  let objectType = ref.object?.type;
  if (objectType === 'tag') {
    const tagURL = `https://api.github.com/repos/${repo}/git/tags/${objectSha}`;
    const tagResponse = await fetcher(tagURL, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'pushplatform-rn-verify' },
      signal: AbortSignal.timeout(30000),
    });
    assert(tagResponse.ok, `GitHub annotated tag ${tag} HTTP ${tagResponse.status}`);
    const tagObject = await tagResponse.json();
    objectSha = tagObject.object?.sha;
    objectType = tagObject.object?.type;
  }
  assert.equal(objectType, 'commit', `GitHub tag ${tag} does not point at a commit`);
  assert.equal(objectSha, ios.commit, `GitHub tag ${tag} points at ${objectSha}, lock expects ${ios.commit}`);

  const specs = {};
  for (const pod of ['PushPlatformExtension', name]) {
    const shard = createHash('md5').update(pod).digest('hex').slice(0, 3).split('');
    const indexURL = `https://cdn.cocoapods.org/all_pods_versions_${shard.join('_')}.txt`;
    const options = { headers: { 'User-Agent': 'CocoaPods/1.16.2 pushplatform-release' }, signal: AbortSignal.timeout(30000) };
    const index = await fetcher(indexURL, options);
    assert(index.ok, `${pod} CocoaPods index HTTP ${index.status}`);
    const entry = (await index.text()).split(/\r?\n/).find(line => line.startsWith(`${pod}/`));
    assert(entry?.split('/').slice(1).includes(version), `${pod} ${version} is missing from the CocoaPods index`);
    const specURL = `https://cdn.cocoapods.org/Specs/${shard.join('/')}/${pod}/${version}/${pod}.podspec.json`;
    const response = await fetcher(specURL, { ...options, signal: AbortSignal.timeout(30000) });
    assert(response.ok, `${pod} CocoaPods spec HTTP ${response.status}`);
    const spec = await response.json();
    assert.equal(spec.name, pod, 'Unexpected CocoaPods name');
    assert.equal(spec.version, version, 'Unexpected CocoaPods version');
    assert.equal(spec.source?.git, `https://github.com/${repo}.git`, 'Unexpected CocoaPods source');
    assert.equal(spec.source?.tag, tag, 'Unexpected CocoaPods source tag');
    if (pod === name) assert.deepEqual(spec.dependencies?.PushPlatformExtension, [version], 'Native SDK and Extension versions differ');
    specs[pod] = { specURL };
  }
  const cocoapods = { ...specs[name], specs };

  return {
    name,
    version,
    tag,
    commit: ios.commit,
    git: `https://github.com/${repo}.git`,
    cocoapods,
  };
}

export async function verifyIosSource(ios, fetcher = globalThis.fetch) {
  assert(!ios.workingTree, 'Native dependency must reference committed sources');
  assert(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(ios.repository), 'Unexpected iOS repository');
  assert(/^[a-f0-9]{40}$/.test(ios.commit), 'Expected full native iOS commit SHA');
  for (const pod of ['PushPlatformExtension', ios.pod]) {
    const url = `https://raw.githubusercontent.com/${ios.repository}/${ios.commit}/${pod}.podspec`;
    const response = await fetcher(url, { signal: AbortSignal.timeout(30000) });
    assert(response.ok, `${pod} at pinned commit HTTP ${response.status}`);
    const spec = await response.text();
    assert.equal(spec.match(/s\.name\s*=\s*['"]([^'"]+)['"]/)?.[1], pod, 'Unexpected native pod name');
    assert.equal(spec.match(/s\.version\s*=\s*['"]([^'"]+)['"]/)?.[1], ios.version, `${pod} version differs from native lock`);
  }
  return { name: ios.pod, version: ios.version, commit: ios.commit };
}

export function verifyNativePodSource(lock, podName) {
  assert(!lock['EXTERNAL SOURCES']?.[podName], `${podName} must not use a Git or path override`);
  const official = Object.entries(lock['SPEC REPOS'] || {}).some(([repo, pods]) =>
    /^(trunk|https:\/\/cdn\.cocoapods\.org\/?|https:\/\/github\.com\/CocoaPods\/Specs(?:\.git)?\/?)$/.test(repo) && pods.includes(podName));
  assert(official, `${podName} must resolve from the public CocoaPods repository`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const root = new URL('../', import.meta.url);
    const lock = JSON.parse(readFileSync(new URL('release/native-lock.json', root)));
    const podspec = readFileSync(new URL('PushPlatform.podspec', root), 'utf8');
    assert(podspec.includes(`s.dependency "${lock.ios.pod}", "${lock.ios.version}"`), 'Bridge dependency differs from the native lock');
    const source = process.argv.includes('--source');
    const result = source ? await verifyIosSource(lock.ios) : await verifyIosPublication(lock.ios);
    const via = source ? 'pinned Git commit' : `GitHub tag + CocoaPods CDN (${result.cocoapods.specURL})`;
    console.log(`Native iOS dependency verified: ${result.name} ${result.version} @ ${result.commit} — ${via}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
