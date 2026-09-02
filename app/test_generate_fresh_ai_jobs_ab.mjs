import assert from 'node:assert/strict';
import { buildArticles } from './generate_fresh_ai_jobs_ab.mjs';

const articles = buildArticles('D:/fixtures');
assert.equal(articles.length, 2);
for (const article of articles) {
  assert.ok(article.html.replace(/<[^>]*>/g, '').length >= 1000, `${article.title} is too short`);
  assert.ok(article.html.includes('[真相翻译官]'), `${article.title} misses truth label`);
  assert.ok((article.html.match(/资料摘录/g) || []).length >= 3, `${article.title} misses source excerpts`);
  assert.ok(article.html.includes('{{BODY_IMAGE_1}}'), `${article.title} misses first body visual`);
  assert.ok(!article.html.includes('{{COVER_IMAGE}}'), `${article.title} repeats cover inside body`);
}
assert.equal((articles[0].html.match(/BODY_IMAGE/g) || []).length, 3, 'A should use three body visuals');
assert.equal((articles[1].html.match(/BODY_IMAGE/g) || []).length, 2, 'B should use two body visuals');
console.log('PASS: 2 fresh AI-jobs A/B articles satisfy source, length, and image-rhythm checks.');
