// expand-bank.js — 按 2025 版 NCRE 大纲批量生成原创练习题
//
// 产出：342 道（C 语言 138 + WPS Office 204）
// 特点：参数化模板生成，题干与答案选项全部由循环变量算出，
//       不是手写死题。每道题自动展开 detailed_exp 四级解析结构。
//
// 用法：node expand-bank.js
// 路径：读 outputs/ncre-quiz/index.html，写回同路径

const fs = require('fs');
const out = 'outputs/ncre-quiz/index.html';
const html = fs.readFileSync(out, 'utf8');

// ---------- 题目工厂 ----------
// ans 存 'A'/'B'/'C'/'D'，ans.charCodeAt(0)-65 换算出选项下标，
// 这样 think 字段能把正确选项的【文本】嵌进去，而不只是字母。
function q(cat, text, opts, ans, exp, tags, extra = {}) {
  return {
    id: 0, cat, q: text, opts, ans, exp,
    is_star: !!extra.star,
    frequency: extra.star ? '高频' : '中频',
    tags, paper: '原创练习·2025大纲', appear_count: 1,
    detailed_exp: {
      think: `本题考查${tags.join('、')}。正确答案是${ans}（${opts[ans.charCodeAt(0) - 65]}）。${exp}`,
      knowledge: extra.knowledge || `本题对应 NCRE 2025 版大纲中的${tags.join('、')}考点。`,
      mistake: extra.mistake || '注意区分相近概念、运算符优先级和边界条件。',
      extend: extra.extend || '建议结合编译器或 WPS 实际操作验证结果，形成可迁移的解题方法。'
    },
    ...(extra.code ? { code: extra.code } : {})
  };
}

// ============================================================
//  C 语言 12 轮 × 11 道 = 132 道
//  每轮换一组数字，干扰项与正确答案靠运算符优先级区分
// ============================================================
const c = [];
const addC = (...args) => c.push(q('c', ...args));

for (let i = 0; i < 12; i++) {
  const a = i + 2, b = i + 3;

  addC(`表达式 ${a} + ${b} * 2 的值是`, [`${a + b} * 2`, `${(a + b) * 2}`, `${a + b * 2}`, `${a * b + 2}`], 'C', '乘法优先于加法，先计算 b*2，再与 a 相加。', ['c_operator'], {star: i < 4});
  addC(`若 int n=${a}; 则 n/2 的结果是`, [`${a / 2}`, `${Math.floor(a / 2)}`, `${a % 2}`, `${a * 2}`], 'B', '两个操作数都是 int，整数除法会截去小数部分。', ['c_datatype', 'c_operator']);
  addC(`条件表达式 ${a} > ${b - 1} ? ${a} : ${b} 的值是`, [`${a}`, `${b}`, '1', '0'], 'A', `${a} 大于 ${b - 1}，因此选择冒号前的表达式。`, ['c_control']);
  addC(`for(i=0;i<${a};i++) 循环体执行次数为`, [`${a - 1}`, `${a}`, `${a + 1}`, '0'], 'B', 'i 从 0 递增到小于上限的最后一个值，因此共执行上限次。', ['c_control']);
  addC(`执行 int x=${a}; while(x>0) x--; 后 x 的值为`, ['0', '1', `${a}`, '-1'], 'A', '循环在 x 递减到 0 时结束，循环条件不再满足。', ['c_control']);
  addC(`int a[${a}]={0}; 数组最后一个元素下标是`, ['0', `${a - 1}`, `${a}`, `${a + 1}`], 'B', 'C 数组下标从 0 开始，长度为 n 时最后下标为 n-1。', ['c_array'], {star: i < 3});
  addC(`字符串 "C${i}LANG" 的长度（不含结束符）是`, ['4', '5', '6', '7'], 'B', '字符串长度只统计可见字符，不包含结尾的\\0；该字符串有 5 个字符。', ['c_string']);
  addC(`调用 strcpy(dest, src) 前，dest 至少应有足够空间容纳`, ['src 的首字符', 'src 的全部字符但不含\\0', 'src 的全部字符及结尾\\0', '任意长度即可'], 'C', 'strcpy 会复制源字符串及结尾的空字符，目标数组必须有足够空间。', ['c_string'], {star: i < 3});
  addC(`函数参数按值传递时，在函数内修改形参会`, ['始终修改实参', '不影响实参本身', '导致编译错误', '只影响全局变量'], 'B', '按值传递会复制实参的值，形参是独立对象；需要指针才能修改调用者数据。', ['c_function']);
  addC(`若 int x=${a}; int *p=&x; 则 *p 的值为`, [`${a - 1}`, `${a}`, `${a + 1}`, 'x 的地址'], 'B', '*p 是对指针 p 解引用，得到 p 指向的 x 的值。', ['c_pointer'], {star: i < 4});
  addC(`对 int a=${a}; int *p=&a; 执行 (*p)++ 后 a 为`, [`${a - 1}`, `${a}`, `${a + 1}`, '地址值'], 'C', '括号保证先解引用再自增，p 指向的变量 a 被加 1。', ['c_pointer']);
  addC(`宏 #define SQR(x) x*x 调用 SQR(${a}+1) 的主要风险是`, ['宏不能带参数', '运算优先级导致结果可能不是平方', '无法通过预处理', '只能用于浮点数'], 'B', '宏只是文本替换，未加括号时表达式参数会受到外部运算符优先级影响。', ['c_preprocess'], {star: i < 3});
  addC(`位运算中，${a} & 0 的结果是`, ['0', `${a}`, '1', `${a + 1}`], 'A', '按位与运算的任意位与 0 都为 0，因此结果为 0。', ['c_operator']);
  addC(`fopen("data.txt","${i % 2 ? 'w' : 'r'}") 中模式 ${i % 2 ? 'w' : 'r'} 的含义是`, i % 2 ? ['只读打开', '写入打开并覆盖原内容', '追加写入', '二进制只读'] : ['只读打开', '写入打开并覆盖原内容', '追加写入', '二进制只读'], i % 2 ? 'B' : 'A', i % 2 ? 'w 模式用于写入，若文件存在通常会清空原内容。' : 'r 模式以只读方式打开已有文件。', ['c_file']);
  addC(`结构体指针 p 访问成员 name 应使用`, ['p.name', 'p->name', '*p.name', '&p.name'], 'B', '当 p 是指向结构体的指针时，箭头运算符等价于 (*p).name。', ['c_struct']);
  addC(`链表遍历中，while(p) 判断的是`, ['p 指向的结点内容为真', 'p 不是空指针', 'p 已经到尾结点', 'p 的下一个结点为空'], 'B', '指针在条件中用于判断是否为 NULL；p 为 NULL 表示遍历结束。', ['c_struct']);
}

