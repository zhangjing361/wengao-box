import './style.css';
import {parseDocument,safeFilename} from './parser.js';
import {renderPreview} from './preview.js';
import {exportDocx} from './exporter.js';
import sample from './sample.md?raw';
const $=id=>document.getElementById(id);
const editor=$('editor'),preview=$('preview'),button=$('export'),status=$('status');
const empty=preview.firstElementChild.cloneNode(true);
let timer, busy=false, dirty=false, revision=0;
function say(message,error=false){status.textContent=message;status.classList.toggle('error',error);}
function refresh(){
  clearTimeout(timer);
  $('count').textContent=`${editor.value.length.toLocaleString('en-US')} / 100,000 字符`;
  $('warnings').replaceChildren();$('warnings').hidden=true;
  if(!editor.value.trim()){
    preview.replaceChildren(empty.cloneNode(true));button.disabled=true;
    say('请先输入文稿，或点击「载入示例」。');return null;
  }
  try{
    const model=parseDocument(editor.value);
    renderPreview(model,preview,$('template').value);
    button.disabled=busy;
    if(model.warnings.length){
      $('warnings').hidden=false;
      const title=document.createElement('strong');title.textContent='导出前，请留意';$('warnings').append(title);
      const list=document.createElement('ul');
      for(const message of model.warnings){const li=document.createElement('li');li.textContent=message;list.append(li);}
      $('warnings').append(list);
    }
    say(`已就绪 · ${model.count} 个内容块${model.warnings.length ? ` · ${model.warnings.length} 条格式提示` : ''}`);
    return model;
  }catch(error){preview.replaceChildren();button.disabled=true;say(error.message||'文稿解析失败，请简化内容后重试。',true);return null;}
}
editor.addEventListener('input',()=>{dirty=true;revision++;button.disabled=true;clearTimeout(timer);timer=setTimeout(refresh,220);});
$('template').addEventListener('change',()=>{dirty=Boolean(editor.value.trim());revision++;refresh();});
$('sample').addEventListener('click',()=>{
  if(editor.value.trim()&&!window.confirm('载入示例将替换当前文稿，未导出的内容会丢失。确定替换吗？'))return;
  editor.value=sample;dirty=true;revision++;refresh();editor.setSelectionRange(0,0);editor.scrollTop=0;editor.focus({preventScroll:true});
});
button.addEventListener('click',async()=>{
  if(busy)return;
  const model=refresh();if(!model)return;
  const snapshot=revision,filename=safeFilename($('filename').value),template=$('template').value;
  busy=true;button.disabled=true;button.textContent='正在生成…';say('正在本地生成 Word，请稍候…');
  try{
    const blob=await exportDocx(model,template);
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    if(revision===snapshot)dirty=false;
    say(`已发起下载：${filename}${revision!==snapshot?'。你刚修改的内容尚未导出。':'。请在下载列表中查看文件。'}`);
  }catch{say('Word 生成失败，文稿仍保留在输入框中。请缩短内容后重试。',true);}
  finally{
    busy=false;button.textContent='↓ 下载 Word';
    if(revision!==snapshot){
      const message=status.textContent,error=status.classList.contains('error');
      const current=refresh();
      if(current)say(message,error);
    }else button.disabled=false;
  }
});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
