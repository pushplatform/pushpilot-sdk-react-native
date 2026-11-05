import test from 'node:test';
import assert from 'node:assert/strict';
import { iosGitPodLine, verifyIosPublication } from './verify-ios-publication.mjs';

const ios = {
  pod: 'PushPlatformSDK',
  version: '1.2.11',
  repository: 'pushplatform/pushpilot-sdk-ios',
  commit: '5a4e7cacac92ffbec9be52237afa490ff1544c23',
};

function githubFixture({ commit = ios.commit, annotated = false } = {}) {
  return async url => {
    if (url.includes('/git/ref/tags/')) {
      if (annotated) {
        return new Response(JSON.stringify({ object: { sha: 'tagobjectsha', type: 'tag' } }));
      }
      return new Response(JSON.stringify({ object: { sha: commit, type: 'commit' } }));
    }
    if (url.includes('/git/tags/')) {
      return new Response(JSON.stringify({ object: { sha: commit, type: 'commit' } }));
    }
    if (url.endsWith('.txt')) {
      return new Response('PushPlatformSDK/1.0.0\n');
    }
    return new Response('', { status: 404 });
  };
}

test('accepts a GitHub tag that matches the locked commit when CDN has no version', async () => {
  const result = await verifyIosPublication(ios, githubFixture());
  assert.equal(result.version, '1.2.11');
  assert.equal(result.commit, ios.commit);
  assert.equal(result.cocoapods, null);
});

test('dereferences an annotated GitHub tag to the locked commit', async () => {
  const result = await verifyIosPublication(ios, githubFixture({ annotated: true }));
  assert.equal(result.commit, ios.commit);
});

test('rejects a GitHub tag that points at the wrong commit', async () => {
  await assert.rejects(
    verifyIosPublication(ios, githubFixture({ commit: '0'.repeat(40) })),
    /points at/,
  );
});

test('rejects a missing GitHub tag', async () => {
  await assert.rejects(
    verifyIosPublication(ios, async () => new Response('', { status: 404 })),
    /GitHub tag v1\.2\.10 HTTP 404/,
  );
});

test('still accepts CDN metadata when the index already has the version', async () => {
  const spec = {
    name: ios.pod,
    version: ios.version,
    source: { git: `https://github.com/${ios.repository}.git`, tag: 'v1.2.11' },
  };
  const fetcher = async url => {
    if (url.includes('/git/ref/tags/')) {
      return new Response(JSON.stringify({ object: { sha: ios.commit, type: 'commit' } }));
    }
    if (url.endsWith('.txt')) return new Response('PushPlatformSDK/1.2.6/1.2.11\n');
    if (url.includes('.podspec.json')) return new Response(JSON.stringify(spec));
    return new Response('', { status: 404 });
  };
  const result = await verifyIosPublication(ios, fetcher);
  assert.match(result.cocoapods.specURL, /PushPlatformSDK\/1\.2\.10/);
});

test('formats the Podfile git override for Extension and SDK', () => {
  assert.equal(
    iosGitPodLine(ios),
    [
      "pod 'PushPlatformExtension', :git => 'https://github.com/pushplatform/pushpilot-sdk-ios.git', :tag => 'v1.2.11'",
      "pod 'PushPlatformSDK', :git => 'https://github.com/pushplatform/pushpilot-sdk-ios.git', :tag => 'v1.2.11'",
    ].join('\n'),
  );
});
