import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const p = (text, style = 'margin:0 0 18px;padding:0;') => `<p style="${style}">${text}</p>`;
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const link = (url, label) => `<a href="${url}" style="color:#56799d;">${label}</a>`;
const quote = (number, text, note) =>
  p(`${number} 资料摘录：${esc(text)}`, 'margin:0 0 8px;padding:10px 13px;background-color:#f7f9fb;border-left:3px solid #7f9fbe;color:#536579;font-size:15px;line-height:1.8;')
  + p(`<strong style="color:#2b3a55;">工具翻译：</strong>${esc(note)}`, 'margin:0 0 18px;padding:0;');

export function buildArticle(root) {
  const title = 'Chrome 书签栏别再塞网址：3 步把常用网站变成工作台';
  const sections = [
    quote('①', 'Chrome 官方说明：书签栏是打开书签最直接的方式；可在“书签和清单”中显示或隐藏书签栏。', '先把书签栏打开。一个永远藏在菜单里的入口，和不存在的效率工具没什么区别。'),
    p('<strong style="color:#2b3a55;">第 1 步｜只留“这周会点”的入口</strong><br>打开书签栏后，不要把过去三年收藏的网址全部搬出来。先留 5—8 个：每天要开的系统、日历、文档、沟通工具。其余的先别急着证明自己见多识广。', 'margin:0 0 20px;padding:11px 13px;background-color:#f7f9fb;border-top:1px solid #dfe5eb;border-bottom:1px solid #dfe5eb;color:#40546b;line-height:1.85;'),
    quote('②', 'Chrome 官方说明：可以在书签栏右键新建文件夹，也可以在书签管理器中新增文件夹。', '文件夹不是分类学竞赛。它只负责让你下次少找一次。'),
    p('<strong style="color:#2b3a55;">第 2 步｜按使用频率分三层</strong><br><strong>正在用</strong>：今天或本周要进的页面；<strong>固定用</strong>：每周重复出现的后台、表格与会议页；<strong>资料库</strong>：课程、行业报告、灵感链接。三层足够，别把书签栏建成图书馆。', 'margin:0 0 20px;padding:11px 13px;background-color:#f7f9fb;border-top:1px solid #dfe5eb;border-bottom:1px solid #dfe5eb;color:#40546b;line-height:1.85;'),
    p('<img src="{{BODY_IMAGE_1}}" style="width:100%;height:auto;vertical-align:middle;">', 'margin:4px 0 20px;padding:0;text-align:center;'),
    quote('③', 'Chrome 官方说明：在地址栏输入 @bookmarks 后，可按关键词搜索保存过的书签；书签管理器也支持移动、排序和编辑。', '“收藏了但找不到”不是收藏，是电子囤积。搜索和整理必须同时存在，才算一个系统。'),
    p('<strong style="color:#2b3a55;">第 3 步｜给每个链接一个去留标准</strong><br>连续 30 天没打开、又不能回答“下次什么时候用”的，移进资料库或删掉。你不是在清理网址，是在清理那些“以后也许会用”的自我安慰。', 'margin:0 0 20px;padding:11px 13px;background-color:#f7f9fb;border-top:1px solid #dfe5eb;border-bottom:1px solid #dfe5eb;color:#40546b;line-height:1.85;'),
    p('这套方法不需要插件，也不会让你突然变成时间管理大师。它只是把浏览器从信息垃圾场，改成一个能在工作日真正帮上忙的入口。尤其适合需要在多个系统、文档和网页之间来回切换的人。')
  ].join('');
  const html = `<section style="margin:0;padding:0;background-color:#ffffff;color:#25344a;font-size:16px;line-height:1.9;letter-spacing:0.4px;">`
    + p('真相官工具箱 · 浏览器效率第 01 篇', 'margin:0 0 12px;padding:0;color:#7a8798;font-size:13px;text-align:center;')
    + p(title, 'margin:0 0 18px;padding:0;color:#24364d;font-size:25px;font-weight:bold;line-height:1.45;text-align:center;')
    + p('书签越存越多，真正要用时还是在搜索框里重新打一遍。问题不在于你不会收藏，而在于你把书签当仓库，却期待它像工作台一样替你干活。下面这 3 步，不买插件，也不靠玄学。')
    + p('[真相翻译官]：书签栏不是“我见过什么”的展览墙，而是“我今天要完成什么”的快捷入口。', 'margin:20px 0 16px;padding:11px 14px;background-color:#edf3f8;border-left:4px solid #56799d;color:#223a55;font-weight:bold;')
    + p('[工具拆解]', 'margin:24px 0 10px;padding:0;color:#2b3a55;font-size:19px;font-weight:bold;')
    + sections
    + p('[最后的判词]<br>最浪费时间的，不是打开网页，而是每天都在证明：你上次收藏它，等于没有收藏。', 'margin:0 0 16px;padding:14px;background-color:#2b3a55;color:#ffffff;font-size:17px;font-weight:bold;line-height:1.75;')
    + p(`资料来源：${link('https://support.google.com/chrome/answer/188842?hl=en-IN', 'Google Chrome 书签帮助')}、${link('https://support.google.com/chrome/answer/13156494?hl=en-na', 'Google Chrome 侧边栏帮助')}。本文为工具使用经验整理，界面会随 Chrome 版本更新而调整。`, 'margin:24px 0 0;padding:10px 0 0;border-top:1px solid #dfe5eb;color:#7d8997;font-size:12px;line-height:1.7;')
    + '</section>';
  return {
    title,
    digest: '书签越多越难找？用“正在用、固定用、资料库”三层分法，3 步把 Chrome 书签栏变成真正的工作台。',
    author: '真相官工具箱',
    html,
    file: path.join(root, `${title}-微信版.html`),
    cover_file: path.join(root, 'images', 'cover.jpg'),
    inline_images: { BODY_IMAGE_1: path.join(root, 'images', 'bookmark-system.jpg') }
  };
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  const root = 'D:/wechat/content/drafts/2026-08-29-toolbox-chrome-bookmarks';
  const article = buildArticle(root);
  await fs.writeFile(article.file, article.html, 'utf8');
  const { html, file, ...item } = article;
  await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify([{ body_file: file, ...item }], null, 2), 'utf8');
  console.log(JSON.stringify({ title: article.title, root }, null, 2));
}
