import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const p = (text, style = 'margin:0 0 18px;padding:0;') => `<p style="${style}">${text}</p>`;
const link = (url, label) => `<a href="${url}" style="color:#56799d;">${label}</a>`;
const quote = (number, original, commentary) =>
  p(`${number} 资料摘录：${esc(original)}`, 'margin:0 0 8px;padding:10px 13px;background-color:#f7f9fb;border-left:3px solid #7f9fbe;color:#536579;') +
  p(`<strong style="color:#2b3a55;">点评：</strong>${esc(commentary)}`);

function shell(title, eyebrow, lead, truth, sections, finalParagraph, verdict, sources) {
  return `<section style="margin:0;padding:0;background-color:#ffffff;color:#25344a;font-size:16px;line-height:1.9;letter-spacing:0.4px;">`
    + p(esc(eyebrow), 'margin:0 0 12px;padding:0;color:#7a8798;font-size:13px;text-align:center;')
    + p(esc(title), 'margin:0 0 18px;padding:0;color:#24364d;font-size:25px;font-weight:bold;line-height:1.45;text-align:center;')
    + p(esc(lead))
    + p(`[真相翻译官]：${esc(truth)}`, 'margin:20px 0 16px;padding:11px 14px;background-color:#edf3f8;border-left:4px solid #56799d;color:#223a55;font-weight:bold;')
    + p('[毒舌深拆解]', 'margin:24px 0 10px;padding:0;color:#2b3a55;font-size:19px;font-weight:bold;')
    + sections
    + p(esc(finalParagraph))
    + p(`[最后的判词]<br>${esc(verdict)}`, 'margin:0 0 16px;padding:14px;background-color:#2b3a55;color:#ffffff;font-size:17px;font-weight:bold;line-height:1.75;')
    + p(`原始资料：${sources.join('　')}。本文为基于公开资料的评论，不构成就业、劳动或法律建议，转载请注明来源。`, 'margin:24px 0 0;padding:10px 0 0;border-top:1px solid #dfe5eb;color:#7d8997;font-size:12px;line-height:1.7;')
    + '</section>';
}

