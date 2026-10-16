// fix-generated-bank.js — 生成后修正
//
// expand-bank.js 产出的题不是终稿，本脚本做两类修正：
//
//   第一类：修正答案错误的题
//     - 整数除法题：选项里有浮点结果（如 2.5），需替换为截断后的整数
//     - 字符串长度题：题干里嵌的字符串长度算错，需从题干正则抽出后重算
//
//   第二类：给同考点变式编业务场景
//     12 轮循环会生成 12 道题干一模一样的 WPS 题，
//     直接入库会导致用户连续碰到相同题干。
//     用计数器给它们加"第 N 个"前缀区分。
//
// 用法：node fix-generated-bank.js
// 路径：硬编码为 outputs/ncre-quiz/index.html

const fs = require('fs');
const file = 'outputs/ncre-quiz/index.html';
const html = fs.readFileSync(file, 'utf8');

function extract(s) {
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
  throw new Error('QUESTIONS not found');
}

const p = extract(html);
const questions = p.data;
const generated = questions.filter(x => x.paper === '原创练习·2025大纲');

// ---------- 第一类：修正答案错误的题 ----------
for (const item of generated) {
  // 整数除法：选项里含浮点结果时，重算为截断整数
  if (item.cat === 'c' && item.q.startsWith('若 int n=')) {
    const n = Number(item.q.match(/n=(\d+)/)[1]);
    const result = Math.floor(n / 2);
    item.opts = [`${result + 1}`, `${result}`, `${result + 2}`, `${n * 2}`];
    item.ans = 'B';
    item.exp = '两个操作数都是 int，整数除法会截去小数部分。';
  }
  // 字符串长度：从题干正则抽出实际字符串后重算，不拍脑袋改数字
  if (item.cat === 'c' && item.q.startsWith('字符串 "C')) {
    const match = item.q.match(/字符串 "([^"]+)"/);
    const value = match ? match[1] : 'C0LANG';
    const len = value.length;
    item.opts = [`${len - 1}`, `${len + 1}`, `${len}`, `${len + 2}`];
    item.ans = 'C';
    item.q = `字符串 "${value}" 的长度（不含结束符）是`;
    item.exp = `字符串长度只统计可见字符，不包含结尾的\\0；该字符串有 ${len} 个字符。`;
  }
}

// ---------- 第二类：给同考点变式编业务场景 ----------
// 让同一考点的批量变式带有不同业务场景，既便于检索，
// 也避免首页/随机练习连续出现完全相同的题干。
const counters = new Map();
for (const item of generated) {
  const key = item.q;
  const n = counters.get(key) || 0;
  counters.set(key, n + 1);
  if (n > 0 && item.cat === 'wps') {
    const scenario = n + 1;
    if (key.startsWith('WPS 表格中计算区域合计')) item.q = `WPS 表格中计算第${scenario}个数据区域合计最适合使用的函数是`;
    else if (key.startsWith('WPS 表格中按某列筛选')) item.q = `WPS 表格中按第${scenario}列筛选数据后，未通过条件的行通常会`;
    else if (key.startsWith('在 WPS 表格中限制')) item.q = `在 WPS 表格中限制第${scenario}列只能输入下拉选项，应使用`;
    else if (key.startsWith('WPS 表格中要快速汇总')) item.q = `WPS 表格中要快速汇总第${scenario}组不同类别的小计，常用功能是`;
    else if (key.startsWith('WPS 文字中要让多级标题')) item.q = `WPS 文字中要让第${scenario}组多级标题自动出现在目录中，应优先使用`;
    else if (key.startsWith('WPS 文字中需要从下一页')) item.q = `WPS 文字中需要让第${scenario}个新章节从下一页开始，应插入`;
    else if (key.startsWith('WPS 文字中批量')) item.q = `WPS 文字中批量替换第${scenario}组词语，应使用`;
    else if (key.startsWith('WPS 文字中让表格标题行')) item.q = `WPS 文字中让第${scenario}个表格标题行跨页重复显示，应启用`;
    else if (key.startsWith('WPS 演示中统一修改')) item.q = `WPS 演示中统一修改第${scenario}套幻灯片的页眉、背景和占位符，应编辑`;
    else if (key.startsWith('WPS 演示中让对象')) item.q = `WPS 演示中让第${scenario}个对象按路径移动，通常在"动画"中选择`;
    else if (key.startsWith('WPS PDF 中将')) item.q = `WPS PDF 中将第${scenario}组页面单独导出为新文件，属于`;
    else if (key.startsWith('WPS 中多人')) item.q = `WPS 中第${scenario}个在线文档多人同时编辑时，最重要的是先设置`;
    else if (key.startsWith('WPS 表格中冻结')) item.q = `WPS 表格中冻结第${scenario}行的主要作用是`;
    else if (key.startsWith('WPS 表格中要突出')) item.q = `WPS 表格中要突出显示第${scenario}组大于阈值的成绩，适合使用`;
    else if (key.startsWith('WPS 文字中记录')) item.q = `WPS 文字中记录第${scenario}位协作者的修改内容，应开启`;
    else if (key.startsWith('WPS 演示中为目录项')) item.q = `WPS 演示中为第${scenario}个目录项跳转到指定幻灯片，应设置`;
  }
}

const updated = html.slice(0, p.start) + JSON.stringify(questions) + html.slice(p.end);
fs.writeFileSync(file, updated, 'utf8');
console.log(JSON.stringify({
  generated: generated.length,
  c: generated.filter(x => x.cat === 'c').length,
  wps: generated.filter(x => x.cat === 'wps').length
}));
