import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDocument, safeFilename} from '../src/parser.js';
const text = m => JSON.stringify(m.blocks);
test('标题、粗斜体与代码保留结构', () => {
 const m=parseDocument('# 中文\n\n**粗** *斜* `x < y`');
 assert.equal(m.blocks[0].level,1);
 assert.ok(m.blocks[1].runs.some(r=>r.bold&&r.text==='粗'));
 assert.ok(m.blocks[1].runs.some(r=>r.italic&&r.text==='斜'));
 assert.match(text(m),/x < y/);
});
test('HTML、链接、图片只保留文字并提示', () => {
 const m=parseDocument('<script>alert(1)</script>\n\n[点我](javascript:alert) ![猫](https://example.com/cat.png)');
 assert.match(text(m),/<script>/); assert.match(text(m),/javascript:alert/);
 assert.match(text(m),/猫/); assert.ok(m.warnings.length>=2);
});
test('空文稿与全部容量边界', () => {
 assert.throws(()=>parseDocument('  '),/输入/);
 assert.throws(()=>parseDocument('中'.repeat(100001)),/100,000/);
 assert.throws(()=>parseDocument('段落\n\n'.repeat(501)),/500/);
 assert.throws(()=>parseDocument('- a\n  - b\n    - c\n      - d'),/3 层/);
 assert.throws(()=>parseDocument('|'+Array(31).fill('a').join('|')+'|\n|'+Array(31).fill('---').join('|')+'|'),/30 列/);
 assert.throws(()=>parseDocument('|a|\n|-|\n'+'|b|\n'.repeat(200)),/200 行/);
});
test('空表格单元格、三级列表、非一开始编号', () => {
 const m=parseDocument('|甲|乙|\n|---|---|\n||值|\n\n3. 第一\n   - 子项\n     - 末级');
 assert.equal(m.blocks[0].rows[1][0].length,0);
 assert.equal(m.blocks[1].start,3);
});
test('代码中 HTML 不被解析，软换行可读',()=> {
 const m=parseDocument('```html\n<script>x</script>\n```\n\n甲\n乙');
 assert.equal(m.blocks[0].text,'<script>x</script>'); assert.match(text(m),/甲/);
});
test('XML 不合法控制符拒绝，不静默损失',()=>assert.throws(()=>parseDocument('a\u0000b'),/控制字符/));
test('文件名安全、空默认、系统保留名',()=> {
 assert.equal(safeFilename(''), '我的文稿.docx');
 assert.equal(safeFilename('报告.docx'), '报告.docx');
 assert.ok(!/[<>:"/\\|?*]/.test(safeFilename('../坏:名')));
 assert.notEqual(safeFilename('CON'),'CON.docx');
});
test('多余表格单元格不得被 Markdown 解析器静默丢弃',()=> {
 assert.throws(()=>parseDocument('|甲|乙|\n|---|---|\n|一|二|不能丢|'),/多余单元格/);
 const m=parseDocument('|甲|乙|\n|---|---|\n|一\\|二|三|');
 assert.match(JSON.stringify(m),/一\|二/);
});
test('深层引用有界，未配对 Unicode 拒绝',()=>{
 assert.throws(()=>parseDocument('> '.repeat(22)+'内容'),/嵌套/);
 assert.throws(()=>parseDocument('a\ud800b'),/无效字符/);
});
