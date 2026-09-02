import fs from "node:fs/promises";
import path from "node:path";

const out = "D:/wechat/content/drafts/2026-08-23-unemployment-series";
const sources = {
  stats: "https://www.stats.gov.cn/sj/zxfbhjd/202608/t20260817_1965064.html",
  aiCase: "https://www.chinanews.com.cn/sh/2026/07-16/10660188.shtml",
  aiJobs: "https://www.pwc.com/gx/en/issues/artificial-intelligence/publications/artificial-intelligence-study.html",
  flexible: "https://www.npc.gov.cn/npc/c2/c30834/202512/t20251224_450484.html",
  graduates: "https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202606/t20260608_1439860.html",
  market: "https://www.mohrss.gov.cn/wap/xw/rsxw/202605/t20260507_575540.html",
  task: "https://app.xinhuanet.com/news/article.html?articleId=20260721191ec565a0a64ae6a03ed7853bda892e"
};

const articles = [
  ["城镇失业率5.2%：稳定的是数字，还是你的岗位？","数据审计员","全国城镇调查失业率5.2%，与上年同期持平；30—59岁劳动力调查失业率3.9%。","失业率是宏观温度计，不是任何一个求职者的体感证明。","统计口径、年龄结构和地区行业差异，决定了同一个5.2%会有完全不同的生活表情。","别把总平均数当成个人的判决书，也别把个人焦虑伪装成全国崩盘。",sources.stats,1],
  ["AI替岗裁员：所谓组织升级，为什么赔偿还得法院替你算？","真相官","广州一宗“AI替代设计师”劳动争议中，法院认为企业不能把引入AI直接等同于可随意解除劳动合同，劳动者获双倍赔偿。","技术升级不是免除雇主责任的魔法咒语。","当“岗位被AI取代”变成一张解除通知，企业最容易省掉的不是重复劳动，而是培训、转岗和补偿。","AI可以替人画图，不能替公司把劳动法涂白。",sources.aiCase,2],
  ["AI没制造大失业，但初级岗位正在被悄悄抽走","职场观察员","PwC 2026年报告称，最受AI暴露岗位的技能变化速度更快；初级岗位更常被要求具备传统上属于资深员工的能力。","最可怕的不是岗位清零，而是上楼的第一阶被撤走。","企业把标准化任务交给工具后，留给新人练手、犯错和积累作品的空间一起被压缩。","如果入门岗位消失，所谓“终身学习”就会变成没有学徒制的自学竞赛。",sources.aiJobs,3],
  ["复合型岗位增长：一份工资，买你三种能力","招聘黑话翻译官","招聘市场中，AI暴露度高的岗位更强调判断、沟通、领导力等复合能力；报告显示相关技能要求变化明显加快。","“复合型人才”常常是预算不足时给一个人的加量点单。","能力升级值得鼓励，但岗位说明书把策划、数据、运营、销售和AI执行并成一格时，管理者也该把薪酬和成长路径写清楚。","别让“成长机会”成为不加钱的岗位扩容许可证。",sources.aiJobs,4],
  ["毕业季百日冲刺：冲刺的是就业，还是简历的循环投递？","毒舌学长","教育部部署2026届高校毕业生6—8月“百日冲刺”；人社部门对未就业毕业生提出职业指导、岗位推介和培训见习等服务。","服务越密集，越说明从校园到岗位的那道门并不自动打开。","招聘会、直播带岗和简历优化都有用，但真正稀缺的是对专业、城市、薪资和成长空间都能匹配的第一份工作。","毕业生不是待清零的库存，第一份工作也不该只是完成统计的容器。",sources.graduates,5],
  ["灵活就业不是自由：平台把没有工位包装成自主接单","下班后社保会计","全国人大相关报告显示，截至2024年底，灵活就业人员参加职工基本养老保险、基本医疗保险人数分别为7057万和6615.9万。","能自己接单，不等于能自己承担全部风险。","没有固定工位的自由，常常附带收入波动、职业伤害、社保缴费与养老预期四张账单。","真正的灵活，不该是平台灵活用工、劳动者刚性兜底。",sources.flexible,1],
  ["骑手社保补贴：每单必保，为什么仍像一场补丁工程？","政策拆解员","职业伤害保障试点已覆盖17个省份、11家企业，累计2325万人参保；政策仍在探索更适合新就业形态的参保方式。","“每单必保”解决的是一部分风险，不是全部生活。","职业伤害保障是进步，但劳动者还关心淡季收入、养老连续性、医疗缴费和算法造成的超时压力。","补丁值得肯定，但别把补丁说成已经盖好的屋顶。",sources.flexible,2],
  ["制造业服务业都在扩张，为什么求职者仍觉得岗位变少？","数据审计员","国家统计局称1—7月规模以上工业增加值和服务业生产指数保持增长，就业总体稳定；同时也提示供强需弱等挑战。","产出增长和好岗位增长，从来不是同义词。","行业扩张可能集中在设备、资本或少数高技能环节；求职者感受的是自己所在城市、专业和经验段是否有可进入的岗位。","宏观的“向好”不能替代一份能养活人的offer。",sources.stats,3],
  ["没写裁员的裁员：降薪留人、外包换岗、末位优化","前HR","人社部门2026年专项行动明确整治“假外包、真派遣”、虚假招聘和侵害公平就业权益等问题。","裁员这个词太刺耳，于是组织学会了用更柔软的包装材料。","降薪、调岗、外包和绩效优化未必都违法，但当选择权只留在通知书上，所谓协商就很容易变成单向服从性测试。","最体面的组织调整，不是把人推出门，而是把责任留在桌上。",sources.market,4],
  ["失业焦虑最贵的成本：不是空窗期，是把人训练成永远待命","真相官","关于AI与就业的研究更常指向任务重组和技能重构，而非简单的“职位全部消失”；劳动力市场的焦虑却真实存在。","最先被吞掉的往往不是工作，而是人对生活节奏的控制权。","当每个人都被要求随时学习、随时投递、随时证明自己没有过时，空窗期会变成24小时的自我审计。","真正的职业安全感，不是永远待命，而是失去一份工作后仍有尊严地重新开始。",sources.task,5]
];

