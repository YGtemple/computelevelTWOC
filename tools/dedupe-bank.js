// dedupe-bank.js — 按签名去重
//
// 签名 = 题干 + 选项拼接 + 答案（去除空白后比对）
// 只清理 paper === '原创练习·2025大纲' 的题目，
// 手工整理的 1856 道题一道不碰。
//
// 用法：node dedupe-bank.js
// 路径：硬编码为 outputs/ncre-quiz/index.html，改目录需同步修改

const fs = require('fs');
const file = 'outputs/ncre-quiz/index.html';
const html = fs.readFileSync(file, 'utf8');

const marker = 'const QUESTIONS = ';
const start = html.indexOf(marker) + marker.length;
let end = start, depth = 0, quote = null, escaped = false;
for (; end < html.length; end++) {
  const ch = html[end];
  if (quote) {
    if (escaped) escaped = false;
    else if (ch === '\\') escaped = true;
    else if (ch === quote) quote = null;
    continue;
  }
  if (ch === '"') { quote = '"'; continue; }
  if (ch === '[') depth++;
  if (ch === ']' && --depth === 0) break;
}

const questions = JSON.parse(html.slice(start, end + 1));

const seen = new Set();
const kept = [];
for (const item of questions) {
  const signature = [item.q, (item.opts || []).join('|'), item.ans]
    .join('||').replace(/\s+/g, '');
  // 只去重自己生成的题；整理题即使重复也保留（可能是人工判断后的刻意保留）
  if (item.paper === '原创练习·2025大纲' && seen.has(signature)) continue;
  seen.add(signature);
  kept.push(item);
}

// 回写：按字节偏移切片，只替换数组那一段
fs.writeFileSync(file, html.slice(0, start) + JSON.stringify(kept) + html.slice(end + 1), 'utf8');

console.log(JSON.stringify({
  before: questions.length,
  after: kept.length,
  removed: questions.length - kept.length
}));
