import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyIosPublication, verifyIosSource, verifyNativePodSource } from './verify-ios-publication.mjs';
const ios = { pod: 'PushPlatformSDK', version: '2.0.3', repository: 'pushplatform/pushpilot-sdk-ios', commit: '78cbcf0f3a6d7b2c60393cf1ef9fb96364018fea' };
function fixture({ commit = ios.commit, annotated = false, missingIndex, missingSpec, corrupt } = {}) {
  return async url => {
    if (url.includes('/git/ref/tags/')) return Response.json({ object: { sha: annotated ? 'tagobject' : commit, type: annotated ? 'tag' : 'commit' } });
    if (url.includes('/git/tags/')) return Response.json({ object: { sha: commit, type: 'commit' } });
    if (url.endsWith('.txt')) return new Response(['PushPlatformSDK', 'PushPlatformExtension'].map(name => `${name}/${name === missingIndex ? '2.0.1' : ios.version}`).join('\n'));
    if (url.endsWith('.podspec.json')) {
      const name = url.includes('/PushPlatformExtension/') ? 'PushPlatformExtension' : ios.pod;
      if (name === missingSpec) return new Response('', { status: 404 });
      const spec = { name, version: ios.version, source: { git: `https://github.com/${ios.repository}.git`, tag: `v${ios.version}` } };
      if (name === ios.pod) spec.dependencies = { PushPlatformExtension: [ios.version] };
      if (corrupt) corrupt(spec);
      return Response.json(spec);
    }
    throw new Error(`Unexpected request ${url}`);
  };
}
test('requires both public pods and resolves annotated tags to the pinned source', async () => {
  const result = await verifyIosPublication(ios, fixture({ annotated: true }));
  assert.equal(result.commit, ios.commit);
  assert.equal(Object.keys(result.cocoapods.specs).length, 2);
});
for (const pod of ['PushPlatformSDK', 'PushPlatformExtension']) {
  test(`rejects ${pod} missing from the public index`, async () => {
    await assert.rejects(verifyIosPublication(ios, fixture({ missingIndex: pod })), /missing from the CocoaPods index/);
  });
  test(`rejects an unavailable ${pod} spec`, async () => {
    await assert.rejects(verifyIosPublication(ios, fixture({ missingSpec: pod })), /spec HTTP 404/);
  });
}
for (const [field, corrupt] of [
  ['version', spec => { spec.version = '2.0.1'; }],
  ['source', spec => { spec.source.git = 'https://example.com/wrong.git'; }],
  ['tag', spec => { spec.source.tag = 'v2.0.1'; }],
  ['extension dependency', spec => { if (spec.dependencies) spec.dependencies.PushPlatformExtension = ['2.0.1']; }],
]) test(`rejects mismatched public ${field}`, async () => {
  await assert.rejects(verifyIosPublication(ios, fixture({ corrupt })), /Unexpected CocoaPods|versions differ/);
});
test('rejects wrong native commit and missing Git tag', async () => {
  await assert.rejects(verifyIosPublication(ios, fixture({ commit: '0'.repeat(40) })), /points at/);
  await assert.rejects(verifyIosPublication(ios, async () => new Response('', { status: 404 })), /GitHub tag.*HTTP 404/);
});
test('CDN/network failure blocks release', async () => {
  const fetcher = fixture();
  await assert.rejects(verifyIosPublication(ios, url => url.includes('cdn.cocoapods.org') ? Promise.reject(new Error('offline')) : fetcher(url)), /offline/);
});
test('validates both source pod versions at the exact locked commit', async () => {
  const requests = [];
  await verifyIosSource(ios, async url => {
    requests.push(url);
    const name = url.endsWith('/PushPlatformExtension.podspec') ? 'PushPlatformExtension' : ios.pod;
    return new Response(`s.name = '${name}'\ns.version = '${ios.version}'\n`);
  });
  assert.equal(requests.length, 2);
  assert(requests.every(url => url.includes(`/${ios.commit}/`)));
});
test('ordinary consumers must use the public spec repository without overrides', () => {
  const lock = { 'SPEC REPOS': { trunk: [ios.pod, 'PushPlatformExtension'] } };
  verifyNativePodSource(lock, ios.pod);
  for (const override of [{ git: 'https://github.com/example/repo.git' }, { path: '../native/ios' }]) {
    assert.throws(() => verifyNativePodSource({ ...lock, 'EXTERNAL SOURCES': { [ios.pod]: override } }, ios.pod), /must not use/);
  }
  assert.throws(() => verifyNativePodSource({ 'SPEC REPOS': { private: [ios.pod] } }, ios.pod), /public CocoaPods/);
});
