import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyIosPublication } from './verify-ios-publication.mjs';
const ios = { pod: 'PushPlatformSDK', version: '1.1.0', repository: 'pushplatform/pushpilot-sdk-ios' };
const spec = { name: ios.pod, version: ios.version, source: { git: `https://github.com/${ios.repository}.git`, tag: 'v1.1.0' } };
const fixture = (index, value = spec) => async url => url.endsWith('.txt') ? new Response(index) : new Response(JSON.stringify(value));

test('rejects an unindexed native version even when its podspec already exists', async () => {
  await assert.rejects(verifyIosPublication(ios, fixture('PushPlatformSDK/1.0.0\n')), /absent from the public CocoaPods index/);
});
test('rejects unavailable registries instead of claiming local payload makes installation ready', async () => {
  await assert.rejects(verifyIosPublication(ios, async () => new Response('', { status: 503 })), /index HTTP 503/);
});
test('rejects a mismatched native source tag', async () => {
  await assert.rejects(verifyIosPublication(ios, fixture('PushPlatformSDK/1.0.0/1.1.0\n', { ...spec, source: { ...spec.source, tag: 'v1.0.0' } })), /source tag/);
});
test('requires the locked pod version in both public index and spec', async () => {
  const result = await verifyIosPublication(ios, fixture('OtherPod/1.1.0\nPushPlatformSDK/1.0.0/1.1.0\n'));
  assert.equal(result.version, '1.1.0');
  assert.match(result.specURL, /Specs\/a\/4\/5\/PushPlatformSDK\/1.1.0/);
});
