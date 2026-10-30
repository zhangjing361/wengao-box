import { TEMPLATES } from './templates.js';
export function renderPreview(model, root, templateId) {
  const doc = root.ownerDocument;
  const el = (tag, text) => { const n = doc.createElement(tag); if (text !== undefined) n.textContent = text; return n; };
  function runs(items, parent) {
    for (const r of items) {
      let n = doc.createTextNode(r.text);
      for (const [key, tag] of [['code','code'], ['strike','s'], ['italic','em'], ['bold','strong']]) {
        if (r[key]) { const wrap = el(tag); wrap.append(n); n = wrap; }
      }
      parent.append(n);
    }
  }
  function blocks(nodes, parent) {
    for (const n of nodes) {
      let item;
      switch(n.type) {
        case 'heading': item = el(`h${n.level}`); runs(n.runs,item); break;
        case 'paragraph': item = el('p'); runs(n.runs,item); break;
        case 'hr': item = el('hr'); break;
        case 'code': item = el('pre'); item.append(el('code', n.text)); break;
        case 'quote': item = el('blockquote'); blocks(n.blocks,item); break;
        case 'list': item = el(n.ordered ? 'ol' : 'ul'); if (n.ordered) item.start = n.start;
          for (const children of n.items) { const li = el('li'); blocks(children,li); item.append(li); } break;
        case 'table': {
          item = el('div'); item.className = 'table-scroll'; const table = el('table');
          n.rows.forEach((row, ri) => { const tr = el('tr');
            row.forEach((cell, ci) => { const td = el(ri === 0 ? 'th' : 'td'); runs(cell,td); if(n.align[ci]) td.style.textAlign=n.align[ci]; tr.append(td); });
            if (ri === 0) { const head=el('thead'); head.append(tr); table.append(head); }
            else { if (!table.tBodies.length) table.append(el('tbody')); table.tBodies[0].append(tr); }
          }); item.append(table); break;
        }
        default: throw new Error('无法预览的文稿结构。');
      }
      parent.append(item);
    }
  }
  root.replaceChildren(); root.dataset.template=templateId;
  const t=TEMPLATES[templateId];
  root.style.setProperty('--paper-font', `"${t.bodyFont}", serif`);
  blocks(model.blocks,root);
}
