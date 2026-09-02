import test from 'node:test';
import assert from 'node:assert/strict';
import { stickerImageChannel } from './sticker_image_channel.mjs';

test('targets the sticker asset uploader and verifies the sticker asset zone', () => {
  assert.equal(stickerImageChannel.uploadSelector, '.image-selector input[type=file]');
  assert.equal(stickerImageChannel.verifySelector, '.image-selector__bottom-list-item[style*="mmbiz.qpic.cn"]');
  assert.notEqual(stickerImageChannel.uploadSelector, 'input[type=file][name=file]');
});