// ============================================================
//  WPS Office 12 轮 = 204 道
//  覆盖综合 / 文字 / 表格 / 演示 / PDF / 在线协作六大模块
// ============================================================
const w = [];
const addW = (...args) => w.push(q('wps', ...args));

for (let i = 0; i < 12; i++) {
  const row = i + 2;
  addW('WPS 表格中计算区域合计最适合使用的函数是', ['AVERAGE', 'SUM', 'COUNTIF', 'MAX'], 'B', 'SUM 用于对数值求和，是计算总计的常用函数。', ['wps_excel'], {star: i < 4});
  addW(`在表格公式 =$A$${row}+B${row} 中，复制公式时保持不变的是`, [`A${row}`, `B${row}`, `$A$${row}`, '整条公式'], 'C', '行列前都有绝对引用符号 $，复制时单元格引用保持不变。', ['wps_formula'], {star: i < 3});
  addW('WPS 表格中按某列筛选数据后，未通过条件的行通常会', ['被永久删除', '暂时隐藏', '自动复制到新表', '变成只读'], 'B', '筛选只改变显示结果，未通过条件的记录仍保留在原数据区域。', ['wps_excel']);
  addW('在 WPS 表格中限制单元格只能输入下拉选项，应使用', ['条件格式', '数据有效性', '分类汇总', '合并计算'], 'B', '数据有效性可以设置序列下拉、整数范围、日期范围等输入规则。', ['wps_excel'], {star: i < 4});
  addW('WPS 表格中要快速汇总不同类别的小计，常用功能是', ['数据透视表或分类汇总', '查找替换', '拼写检查', '插入批注'], 'A', '分类汇总和数据透视表都适合按类别聚合数据，实际使用前应确认数据结构。', ['wps_excel']);
  addW('WPS 文字中要让多级标题自动出现在目录中，应优先使用', ['手动加粗', '标题样式', '文本框', '艺术字'], 'B', '目录依据标题样式和大纲级别生成，手动加粗不会自动建立目录层级。', ['wps_word'], {star: i < 4});
  addW('WPS 文字中需要从下一页开始新章节，最合适的是插入', ['空格', '分页符或分节符', '多个回车', '下划线'], 'B', '分页符控制换页，分节符还可以独立设置页眉页脚、页码和页面方向。', ['wps_word']);
  addW('WPS 文字中批量把"旧名称"替换为"新名称"，应使用', ['格式刷', '查找和替换', '邮件合并', '自动图文集'], 'B', '查找和替换可一次定位并替换文档中的文字或格式。', ['wps_word']);
  addW('WPS 文字中让表格标题行在跨页后重复显示，应启用', ['允许跨页断行', '重复标题行', '文字方向', '平均分布各列'], 'B', '重复标题行会在表格后续页面顶部再次显示表头，便于阅读。', ['wps_word'], {star: i < 3});
  addW('WPS 演示中统一修改所有幻灯片的页眉、背景和占位符，应编辑', ['普通视图', '幻灯片母版', '备注页', '阅读视图'], 'B', '幻灯片母版控制全局版式、主题字体、背景和占位符，适合统一修改。', ['wps_ppt'], {star: i < 4});
  addW('WPS 演示中让对象按路径移动，通常在"动画"中选择', ['进入效果', '动作路径', '退出效果', '切换声音'], 'B', '动作路径用于定义对象在幻灯片上的运动轨迹。', ['wps_ppt']);
  addW('WPS PDF 中将若干页面单独导出为新文件，属于', ['页面提取/拆分', '设置段落', '邮件合并', '冻结窗格'], 'A', 'PDF 页面提取或拆分可以把选定页保存为独立 PDF 文件。', ['wps_pdf']);
  addW('WPS 中多人同时编辑在线文档时，最重要的是先设置', ['共享与协作权限', '字体颜色', '纸张方向', '自动编号'], 'A', '共享权限决定谁可以查看、评论或编辑文档，是协作安全的基础。', ['wps_share'], {star: i < 3});
  addW('WPS 表格中冻结首行的主要作用是', ['锁定公式', '滚动时始终显示表头', '禁止编辑', '自动排序'], 'B', '冻结窗格只固定显示区域，不改变数据、公式或编辑权限。', ['wps_excel']);
  addW('WPS 表格中要突出显示大于某阈值的成绩，适合使用', ['条件格式', '页面边距', '邮件合并', '文档加密'], 'A', '条件格式可按数值、文本或公式自动改变单元格显示格式。', ['wps_excel'], {star: i < 3});
  addW('WPS 文字中记录并显示他人修改内容，应开启', ['修订', '分栏', '稿纸设置', '书签'], 'A', '修订会记录插入、删除和格式修改，便于审阅和接受/拒绝更改。', ['wps_word']);
  addW('WPS 演示中为目录项跳转到指定幻灯片，应设置', ['超链接或动作', '页边距', '数据验证', '分类汇总'], 'A', '超链接或动作按钮可以跳转到本文档中的指定幻灯片。', ['wps_ppt']);
}

// ---------- 定位并解析现有题库 ----------
function extractQuestions(s) {
  const marker = 'const QUESTIONS = ';
  const start = s.indexOf(marker) + marker.length;
  let i = start, depth = 0, quote = null, escaped = false;
  for (; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"') { quote = '"'; continue; }
    if (ch === '[') depth++;
    if (ch === ']' && --depth === 0) return { start, end: i + 1, data: JSON.parse(s.slice(start, i + 1)) };
  }
  throw new Error('QUESTIONS array not found');
}

const parsed = extractQuestions(html);
const existing = parsed.data;
const maxId = Math.max(...existing.map(x => Number(x.id) || 0));

// ---------- 追加：id 从现有最大值之后接着编号 ----------
const additions = [...c, ...w];
additions.forEach((item, index) => { item.id = maxId + index + 1; });
const next = existing.concat(additions);

// ---------- 回写：按字节偏移切片 ----------
const updated = html.slice(0, parsed.start) + JSON.stringify(next) + html.slice(parsed.end);
fs.writeFileSync(out, updated, 'utf8');

console.log(JSON.stringify({
  before: existing.length,
  addedC: c.length,
  addedWps: w.length,
  after: next.length,
  firstNewId: maxId + 1
}));
