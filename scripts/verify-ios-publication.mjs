import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// CocoaPods Trunk is read-only for new specs (trial week, then permanent).
// React Native resolves PushPlatformSDK from the public Git tag (or bundled
// native/ios path). CDN presence is best-effort, not a release gate.
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

  const shard = createHash('md5').update(name).digest('hex').slice(0, 3).split('');
  const indexURL = `https://cdn.cocoapods.org/all_pods_versions_${shard.join('_')}.txt`;
  let cocoapods = null;
  try {
    const index = await fetcher(indexURL, { signal: AbortSignal.timeout(15000) });
    if (index.ok) {
      const entry = (await index.text()).split(/\r?\n/).find(line => line.startsWith(`${name}/`));
      if (entry?.split('/').slice(1).includes(version)) {
        const specURL = `https://cdn.cocoapods.org/Specs/${shard.join('/')}/${name}/${version}/${name}.podspec.json`;
        const response = await fetcher(specURL, { signal: AbortSignal.timeout(15000) });
        if (response.ok) {
          const spec = await response.json();
          assert.equal(spec.name, name, 'Unexpected CocoaPods name');
          assert.equal(spec.version, version, 'Unexpected CocoaPods version');
          assert.equal(spec.source?.git, `https://github.com/${repo}.git`, 'Unexpected CocoaPods source');
          assert.equal(spec.source?.tag, tag, 'Unexpected CocoaPods source tag');
          cocoapods = { specURL };
        }
      }
    }
  } catch {
    // Trunk/CDN outage must not block Git-published native SDKs.
  }

  return {
    name,
    version,
    tag,
    commit: ios.commit,
    git: `https://github.com/${repo}.git`,
    cocoapods,
  };
}

export function iosGitPodLine(ios) {
  const git = `https://github.com/${ios.repository}.git`;
  const tag = `v${ios.version}`;
  // Trunk may omit new specs: pin Extension + SDK from the same public git tag.
  return [
    `pod 'PushPlatformExtension', :git => '${git}', :tag => '${tag}'`,
    `pod '${ios.pod}', :git => '${git}', :tag => '${tag}'`,
  ].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const root = new URL('../', import.meta.url);
    const lock = JSON.parse(readFileSync(new URL('release/native-lock.json', root)));
    const podspec = readFileSync(new URL('PushPlatform.podspec', root), 'utf8');
    assert(podspec.includes(`s.dependency "${lock.ios.pod}", "${lock.ios.version}"`), 'Bridge dependency differs from the native lock');
    const result = await verifyIosPublication(lock.ios);
    const via = result.cocoapods ? `GitHub tag + CocoaPods CDN (${result.cocoapods.specURL})` : 'GitHub tag (CocoaPods CDN absent; resolve via git/path)';
    console.log(`Native iOS dependency verified: ${result.name} ${result.version} @ ${result.commit} — ${via}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
