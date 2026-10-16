# NCRE 题库构建工具链

`computelevelTWOC` 仓库里那份 9.3 MB 的单文件刷题页，题库本体（1856 道题）是**手工整理**的。但在 2025 版新大纲出来后，需要按大纲模块批量补齐原创练习题——1856 道题不可能靠手写 JSON 塞进去。

这里放的就是当时用来干这件事的四个脚本。它们不生成最终页面，只对 `index.html` 里那个 `const QUESTIONS = [...]` 数组做**定位 → 解析 → 改写 → 回写**。

## 一、核心难题：怎么在 4.7 MB 的 HTML 里安全地改 JSON

题库不是一个独立的 `.json` 文件，而是内联在 HTML 里的一个 JS 常量：

```js
const QUESTIONS = [ {...}, {...}, ... ]   // 约 470 万字符
```

不能正则截、不能 `eval`、也不能把整个文件读成 DOM。四个脚本共用了同一个**手写状态机扫描器**：

```js
const marker = 'const QUESTIONS = ';
const start  = html.indexOf(marker) + marker.length;
let i = start, depth = 0, quote = null, escaped = false;
for (; i < html.length; i++) {
  const ch = html[i];
  if (quote) {                        // 在字符串内部
    if (escaped) escaped = false;
    else if (ch === '\\') escaped = true;
    else if (ch === quote) quote = null;
    continue;
  }
  if (ch === '"') { quote = '"'; continue; }
  if (ch === '[') depth++;
  if (ch === ']' && --depth === 0) break;   // 深度归零 = 数组结束
}
const questions = JSON.parse(html.slice(start, i + 1));
```

四个状态（普通 / 字符串内 / 转义中 / 深度计数）是这个工具链的技术核心。为什么不用 `JSON.parse(html.match(/.../)` 这种写法：

**题库里全是引号嵌套**。题干和解析是中文，里面大量出现 `"C0LANG"`、`fopen("data.txt","w")`、`#define SQR(x) x*x` 这样的字符串字面量。如果正则写得不严，第一次遇到题干里的 `"` 就以为字符串结束了，depth 计数立刻错乱，解析出来的东西要么抛异常要么静默截断。

**回写必须按字节偏移切片，不能重新序列化整个文件**。`html.slice(0, start) + JSON.stringify(data) + html.slice(end)` —— 只替换数组那一段，前后 4.7 MB 的其他内容（HTML 骨架、CSS、前端逻辑）一个字节都不动。这一点很重要：任何重排都会让 index.html 的 diff 变成几百万行，没法 review。

## 二、四个脚本的分工

### `analyze.js` — 题库体检

只读不改。统计总题量、重复题组数、被重复的题目总数，并列出前 8 组重复样例（题干摘要 + 各副本的 id 和来源标识）。

```js
const key = (x.q||'').replace(/\s+/g,'').replace(/[锛堬級()鈥溾€?'鈥鈥樷€橾/g,'');
```

查重前先把题干**归一化**：去掉所有空白，去掉中英文标点差异。`"表达式 2+3*2 的值是"` 和 `"表达式 2+3*2 的值是 "` 应该算同一题，`（不含结束符）` 的全角半角括号差异也不能造成漏判。

### `dedupe-bank.js` — 去重

按「题干 + 选项拼接 + 答案」拼出签名，命中过的直接丢掉：

```js
const signature = [item.q, (item.opts||[]).join('|'), item.ans]
  .join('||').replace(/\s+/g,'');
if (item.paper === '原创练习·2025大纲' && seen.has(signature)) continue;
```

注意那个 `paper === '原创练习·2025大纲'` 条件——**只清理自己生成的题目**。手工整理的那 1856 道题一道不碰，万一其中有考查角度相同但措辞不同的题，那是人工判断的事，脚本无权删。

### `expand-bank.js` — 按大纲批量生成

这是四个里代码量最大的。用一个工厂函数统一题目结构：

```js
function q(cat, text, opts, ans, exp, tags, extra = {}) {
  return {
    id: 0, cat, q: text, opts, ans, exp,
    is_star: !!extra.star,
    frequency: extra.star ? '高频' : '中频',
    tags, paper: '原创练习·2025大纲', appear_count: 1,
    detailed_exp: {
      think: `本题考查${tags.join('、')}。正确答案是${ans}（${opts[ans.charCodeAt(0)-65]}）。${exp}`,
      knowledge: ...,  mistake: ...,  extend: ...
    },
    ...(extra.code ? { code: extra.code } : {})
  };
}
```

几个设计点：

**`opts[ans.charCodeAt(0)-65]`** — 答案存的是 `'A'`/`'B'`/`'C'`/`'D'`，用字符码减去 `'A'` 的码点直接换算出选项下标。这样 `think` 字段能把正确选项的**文本**嵌进去（「正确答案是 B（整数除法会截去小数部分）」），而不是只写个字母。

**每道题的 `detailed_exp` 是自动拼的**：`think`（考点 + 答案 + 解析）、`knowledge`（对应大纲考点）、`mistake`（常见错误）、`extend`（延伸建议）。所以只写一行题干 + 一行解析，就能展开成前端完整显示所需的四级解析结构。

