// 毒舌职场真相官 · 全新单篇生成器（周报题材）
// 产物：content/drafts/<日期>-weekly-report-tyranny/
// 复用工作区已验证的 create_hotspot_draft_cdp.mjs manifest 结构（body_file/title/digest/author/cover_file/inline_images）。
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = 'D:/wechat';
const root = path.join(ROOT, 'content', 'drafts', '2026-09-02-weekly-report-tyranny');

const p = (text, style = 'margin:0 0 18px;padding:0;') => `<p style="${style}">${text}</p>`;
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const bold = text => `<strong style="color:#2b3a55;">${text}</strong>`;
const stepper = (number, head, text) =>
  p(`${bold(number)}｜${head}<br>${esc(text)}`,
    'margin:0 0 20px;padding:11px 13px;background-color:#f7f9fb;border-top:1px solid #dfe5eb;border-bottom:1px solid #dfe5eb;color:#40546b;line-height:1.85;');
const TITLE = '周报写的不是进度，是给老板的表忠心';

export function buildArticle() {
  const sections = [
    p(bold('一、周报本来是在汇报进度，后来变成在汇报忠诚'), 'margin:0 0 16px;padding:0;color:#2b3a55;font-size:18px;font-weight:bold;line-height:1.7;'),
    stepper('真相①', '把“下周计划”写成“我准备好了牺牲”，才是合格的周报',
      '同样一件接了个需求的事，交给不同的人写，能写出三种完全不同的周报。一种三个月才写完一句“推进中”，一种把每一步拆成八个“已完成”，还有一种直接在末尾补一句“有需要随时找我”。三份周报描述的其实是同一份摸鱼，但第三条永远显得更“可用”。这说明周报早已不是计时工具，而是态度展销会。你在上面陈列的不是工作，是你愿不愿意被榨得好看的姿态。'),
    p('<img src="{{BODY_IMAGE_1}}" style="width:100%;height:auto;vertical-align:middle;"><span style="font-size:12px;color:#8a92a3;">▲ 周报的字，一半写给工作，一半写给老板的眼睛。</span>', 'margin:6px 0 20px;padding:0;text-align:center;line-height:1.8;'),
    stepper('真相②', '字多不是产出，字少的“已读”才是你唯一的 KPI',
      '不少团队把“日报/周报必须写满”“不许备注不加班”写进制度。可真正决定你下个月是否还在的，从来不是你今天写了多少字，而是你的右上角有没有亮起那枚“已读”。把时间花在把周报写得更像人话，不如把它翻译成老板爱看的三句话：我在干活、我不惹事、我随叫随到。这已经不是沟通了，是一场围绕安全的服从测试。'),
    p(bold('二、当周报变成向上管理的剧本，写的人就退场了'), 'margin:0 0 16px;padding:0;color:#2b3a55;font-size:18px;font-weight:bold;line-height:1.7;'),
    stepper('真相③', '“对齐”“拉通”“躬身入局”，本质是让我证明昨晚没睡着',
      '周报里最不值钱的，是那堆全公司通用的黑话。它们既不能帮你把活儿干完，也不能让用户在周一打开你的产品。它们唯一的作用，是向主管证明你深谙他所在的语系。于是能干的同事被迫把时间分给“对齐”，真正干活的人把力气花在“汇报对齐的进度”上。日复一日，会写周报的人升职，会干活的人被写进别人的周报里。'),
    stepper('真相④', '你想写“这周修了三个 bug”，格式却逼你写“赋能业务闭环”',
      '周报的字段是别人设计的。有的人填“本周进展”，有的人只能填“本周感悟”。当空白格写不下你真实干了什么，你只能把苦劳调成高饱和的功劳腔。这种系统不会帮你长出第二次能力，只会把诚实的个体训练成一个熟练的写手。所谓组织要把你培养成“结构化表达高手”，说穿了是让你把每天受的委屈，写成一份老板转手就能贴部门群的漂亮总结。'),
    p(bold('三、与其精修周报，不如先想清楚谁在真的读'), 'margin:0 0 16px;padding:0;color:#2b3a55;font-size:18px;font-weight:bold;line-height:1.7;'),
    stepper('结论', '把周报当作品去打磨，是把最廉价的掌声当成最贵的回报',
      '真正值得你花时间的，只有两种周报：一种真的在推动决策，一种能让你在年度复盘时拿回属于你的名分。其余的，都是让你用文字替别人分担焦虑。写得再漂亮，也改变不了你在工位上熬到十一点的事实。'),
    p('[真相翻译官]', 'margin:24px 0 8px;padding:0;color:#2b3a55;font-size:19px;font-weight:bold;'),
    p('周报不是“让领导看见你在干活”的成绩单，而是一张你和公司在「谁亏待谁」这件事上的双面账单。', 'margin:0 0 16px;padding:11px 14px;background-color:#edf3f8;border-left:4px solid #56799d;color:#223a55;font-weight:bold;'),
    p('<img src="{{BODY_IMAGE_2}}" style="width:100%;height:auto;vertical-align:middle;">', 'margin:6px 0 20px;padding:0;text-align:center;'),
    p(bold('[最后的判词]'), 'margin:0;padding:0;'),
    p('这份周报死得其所：它写满了态度、忠诚和“我可以更卷”，唯独没写它是一个人用命顶出来的八小时。最讽刺的是，写它的人已经从系统里消失，它却还挂在部门群，替下一届打工人当范本。', 'margin:14px 0 0;padding:14px;background-color:#2b3a55;color:#ffffff;font-size:17px;font-weight:bold;line-height:1.8;'),
    p('排版说明：本文为职场观察手记，基于常见职场现象整理，不针对任何具体公司或个人；灰色框内为通用文风演绎，非真实数据引用。', 'margin:22px 0 0;padding:8px 0 0;border-top:1px solid #dfe5eb;color:#7d8997;font-size:12px;line-height:1.7;'),
  ].join('');

  const body = `<section style="margin:0;padding:0;background-color:#ffffff;color:#25344a;font-size:16px;line-height:1.95;letter-spacing:0.4px;">`
    + p('真相官 · 职场观察', 'margin:0 0 6px;padding:0;color:#7a8798;font-size:13px;text-align:center;')
    + p(TITLE, 'margin:0 0 8px;padding:0;color:#24364d;font-size:24px;font-weight:bold;line-height:1.45;text-align:center;')
    + p('你以为周报是给工作写总结，其实它是给「下周还想要这份工资」写的一封求职信。', 'margin:0 0 16px;padding:0;color:#55637a;font-size:15px;line-height:1.8;text-align:center;')
    + sections
    + '</section>';

  return {
    title: TITLE,
    digest: '从“汇报进度”到“表忠心”，周报是如何被系统一点点驯化成一份情绪汇报模板的。真相官给你拆开看。',
    author: '真相官',
    body,
    file: path.join(root, `${TITLE}-微信版.html`),
    cover_file: path.join(root, 'images', 'cover.jpg'),
    inline_images: {
      BODY_IMAGE_1: path.join(root, 'images', 'inline-1.jpg'),
      BODY_IMAGE_2: path.join(root, 'images', 'inline-2.jpg'),
    },
  };
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  const article = buildArticle();
  await fs.mkdir(path.dirname(article.file), { recursive: true });
  await fs.mkdir(path.join(root, 'images'), { recursive: true });
  await fs.writeFile(article.file, article.body, 'utf8');
  const { body, ...item } = article;
  item.body_file = article.file;
  await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify([item], null, 2), 'utf8');
  console.log(JSON.stringify({ title: article.title, root }, null, 2));
}
