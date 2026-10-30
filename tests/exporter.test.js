import {test} from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
import {parseDocument} from '../src/parser.js';
import {exportDocx} from '../src/exporter.js';
const sample='# 项目说明\n\n正文 **强调** 与 *斜体*。\n\n3. 第一\n   - 子项\n     - 末级\n4. 第二\n\n|列一|列二|\n|---|---|\n|中文||\n\n```js\nconst x = "<标签>";\n  next();\n```\n\n> 引用\n\n---\n\n[链接](javascript:alert) ![图](https://example.com/x.png)';
async function parts(template='normal') {
 const blob=await exportDocx(parseDocument(sample),template);
 assert.equal(blob.type,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
 const files=unzipSync(new Uint8Array(await blob.arrayBuffer()));
 return Object.fromEntries(Object.entries(files).map(([k,v])=>[k,strFromU8(v)]));
}
test('真实 DOCX 含标题、可编辑文本、表格、代码和列表',async()=> {
 const p=await parts(); const xml=p['word/document.xml'];
 for(const s of ['项目说明','正文','强调','斜体','第一','子项','末级','第二','列一','中文','next();','引用']) assert.ok(xml.includes(s),s);
 assert.match(xml,/w:pStyle w:val="Heading1"/); assert.match(xml,/<w:tbl>/);
 assert.match(xml,/<w:numPr>/); assert.match(xml,/&lt;标签&gt;/); assert.match(xml,/<w:br\/>/);
 assert.match(p['word/numbering.xml'],/<w:start w:val="3"/);
 assert.match(xml,/w:w="11906"/); assert.match(xml,/w:h="16838"/);
});
test('不产生远程关系、图片和宏，危险 URL 只是文字',async()=> {
 const p=await parts();
 for(const [name,xml] of Object.entries(p)) {
   if(name.endsWith('.rels')) assert.doesNotMatch(xml,/TargetMode="External"/);
   assert.doesNotMatch(name,/vbaProject|word\/media/);
 }
 assert.match(p['word/document.xml'],/javascript:alert/);
});
test('模板使用不同中文字体，六级标题有样式',async()=> {
 const a=await parts('normal'), b=await parts('report');
 assert.match(a['word/styles.xml'],/Microsoft YaHei/);
 assert.match(b['word/styles.xml'],/SimSun/);
 assert.match(b['word/styles.xml'],/Heading6/);
});
test('未知模板明确拒绝',async()=>assert.rejects(exportDocx(parseDocument('文稿'),'bad'),/模板/));
test('标题在列表内也保留 Word 标题级别',async()=>{
 const blob=await exportDocx(parseDocument('- ### 项目标题\n  后续正文'));
 const files=unzipSync(new Uint8Array(await blob.arrayBuffer()));
 assert.match(strFromU8(files['word/document.xml']),/w:pStyle w:val="Heading3"/);
});