**`star` 标记决定 `frequency`**：标了 star 的是高频考点，影响前端练习时的出题权重。

**参数化生成，不是写死题目**。12 个 C 语言循环用的是同一套模板，只换数字：

```js
for (let i = 0; i < 12; i++) {
  const a = i + 2, b = i + 3;
  addC(`表达式 ${a} + ${b} * 2 的值是`, [...], 'C', '乘法优先于加法，先计算 b*2，再与 a 相加。', ['c_operator'], {star: i < 4});
  addC(`若 int n=${a}; 则 n/2 的结果是`, [...], 'B', '两个操作数都是 int，整数除法会截去小数部分。', ['c_operator']);
  // ... 每轮 11 道，共 132 道
}
```

数字和答案选项都是模板里算出来的，不是抄的——`a + b * 2` 的干扰项 `(a+b)*2` 和正确答案 `a + b*2` 靠运算符优先级区分，这本来就是考点本身。

最终产出 342 道（C 语言 138 + WPS 204），id 从 `Math.max(...existing.map(x => x.id))` 之后接着编号，避免和已有题冲突。

### `fix-generated-bank.js` — 生成后修正

前三个脚本产出的题不是终稿，这个脚本负责两类修正：

**第一类，修正答案错的题**。模板生成时有两个坑：

```js
// 坑 1：题干里嵌的字符串长度算错了 —— "C{i}LANG" 实际是 6 个字符，模板写死了 '5'
if (item.cat === 'c' && item.q.startsWith('字符串 "C')) {
  const match = item.q.match(/字符串 "([^"]+)"/);
  const value  = match ? match[1] : 'C0LANG';
  const len    = value.length;              // 重新算
  item.opts = [`${len-1}`, `${${len+1}`, `${len}`, `${len+2}`];
  item.ans  = 'C';
  item.q    = `字符串 "${value}" 的长度（不含结束符）是`;
}
```

**长度是从题干正则抽出来重新算的**，不是拍脑袋改数字。`\0` 不计入长度这个考点也一并写进了解析。

**第二类，给同考点变式编业务场景**。12 个循环生成出 12 道题干一模一样的 WPS 题，直接入库的话用户刷题时会连续碰到 12 道完全相同的题干。这个脚本用计数器给它们编号区分：

```js
const counters = new Map();
for (const item of generated) {
  const key = item.q;
  const n = counters.get(key) || 0;
  counters.set(key, n + 1);
  if (n > 0 && item.cat === 'wps') {
    const scenario = n + 1;
    if (key.startsWith('WPS 表格中计算区域合计'))
      item.q = `WPS 表格中计算第${scenario}个数据区域合计最适合使用的函数是`;
    // ... 16 类 WPS 题干逐一改写
  }
}
```

「计算区域合计」→「计算第 2 个数据区域合计」→「计算第 3 个数据区域合计」。考点不变，题干不重复。这 16 个 `startsWith` 分支覆盖了 C 语言和 WPS 两大类下所有会重复的模板。

## 三、使用顺序

```bash
node expand-bank.js         # 1. 按大纲生成 342 道原创题，追加到题库
node fix-generated-bank.js  # 2. 修正答案错误的题 + 给变式编场景编号
node dedupe-bank.js         # 3. 去掉签名完全重复的题
node analyze.js             # 4. 体检：确认题量与重复数
```

顺序不能换。`fix` 必须在 `dedupe` 之前——因为修正过程本身会改变题干（加了「第 N 个」前缀），先把题干改干净再去重才有效。反过来先 dedupe 会把 12 道一模一样的题删到只剩 1 道，白生成。

四个脚本都读写同一个 `outputs/ncre-quiz/index.html`，路径硬编码在文件顶部，改目录要同步改。

## 四、文件结构

```
tools/
├── analyze.js            # 题库体检（只读，输出重复统计）
├── dedupe-bank.js        # 按签名去重（只清原创题，不动整理题）
├── expand-bank.js        # 按 2025 大纲批量生成（342 道）
└── fix-generated-bank.js # 答案修正 + 变式场景编号
```

## 五、几个可以改进的地方

- **扫描器重复了四份**。同一段状态机在四个文件里各写一遍，改一处要同步四处。抽成 `shared-extract.js` 用 `require` 引入会更好——当时是单次任务，直接复制更快。
- **`fix-generated-bank.js` 的 16 个 `startsWith` 分支太脆**。题干文案一改，分支就全部失配，静默不改任何东西。更好的做法是在 `expand-bank.js` 生成时就直接带上场景编号，省掉整个修正环节。
- **`analyze.js` 的归一化正则字符类有问题**（`[锛堬級()鈥溾€?'鈥鈥樷€橾]` 这串有明显乱码），实际匹配范围和预期不完全一致。去重逻辑本身有效，但这个正则应该重写清楚。
- **无备份机制**。四个脚本都直接覆盖 `index.html`。真要复用，第一次跑之前该先 `cp index.html index.html.bak`。

## 许可证

MIT License
