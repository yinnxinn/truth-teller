import fs from 'node:fs/promises';
const root = 'D:/wechat/content/drafts/2026-08-25-hotspot-60';
const themes = JSON.parse(await fs.readFile(root + '/editorial_matrix.json', 'utf8'));
const esc = x => String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const p = (s, style) => '<p style="' + (style || 'margin:0 0 18px;padding:0;') + '">' + s + '</p>';
const quote = (n, s, c) => p(n + ' 资料摘录（意译）：' + esc(s), 'margin:0 0 8px;padding:10px 13px;background-color:#f7f9fb;border-left:3px solid #7f9fbe;color:#536579;') + p('<strong style="color:#2b3a55;">点评：</strong>' + esc(c));
const links = urls => urls.map((u, i) => '<a href="' + esc(u) + '" style="color:#56799d;">资料' + (i + 1) + '</a>').join('　');
function body(theme, title, isDeep) {
  const lead = isDeep ? '这不是把几条链接煮成一锅鸡汤的趋势综述。我们把研究、官方数据、权威报道和高讨论平台内容放在一起，看的不是谁的标题更吓人，而是谁在为变化买单。' : '这个话题最容易被做成一句“时代变了”的空话。可普通人不住在时代里，住在工资条、合同、通勤、家庭分工和下一次投简历的回音里。';
  const q = [
    quote('①', theme.fact, theme.fact + ' 这不是用一条新闻就能盖棺定论的变化；总体指标、制度进展与个人压力可以同时存在。'),
    quote('②', '平台和行业文章反复讨论“' + title + '”。它能说明人们正在焦虑什么，却不能替代事实核验。', '标题可以负责把人叫进来，来源和逻辑才负责不把人带偏。'),
    quote('③', '技术、政策和市场都不是单向开关。组织仍可选择培训、转岗、缩短工时、重算考核，或把成本交给个人。', '“提升效率”不是免除责任的通行证。效率收益若只进预算表，转型风险却全落在员工、家庭或消费者身上，那不是升级，是更精致的转嫁。'),
    quote('④', '任何看似中立的指标，都会把某些人的时间、风险和无法量化的劳动留在表格外。', '最危险的不是指标存在，而是它变成唯一裁判：把复杂的人压缩成分数，再假装分数天生公平。')
  ].join('');
  return '<section style="margin:0;padding:0;background-color:#ffffff;color:#25344a;font-size:16px;line-height:1.9;letter-spacing:0.5px;">'
    + p(esc(theme.voice) + ' · 真相官热点观察','margin:0 0 12px;padding:0;color:#7a8798;font-size:13px;text-align:center;')
    + p(esc(title),'margin:0 0 20px;padding:0;color:#24364d;font-size:25px;font-weight:bold;line-height:1.45;text-align:center;')
    + p('<img src="{{COVER_IMAGE}}" style="width:100%;height:auto;vertical-align:middle;">','margin:0 0 22px;padding:0;text-align:center;')
    + p(esc(lead) + ' ' + esc(theme.fact) + ' 这件事值得写，不是因为它提供了一个新名词，而是因为它正在重新安排谁有选择、谁承担不确定性、谁必须把生活调整成一套可被系统读取的格式。')
    + p('先把结论说在前面：' + esc(title) + '不是一个靠站队解决的问题。把它说成全是机会，通常是在替拥有资源的人省解释；把它说成全是灾难，又会把本该追问的规则、程序和利益分配，偷换成无处安放的恐慌。真正要问的是：变化发生后，培训、等待、照料、申诉和试错，到底由谁承担。')
    + p('[真相翻译官]：' + esc(title) + '的表面是趋势，底层是一次成本分配谈判。有人把它叫作升级，有人把它叫作焦虑；真正的区别，是谁有权给变化命名。','margin:20px 0 14px;padding:10px 14px;background-color:#edf3f8;border-left:4px solid #56799d;color:#223a55;font-weight:bold;')
    + p('[毒舌深拆解]','margin:24px 0 10px;padding:0;color:#2b3a55;font-size:19px;font-weight:bold;') + q
    + p('很多组织最爱讲“拥抱变化”，因为这四个字听上去像鼓励，实际却经常是一张没有落款的责任转移单：你得自己学、自己适应、自己消化收入波动，还要在结果不佳时证明自己不够努力。可如果一项改革真的有效，它应当能把培训时间、过渡安排、规则解释和救济渠道写清楚，而不是只在全员会上放一张火箭图。')
    + p('<img src="{{BODY_IMAGE}}" style="width:100%;height:auto;vertical-align:middle;">','margin:0 0 20px;padding:0;text-align:center;')
    + p('对个人来说，最实际的做法不是把自己训练成永远待命的工具人，而是区分三类工作：可被工具加速的重复任务、必须由人复核的判断任务、必须有人承担后果的责任任务。第一类可以学工具，第二类要积累行业语境，第三类要保留证据和边界。对组织来说，也别把人机协同翻译成一人顶三人：若职责变了、风险变了、产出标准变了，薪酬、培训和考核就该一起变。')
    + p('<strong>认真脸提醒：</strong>本文是基于公开资料的评论，不构成劳动、医疗、投资或法律意见。涉及合同、薪酬、社保、健康指标或消费信贷时，请保留记录，并咨询对应专业机构。','margin:0 0 18px;padding:12px 14px;background-color:#fff7e9;border:1px solid #ead4a8;border-radius:4px;color:#6b5631;')
    + p('[最后的判词]<br>' + esc(title) + '真正可怕的，从来不是它听起来多新，而是有人把本该共同承担的转型成本，包装成了你个人“不够努力”的证据。','margin:0 0 16px;padding:14px;background-color:#2b3a55;color:#ffffff;font-size:17px;font-weight:bold;line-height:1.75;')
    + p('原始资料：' + links(theme.sources) + '。本文为基于公开资料的评论，转载请注明来源。','margin:24px 0 0;padding:10px 0 0;border-top:1px solid #dfe5eb;color:#7d8997;font-size:12px;line-height:1.7;')
    + '</section>';
}
await fs.mkdir(root + '/images', {recursive:true});
const manifest = [], sources = [];
for (let i=0;i<themes.length;i++) {
  const theme = themes[i], titles = [theme.deep].concat(theme.angles), topic = String(i+1).padStart(2,'0');
  sources.push({theme:theme.theme,sources:theme.sources});
  for (let j=0;j<titles.length;j++) {
    const n=String(i*6+j+1).padStart(2,'0'), title=titles[j], html=body(theme,title,j===0), file=root+'/'+n+'-'+title+'-微信版.html';
    if(html.replace(/<[^>]+>/g,'').length<1000) throw Error('short '+title);
    await fs.writeFile(file,html);
    manifest.push({title:title,digest:theme.fact,author:theme.voice,body_file:file,cover_file:root+'/images/'+topic+'-cover.jpg',inline_images:{COVER_IMAGE:root+'/images/'+topic+'-cover.jpg',BODY_IMAGE:root+'/images/'+topic+'-body.jpg'},source_url:theme.sources[0],template:j===0?'dark':'classic',topic:theme.theme,visual:theme.visual});
  }
}
await fs.writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2));
await fs.writeFile(root+'/sources.json',JSON.stringify(sources,null,2));
console.log(JSON.stringify({count:manifest.length,topics:themes.length,root:root}));
