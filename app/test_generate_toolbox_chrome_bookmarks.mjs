import assert from 'node:assert/strict';
import { buildArticle } from './generate_toolbox_chrome_bookmarks.mjs';

const article = buildArticle('D:/fixtures');
assert.equal(article.title, 'Chrome 书签栏别再塞网址：3 步把常用网站变成工作台');
assert.ok(article.html.includes('[真相翻译官]'));
assert.ok((article.html.match(/资料摘录/g) || []).length >= 3);
assert.ok(article.html.includes('{{BODY_IMAGE_1}}'));
assert.ok(article.html.replace(/<[^>]*>/g, '').length >= 700);
assert.ok(!article.html.includes('{{COVER_IMAGE}}'));
console.log('PASS: toolbox Chrome bookmarks article has source excerpts, visual rhythm, and usable length.');
