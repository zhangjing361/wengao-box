import { marked } from 'marked';

export const LIMITS = Object.freeze({ characters: 100000, blocks: 500, columns: 30, rows: 200, listDepth: 3 });

export function safeFilename(value) {
  let name = String(value ?? '').normalize('NFC').replace(/\.docx$/i, '')
    .replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '_').replace(/^[.\s]+|[.\s]+$/g, '');
  name = [...name].slice(0, 80).join('');
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(name)) name = '_' + name;
  return (name || '我的文稿') + '.docx';
}

export function parseDocument(source) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('请先输入或载入一段文稿。');
  if (source.length > LIMITS.characters) throw new Error('文稿超过 100,000 个字符，请分段导出。');
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]/u.test(source) || !source.isWellFormed()) {
    throw new Error('文稿含 Word 不支持的控制字符或无效字符，请移除后重试。');
  }
  const warnings = new Set();
  let count = 0;
  const bump = () => { if (++count > LIMITS.blocks) throw new Error('文稿超过 500 个块级元素，请分段导出。'); };
  function inline(tokens, marks = {}, depth = 0) {
    if (depth > 30) throw new Error('行内格式嵌套过深，请简化文稿。');
    return (tokens || []).flatMap(t => {
      const run = text => [{ ...marks, text }];
      switch (t.type) {
        case 'strong': return inline(t.tokens, { ...marks, bold: true }, depth + 1);
        case 'em': return inline(t.tokens, { ...marks, italic: true }, depth + 1);
        case 'del': return inline(t.tokens, { ...marks, strike: true }, depth + 1);
        case 'codespan': return [{ ...marks, code: true, text: t.text }];
        case 'br': return run('\n');
        case 'link':
          warnings.add('链接已转为名称和地址文字，不创建可点击链接。');
          return [...inline(t.tokens, marks, depth + 1), ...run(`（${t.href}）`)];
        case 'image':
          warnings.add('图片未下载或嵌入；仅保留图片说明和地址。');
          return run(`[图片：${t.text || '无说明'}；${t.href}]`);
        case 'html': warnings.add('HTML 已按原始文字保留，不执行或渲染。'); return run(t.raw);
        case 'text': return t.tokens ? inline(t.tokens, marks, depth + 1) : (t.text ? run(t.text) : []);
        case 'escape': return run(t.text);
        default: warnings.add('部分语法不受支持，已按原始文字保留。'); return run(t.raw || t.text || '');
      }
    });
  }
  function blocks(tokens, listDepth = 0, nesting = 0) {
    if (nesting > 20) throw new Error('引用或块嵌套过深，请简化文稿。');
    return tokens.filter(t => t.type !== 'space').map(t => {
      bump();
      switch (t.type) {
        case 'heading': return { type: 'heading', level: t.depth, runs: inline(t.tokens) };
        case 'paragraph': case 'text': return { type: 'paragraph', runs: inline(t.tokens || [{ type: 'text', text: t.text }]) };
        case 'code': return { type: 'code', text: t.text, language: t.lang || '' };
        case 'hr': return { type: 'hr' };
        case 'blockquote': return { type: 'quote', blocks: blocks(t.tokens, listDepth, nesting + 1) };
        case 'list':
          if (listDepth >= LIMITS.listDepth) throw new Error('列表最多支持 3 层，请减少嵌套。');
          return { type: 'list', ordered: t.ordered, start: t.ordered ? t.start : 1,
            items: t.items.map(item => {
              bump();
              const children = blocks(item.tokens, listDepth + 1, nesting + 1);
              if (item.task) {
                warnings.add('任务复选框转为 [x] 或 [ ] 文字，不是交互控件。');
                const first = children[0];
                if (first?.runs) first.runs.unshift({ text: item.checked ? '[x] ' : '[ ] ' });
              }
              return children;
            }) };
        case 'table': {
          // 标准 GFM 会截断超出表头列数的单元格；这里拒绝，以免丢失正文。
          for (const line of t.raw.trim().split('\n').slice(2)) {
            let cells = [''];
            for (let i = 0; i < line.length; i++) {
              let escapes = 0;
              for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) escapes++;
              if (line[i] === '|' && escapes % 2 === 0) cells.push('');
              else cells[cells.length - 1] += line[i];
            }
            if (!cells[0].trim()) cells.shift();
            if (cells.length && !cells[cells.length - 1].trim()) cells.pop();
            if (cells.length > t.header.length) throw new Error('表格某行含多余单元格，请让每行列数与表头一致。');
          }
          if (t.header.length > LIMITS.columns) throw new Error('表格超过 30 列，请拆分表格。');
          if (t.rows.length + 1 > LIMITS.rows) throw new Error('表格超过 200 行（含表头），请拆分表格。');
          return { type: 'table', align: t.align, rows: [t.header, ...t.rows].map(row => row.map(cell => inline(cell.tokens))) };
        }
        case 'html': warnings.add('HTML 已按原始文字保留，不执行或渲染。'); return { type: 'paragraph', runs: [{ text: t.raw }] };
        default: warnings.add('部分语法不受支持，已按原始文字保留。'); return { type: 'paragraph', runs: [{ text: t.raw || t.text || '' }] };
      }
    });
  }
  let result;
  try { result = blocks(marked.lexer(source, { gfm: true })); }
  catch (error) {
    if (error instanceof RangeError) throw new Error('文稿嵌套过深，请简化结构后重试。');
    throw error;
  }
  if (!result.length) throw new Error('请先输入正文；仅有链接定义无法生成文档。');
  if (/\$[^\n]+\$|\\\[|\\\(/.test(source)) warnings.add('数学公式按文字保留，不转换为 Word 公式。');
  return { blocks: result, warnings: [...warnings], count, characters: source.length };
}