export function buildArticles(root) {
  const images = path.join(root, 'images');
  const aTitle = 'AI岗位招了1.1万人，为什么普通人还是觉得没自己的位置';
  const aSections = [
    quote('①', '人社部8月招聘专场由400家用人单位提供人工智能相关岗位，需求超过1.1万人次，岗位包括智能体开发、算法、数据分析和机器视觉应用。', '这说明“AI没有工作”不准确；但把这句话翻译成“大家都有机会”，同样偷懒。职位总量和你能否进场，中间隔着城市、学历、项目经验、行业语境和招聘筛选。'),
    p('<img src="{{BODY_IMAGE_1}}" style="width:100%;height:auto;vertical-align:middle;">', 'margin:4px 0 20px;padding:0;text-align:center;'),
    quote('②', '公开就业解读指出，人工智能带来的变化，既来自人工智能产业本身，也来自它与传统行业的融合；已有30多个新职业与人工智能紧密相关。', '所谓“AI机会”，不是每个人都要转去训练模型。更多真实岗位是在原来的行业里加了一层工具和流程：懂供应链的人要会调度系统，懂内容的人要会验证生成物，懂业务的人要能把模糊需求拆成可执行任务。'),
    quote('③', '同一轮专场还包含先进制造、医疗卫生和外贸岗位，招聘侧把人工智能放在若干行业专场之一，而非独立于所有行业。', '这恰好戳破了最常见的焦虑：你以为新赛道只认“AI原住民”，企业真正想省掉的是从零解释行业常识的成本。它要的往往不是一个会念提示词的人，而是一个能用工具解决本行业麻烦、出了错还能说清责任的人。'),
    p('<img src="{{BODY_IMAGE_2}}" style="width:100%;height:auto;vertical-align:middle;">', 'margin:4px 0 20px;padding:0;text-align:center;'),
    p('<strong style="color:#2b3a55;">先判断自己在哪一类：</strong><br>已有行业经验的人，优先做“工具＋业务”的小作品；还没有行业场景的人，先挑一个具体流程练手；JD 只写“会 AI”却不写任务、培训和评估标准的，先追问清楚再投。', 'margin:6px 0 20px;padding:11px 13px;background-color:#f7f9fb;border-top:1px solid #dfe5eb;border-bottom:1px solid #dfe5eb;color:#4c5f74;font-size:15px;line-height:1.8;'),
    p('<img src="{{BODY_IMAGE_3}}" style="width:100%;height:auto;vertical-align:middle;">', 'margin:4px 0 20px;padding:0;text-align:center;'),
    p('所以普通人的第一步不是给简历硬贴“AI”标签，而是挑一项自己已经懂的工作：把重复环节用工具缩短，把判断环节留给人，把最终责任写回流程。招聘方若只要求“会AI”却不给任务定义、培训和评估标准，那不是招人，是把组织的不确定性打包丢给候选人。')
  ].join('');
  const aHtml = shell(
    aTitle,
    '职场真相官 · 新鲜就业信号拆解',
    '一边是“AI岗位需求超1.1万人次”，一边是大量人投简历像把石头扔进井里。矛盾不在于哪边撒谎，而在于“有岗位”从来不等于“你有入场券”。这篇只回答一个实用问题：普通人该把力气用在哪里，才不是陪招聘海报做气氛组。',
    'AI正在增加岗位，但也在把入场门槛从“会不会做”改成“你是否已经能替企业少交一笔培训费”。',
    aSections,
    '真正值得追问的，不是“AI会不会抢工作”，而是企业愿不愿意把转型成本说清楚：哪些岗位可转、谁提供训练、试错期怎么算、能力如何被公平评估。没有这些，所谓机会只是把焦虑做成了一个更漂亮的招聘专区。',
    'AI没有把门关上，它只是把门牌换成了“复合能力”。最不厚道的地方在于：有些公司一边取消训练期，一边要求新人天生就会飞。',
    [
      link('https://chinajob.mohrss.gov.cn/h5/c/2026-08-21/592714.shtml', '人社部就业专场'),
      link('https://www.cac.gov.cn/2026-08/25/c_1789408128911549.htm', '人工智能就业解读')
    ]
  );

  const bTitle = 'AI岗月薪2.5万，为什么大多数人反而更不敢转行';
  const bSections = [
    quote('①', '51job基于近一年招聘与求职数据称，AI相关岗位月薪中位值为25340元，算法类岗位普遍更高。', '高薪是真的，但高薪不是“岗位普惠”的同义词。一个高数字最擅长制造错觉：好像只要学会一个工具，就能从原来的工资条跳到另一条赛道。招聘市场并不这么结算。'),
    quote('②', '该报告同时称，超四成相关岗位要求硕士及以上学历，六成岗位要求5至10年特定行业深耕经验。', '后半句才是关键。企业不是在高价收购“会用AI”这四个字，而是在高价收购一个人已经积累的行业判断、客户语言和出错后的兜底能力。AI只是让这部分经验的杠杆更长，不是把经验本身免单。'),
    p('<img src="{{BODY_IMAGE_1}}" style="width:100%;height:auto;vertical-align:middle;">', 'margin:4px 0 20px;padding:0;text-align:center;'),
    quote('③', '公开解读列举的变化包括：设计师用AI进行素材与风格实验，法律从业者借助AI筛查合规风险，制造业需要兼具工程知识和数字素养的人。', '这才是对普通人更有用的路线图：别和算法工程师抢同一张椅子，先在自己的椅子上长出一只新手。把“我会某个工具”换成“我能把某个业务环节从三小时压到四十分钟，并且知道哪里不能自动化”。'),
    p('如果你正考虑转行，先做一个残酷但省钱的检查：目标岗位看重的是模型研发、行业交付，还是业务使用？前两者通常需要长期积累；第三类则更看你有没有真实作品和稳定的业务问题。把三种岗位混成“AI岗”，再用一个平均薪资刺激自己报名课程，才是最昂贵的误会。'),
    p('<strong style="color:#2b3a55;">看 JD 里的动词，先分清三种钱：</strong><br>“训练、微调、部署、评测”买的是技术栈；“客户交付、场景落地、流程改造”买的是行业经验；“生成、审核、运营、复盘”更像原有岗位的能力升级。', 'margin:6px 0 20px;padding:11px 13px;background-color:#f7f9fb;border-top:1px solid #dfe5eb;border-bottom:1px solid #dfe5eb;color:#4c5f74;font-size:15px;line-height:1.8;'),
    p('<img src="{{BODY_IMAGE_2}}" style="width:100%;height:auto;vertical-align:middle;">', 'margin:4px 0 20px;padding:0;text-align:center;'),
    p('前两种不必因为焦虑硬闯，第三种则值得立刻在当前工作里做一个小作品。这样做的目的不是讨好算法，而是保住你对业务和结果的解释权。')
  ].join('');
  const bHtml = shell(
    bTitle,
    '招聘黑话翻译官 · 薪资数字背后',
    '“AI相关岗位月薪中位值2.5万元”很容易让人心跳加速；可同一份数据还写着：许多岗位要求硕士和5至10年行业经验。今天不劝你追风口，只把这张薪资海报背后的入场规则翻出来。',
    '高薪AI岗卖的不是“提示词”，而是被AI放大过的行业经验；把平均薪资当转行导航，通常会把人带进培训费的岔路。',
    bSections,
    '对已经在职的人，更现实的策略是保留主业的行业优势，再用AI补一项可展示的成果：缩短一次分析、提高一次交付、减少一次返工。它不保证跳槽，却比空泛地宣称“AI赋能”更能让人相信你知道自己在解决什么。',
    'AI岗的高薪不是给每个人发的红包，而是企业给稀缺经验加的价签。真正危险的不是门槛高，而是有人故意只把价签给你看。',
    [
      link('https://www.thepaper.cn/newsDetail_forward_33581060', '51job AI人才洞察报道'),
      link('https://www.cac.gov.cn/2026-08/25/c_1789408128911549.htm', '人工智能就业解读')
    ]
  );

  return [
    { title: aTitle, digest: 'AI招聘需求在增长，但“有岗位”与“普通人能进场”之间，究竟隔着哪些门槛？', author: '职场真相官', html: aHtml, file: path.join(root, `01-${aTitle}-微信版.html`), cover_file: path.join(images, 'a-cover.jpg'), inline_images: { BODY_IMAGE_1: path.join(images, 'a-body-1.jpg'), BODY_IMAGE_2: path.join(images, 'a-body-2.jpg'), BODY_IMAGE_3: path.join(images, 'a-body-3.jpg') } },
    { title: bTitle, digest: 'AI岗位高薪背后，企业真正愿意付钱购买的，到底是工具能力还是行业经验？', author: '招聘黑话翻译官', html: bHtml, file: path.join(root, `02-${bTitle}-微信版.html`), cover_file: path.join(images, 'b-cover.jpg'), inline_images: { BODY_IMAGE_1: path.join(images, 'b-body-1.jpg'), BODY_IMAGE_2: path.join(images, 'b-body-2.jpg') } }
  ];
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  const root = 'D:/wechat/content/drafts/2026-08-27-fresh-ai-jobs-ab';
  const articles = buildArticles(root);
  await fs.mkdir(path.join(root, 'images'), { recursive: true });
  for (const article of articles) await fs.writeFile(article.file, article.html, 'utf8');
  const manifest = articles.map(({ html, file, ...item }) => ({ body_file: file, ...item }));
  await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(JSON.stringify({ root, count: manifest.length }, null, 2));
}
