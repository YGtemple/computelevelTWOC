// analyze.js — NCRE 题库体检（只读，不修改任何文件）
//
// 作用：统计总题量、重复题组数、被重复的题目总数，
//       并列出前 8 组重复样例（题干摘要 + 各副本的 id 与来源标识）。
//
// 用法：node analyze.js <index.html 路径>

const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');

// ---------- 状态机扫描器：定位 const QUESTIONS = [ ... ] ----------
// 题库约 470 万字符，题干里大量出现引号（"C0LANG"、fopen("data.txt","w")），
// 正则截取不可靠，必须逐字符扫描并跟踪字符串与嵌套深度。
function extract(name) {
  const marker = 'const ' + name + ' = ';
  const start = s.indexOf(marker) + marker.length;
  let i = start, depth = 0, quote = null, escaped = false;

  for (; i < s.length; i++) {
    const c = s[i];

    if (quote) {                       // 当前在字符串内部
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;   // 字符串结束
      continue;
    }
    if (c === '"') { quote = '"'; continue; }
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return JSON.parse(s.slice(start, i + 1));  // 数组闭合
    }
  }
  throw new Error(name + ' array not found');
}

const q = extract('QUESTIONS');

// ---------- 查重：题干归一化后分组 ----------
// 归一化 = 去所有空白 + 去中英文标点差异，
// 使 "表达式 2+3*2 的值是" 与 "表达式 2+3*2 的值是 " 判为同题。
const by = new Map();
for (const x of q) {
  const key = (x.q || '')
    .replace(/\s+/g, '')
    .replace(/[锛堬級()鈥溾€?'鈥鈥樷€橾/g, '');
  if (!by.has(key)) by.set(key, []);
  by.get(key).push(x);
}

const d = [...by].filter(([, v]) => v.length > 1);

console.log(JSON.stringify({
  count: q.length,
  duplicateGroups: d.length,
  duplicateQuestions: d.reduce((n, [, v]) => n + v.length, 0),
  examples: d.slice(0, 8).map(([k, v]) => ({
    q: k.slice(0, 50),
    ids: v.map(x => x.id),
    papers: v.map(x => x.paper)
  }))
}, null, 2));