function esc(s) { return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function box(text, color="#7f9fbe") { return `<p style="margin:0 0 10px;padding:10px 13px;background-color:#f7f9fb;border-left:3px solid ${color};color:#536579;">${text}</p>`; }
function body(a, i) {
  const [title, role, fact, truth, analysis, verdict, source, image] = a;
  const groups = [
    ["原文摘录（意译）：", fact, `点评：${truth} 很多人喜欢把一个全国数字拎出来做情绪判决，因为这比承认复杂性省事。可劳动市场不是一块平整的地毯：地区、年龄、行业、技能和家庭负担，会把同一项变化踩出完全不同的褶皱。`],
    ["原文摘录（意译）：", analysis, `点评：企业最喜欢把结构变化说成“转型机会”，因为这样就能把成本写进未来，把焦虑留给当下的人。劳动者当然该学习新工具，但培训时间、转岗机会和失败成本，不能只由一个人用下班后的睡眠支付。`],
    ["原文摘录（意译）：", "稳就业政策持续提供招聘、培训、权益维护或社会保障支持。", `点评：政策不是没有价值，问题是别把“有服务”直接翻译成“有好工作”。一场招聘会能提供入口，却不能替岗位解决收入、保障、通勤与成长；一项补贴能缓冲风险，却不能把所有不确定性从劳动者账上抹掉。`],
    ["原文摘录（意译）：", "技术、平台规则和组织调整正在共同重写岗位边界。", `点评：真正值得警惕的，不是某个职业名字消失，而是责任被拆碎：公司说自己只是采购技术，平台说自己只是提供撮合，外包说自己只是合同主体。最后，最完整的一份风险，仍被交到最没有议价权的人手里。`]
  ];
  const sections = groups.map((g,n)=>`${box(`①②③④`.charAt(n)+" "+g[0]+esc(g[1]))}<p style="margin:0 0 18px;padding:0;"><strong style="color:#2b3a55;">${g[2].slice(0,3)}</strong>${esc(g[2].slice(3))}</p>`).join("\n");
  return `<section style="margin:0;padding:0;background-color:#ffffff;color:#25344a;font-size:16px;line-height:1.9;letter-spacing:0.5px;">
<p style="margin:0 0 12px;padding:0;color:#7a8798;font-size:13px;text-align:center;">${role} · 真相官就业观察</p>
<p style="margin:0 0 20px;padding:0;color:#24364d;font-size:25px;font-weight:bold;line-height:1.45;text-align:center;">${esc(title)}</p>
<p style="margin:0 0 22px;padding:0;text-align:center;"><img src="{{COVER_IMAGE}}" style="width:100%;height:auto;vertical-align:middle;"></p>
<p style="margin:0 0 18px;padding:0;">关于失业和裁员，最流行的写法永远只有两种：要么用一个数字宣布一切稳定，要么用一条个案宣布世界已经塌了。两种写法都很适合转发，唯独不太适合帮助人理解自己到底该怎么办。</p>
<p style="margin:0 0 18px;padding:0;">这一篇不替任何人兜售绝望，也不把“提升自己”当作万能创可贴。我们只把公开信息摊开：数字能说明什么，不能说明什么；组织把风险交给谁；劳动者又该把注意力放回哪一张真正属于自己的账单。</p>
<p style="margin:20px 0 14px;padding:10px 14px;background-color:#edf3f8;border-left:4px solid #56799d;color:#223a55;font-weight:bold;">[真相翻译官]：${esc(truth)} 这不是反对变化，而是拒绝让变化只以“效率”的名义发生。</p>
<p style="margin:24px 0 10px;padding:0;color:#2b3a55;font-size:19px;font-weight:bold;">[毒舌深拆解]</p>${sections}
<p style="margin:0 0 18px;padding:12px 14px;background-color:#fff7e9;border:1px solid #ead4a8;border-radius:4px;color:#6b5631;"><strong>认真脸提醒：</strong>失业、裁员、调岗和社保权益涉及具体合同与个人处境。遇到争议时，保留沟通记录、劳动合同、工资与社保缴费凭证；需要时咨询当地人社部门、工会或专业法律人士。</p>
<p style="margin:0 0 16px;padding:14px;background-color:#2b3a55;color:#ffffff;font-size:17px;font-weight:bold;line-height:1.75;">[最后的判词]<br>${esc(verdict)}</p>
<p style="margin:24px 0 0;padding:10px 0 0;border-top:1px solid #dfe5eb;color:#7d8997;font-size:12px;line-height:1.7;">原始资料：<a href="${source}" style="color:#56799d;">公开来源链接</a>。本文为基于公开信息的评论，转载请注明来源。</p></section>`;
}

await fs.mkdir(out, { recursive:true });
const manifest=[];
for (let i=0;i<articles.length;i++) {
  const a=articles[i], n=String(i+1).padStart(2,"0"), file=path.join(out,`${n}-${a[0]}-微信版.html`);
  const html=body(a,i); const text=html.replace(/<[^>]+>/g,"").replace(/\s+/g," ");
  if(text.length<1000) throw new Error(`${n} too short: ${text.length}`);
  await fs.writeFile(file,html,"utf8");
  manifest.push({title:a[0],digest:a[3],author:a[1],body_file:file.replaceAll("\\","/"),cover_file:`${out}/images/${String(a[7]).padStart(2,"0")}-cover.jpg`,inline_images:{COVER_IMAGE:`${out}/images/${String(a[7]).padStart(2,"0")}-cover.jpg`},source_url:a[6],template:"classic"});
}
await fs.writeFile(path.join(out,"manifest.json"),JSON.stringify(manifest,null,2),"utf8");
console.log(JSON.stringify({out,count:manifest.length},null,2));
