import assert from 'node:assert/strict';
import { loadArticleFromManifest, isDirectEntry } from './append_fresh_ai_jobs_multi_draft.mjs';

const article = await loadArticleFromManifest(
  'D:/wechat/content/drafts/2026-08-27-fresh-ai-jobs-ab/manifest.json',
  1
);
assert.equal(article.title, 'AI岗月薪2.5万，为什么大多数人反而更不敢转行');
assert.ok(article.bodyTextLength >= 1000);
assert.ok(!article.body.includes('{{'));
assert.ok(article.body.includes('mmbiz') === false, 'payload uses base64 before editor upload');
assert.ok(article.coverFile.endsWith('b-cover.jpg'));
assert.equal(isDirectEntry('file:///D:/wechat/app/append_fresh_ai_jobs_multi_draft.mjs', 'D:\\wechat\\app\\append_fresh_ai_jobs_multi_draft.mjs'), true);
console.log('PASS: B article payload is ready for a separate card in a multi-article draft.');
