import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel,
  WidthType, BorderStyle, LevelFormat, AlignmentType, ShadingType, TableLayoutType } from 'docx';
import { TEMPLATES, PAGE } from './templates.js';

export async function exportDocx(model, templateId = 'normal') {
  const t = TEMPLATES[templateId];
  if (!t) throw new Error('请选择有效的排版模板。');
  const numbering = [];
  const font = name => ({ ascii: name, hAnsi: name, eastAsia: name, cs: name });
  function runs(items, extra = {}) {
    return items.flatMap(r => r.text.split('\n').map((part, i) => new TextRun({
      text: part, ...(i ? { break: 1 } : {}), ...extra,
      ...(r.bold ? { bold: true } : {}), ...(r.italic ? { italics: true } : {}),
      ...(r.strike ? { strike: true } : {}),
      ...(r.code ? { font: { ascii: 'Consolas', hAnsi: 'Consolas', eastAsia: t.bodyFont }, size: 20,
        shading: { fill: 'F2F4F7', type: ShadingType.CLEAR } } : {}),
    })));
  }
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'D6DCE5' };
  function render(nodes, ctx = {}) {
    return nodes.flatMap(n => {
      const indent = (ctx.depth || 0) * 420 + (ctx.quote || 0) * 300;
      const p = options => new Paragraph({
        spacing: { after: t.after, line: t.line }, widowControl: true,
        ...(indent ? { indent: { left: indent } } : {}),
        ...(ctx.quote ? { border: { left: { ...border, color: '8391A6', space: 10 } } } : {}),
        ...options,
      });
      switch (n.type) {
        case 'heading': return p({ heading: HeadingLevel[`HEADING_${n.level}`], keepNext: true, children: runs(n.runs), spacing: { before: 240, after: 140, line: t.line } });
        case 'paragraph': return p({ children: runs(n.runs) });
        case 'code': return p({ children: runs([{ text: n.text, code: true }]), spacing: { after: 160, line: 280 }, shading: { fill: 'F2F4F7', type: ShadingType.CLEAR } });
        case 'hr': return p({ border: { bottom: border }, children: [], spacing: { after: 160 } });
        case 'quote': return render(n.blocks, { ...ctx, quote: (ctx.quote || 0) + 1 });
        case 'list': {
          const level = ctx.depth || 0;
          const reference = `list-${numbering.length}`;
          numbering.push({ reference, levels: Array.from({ length: 3 }, (_, i) => ({
            level: i, start: n.ordered ? n.start : 1,
            format: n.ordered ? LevelFormat.DECIMAL : LevelFormat.BULLET,
            text: n.ordered ? `%${i + 1}.` : '•', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: (i + 1) * 420 + (ctx.quote || 0) * 300, hanging: 260 } } },
          })) });
          return n.items.flatMap(item => {
            const first = item[0];
            const hasRuns = first && ['paragraph', 'heading'].includes(first.type);
            const lead = p({ ...(first?.type === 'heading' ? { heading: HeadingLevel[`HEADING_${first.level}`], keepNext: true } : {}), numbering: { reference, level }, indent: { left: (level + 1) * 420 + (ctx.quote || 0) * 300, hanging: 260 }, children: runs(hasRuns ? first.runs : []) });
            return [lead, ...render(item.slice(hasRuns ? 1 : 0), { ...ctx, depth: level + 1 })];
          });
        }
        case 'table': {
          const width = PAGE.width - t.margin * 2 - indent;
          const columns = n.rows[0].length;
          const sizes = Array.from({ length: columns }, (_, i) => Math.floor(width / columns) + (i < width % columns ? 1 : 0));
          return [new Table({ width: { size: width, type: WidthType.DXA }, layout: TableLayoutType.FIXED,
            columnWidths: sizes,
            rows: n.rows.map((row, ri) => new TableRow({ tableHeader: ri === 0,
              children: row.map((cell, ci) => new TableCell({
                width: { size: sizes[ci], type: WidthType.DXA },
                margins: { top: 90, bottom: 90, left: 100, right: 100 },
                borders: { top: border, bottom: border, left: border, right: border },
                ...(ri === 0 ? { shading: { fill: 'EDF1F7', type: ShadingType.CLEAR } } : {}),
                children: [new Paragraph({ spacing: { after: 0, line: 300 },
                  alignment: n.align[ci] === 'center' ? AlignmentType.CENTER : n.align[ci] === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT,
                  children: runs(cell, { bold: ri === 0, size: 20 }) })],
              })),
            })),
          }), new Paragraph({ spacing: { after: 80 }, children: [] })];
        }
        default: throw new Error('文稿包含无法导出的结构。');
      }
    });
  }
  const children = render(model.blocks);
  const doc = new Document({ creator: '文稿盒', title: '文稿', description: '在浏览器本地生成的可编辑文档',
    styles: { default: { document: { run: { font: font(t.bodyFont), size: t.size, color: '202733' }, paragraph: { spacing: { line: t.line, after: t.after } } } },
      paragraphStyles: Array.from({ length: 6 }, (_, i) => ({ id: `Heading${i + 1}`, name: `Heading ${i + 1}`,
        basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: font(t.headingFont), size: [36, 30, 26, 24, 23, 22][i], bold: true, color: '182231' },
        paragraph: { outlineLevel: i, keepNext: true, spacing: { before: 240, after: 140 } },
      })),
    },
    numbering: { config: numbering },
    sections: [{ properties: { page: { size: PAGE, margin: { top: t.margin, bottom: t.margin, left: t.margin, right: t.margin } } }, children }],
  });
  return Packer.toBlob(doc);
}
