# Fresh AI Jobs A/B Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and save two verified, unpublished AI-jobs WeChat draft articles with source-specific truth-officer analysis and content-led image placement.

**Architecture:** A focused generator creates two self-contained inline-style HTML articles and a manifest consumed by the existing CDP draft injector. New images are generated per article, compressed, then embedded in-place. The existing verifier confirms the actual server-side draft state.

**Tech Stack:** Node.js, PowerShell test runner, ImageGen, existing WeChat CDP injector/verifier.

## Global Constraints

- Do not publish or group-send either article.
- Use only unposted, current publicly accessible source material.
- Each article has a unique cover plus 1–2 unique in-body images; no repeated cover in body; every image is under 1 MB.
- Preserve WeChat-safe inline HTML and source links.

---

### Task 1: Create a source-aware A/B article generator

**Files:**
- Create: `D:/wechat/app/test_generate_fresh_ai_jobs_ab.mjs`
- Create: `D:/wechat/app/generate_fresh_ai_jobs_ab.mjs`
- Produces: `D:/wechat/content/drafts/2026-08-27-fresh-ai-jobs-ab/manifest.json`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { buildArticles } from './generate_fresh_ai_jobs_ab.mjs';
const articles = buildArticles('D:/fixtures');
assert.equal(articles.length, 2);
for (const article of articles) {
  assert.ok(article.html.replace(/<[^>]*>/g, '').length >= 1000);
  assert.ok(article.html.includes('[真相翻译官]'));
  assert.ok((article.html.match(/资料摘录/g) || []).length >= 3);
  assert.ok(article.html.includes('{{BODY_IMAGE_1}}'));
  assert.ok(!article.html.includes('{{COVER_IMAGE}}'));
}
assert.equal((articles[0].html.match(/BODY_IMAGE/g) || []).length, 2);
assert.equal((articles[1].html.match(/BODY_IMAGE/g) || []).length, 1);
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node D:/wechat/app/test_generate_fresh_ai_jobs_ab.mjs`

Expected: failure because `generate_fresh_ai_jobs_ab.mjs` does not exist.

- [ ] **Step 3: Implement the minimal generator**

Export `buildArticles(root)` that returns exactly two source-specific article objects; write their HTML and a two-item manifest when invoked directly. Include only body image markers, assign separate cover paths only in the manifest, and use all inline styles.

- [ ] **Step 4: Run the generator test and verify it passes**

Run: `node D:/wechat/app/test_generate_fresh_ai_jobs_ab.mjs`

Expected: `PASS: 2 fresh AI-jobs A/B articles satisfy source, length, and image-rhythm checks.`

### Task 2: Produce and validate visual assets

**Files:**
- Create: `D:/wechat/content/drafts/2026-08-27-fresh-ai-jobs-ab/images/*.jpg`

- [ ] **Step 1: Generate five distinct concept illustrations**

Create one cover and two in-body images for A, one cover and one in-body image for B. Keep the illustrations text-free, low-saturation and designed for mobile reading.

- [ ] **Step 2: Compress and validate assets**

Run a deterministic image-size check that fails if any visual exceeds 1 MB or any required path is absent.

### Task 3: Inject and verify drafts

**Files:**
- Uses: `D:/wechat/app/create_hotspot_draft_cdp.mjs`
- Uses: `D:/wechat/app/verify_saved_draft_cdp.mjs`

- [ ] **Step 1: Save the two drafts sequentially**

Set `WECHAT_HOTSPOT_MANIFEST` to the new manifest and inject indices 0 and 1, never in parallel.

- [ ] **Step 2: Verify actual editor state sequentially**

For each returned appmsgid, check title, server-hosted cover, over-1,000-character body, body images, and source footer.

- [ ] **Step 3: Report comparison and await publication confirmation**

Report both exact titles and verification results. Do not publish.
