import {test,expect} from '@playwright/test';
test('示例、模板、确认替换、导出和空输入',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'把文字，变成一份好文档。'})).toBeVisible();
 await page.getByRole('button',{name:'载入示例'}).click();
 await expect(page.locator('#preview h1')).toHaveText('校园读书分享会策划');
 expect(await page.locator('#editor').evaluate(e=>e.scrollTop)).toBe(0);
 await page.getByLabel('排版模板').selectOption('report');
 await expect(page.locator('#preview')).toHaveAttribute('data-template','report');
 await page.getByLabel('文件名称').fill('../我的报告');
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'下载 Word'}).click();
 expect((await download).suggestedFilename()).toBe('_我的报告.docx');
 await page.getByLabel('文稿内容').fill('自己的文稿');
 page.once('dialog',d=>d.dismiss());
 await page.getByRole('button',{name:'载入示例'}).click();
 await expect(page.getByLabel('文稿内容')).toHaveValue('自己的文稿');
 page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:'载入示例'}).click();
 await expect(page.getByLabel('文稿内容')).toHaveValue(/校园读书分享会策划/);
 await page.getByLabel('文稿内容').fill('');
 await expect(page.getByRole('button',{name:'下载 Word'})).toBeDisabled();
});
test('危险内容不执行，不加载外部资源，离线导出',async({page,context})=>{
 await page.goto('/');
 const requests=[]; page.on('request',r=>requests.push(r.url()));
 await page.getByLabel('文稿内容').fill('# 安全试验\n\n<script>window.pwned=1</script>\n\n![图片](https://example.com/a.png)\n\n[链接](javascript:alert)');
 await expect(page.locator('#preview')).toContainText('安全试验');
 expect(await page.locator('#preview script,#preview img,#preview a').count()).toBe(0);
 expect(await page.evaluate(()=>window.pwned)).toBeUndefined();
 await context.setOffline(true);
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'下载 Word'}).click(); await download;
 expect(requests).toEqual([]);
});
test('手机宽度不横向溢出，超限有中文错误',async({page})=>{
 await page.setViewportSize({width:390,height:844}); await page.goto('/');
 await page.getByRole('button',{name:'载入示例'}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByLabel('文稿内容').fill('x'.repeat(100001));
 await expect(page.locator('#status')).toContainText('100,000');
 await expect(page.getByRole('button',{name:'下载 Word'})).toBeDisabled();
});
test('导出时修改文稿，完成后不能绕过输入校验',async({page})=>{
 await page.goto('/'); await page.getByRole('button',{name:'载入示例'}).click();
 await page.evaluate(()=>{
   document.getElementById('export').addEventListener('click',()=>{
     const editor=document.getElementById('editor');editor.value='x'.repeat(100001);
     editor.dispatchEvent(new Event('input',{bubbles:true}));
   },{once:true});
   // 在下载链接点击的同步时刻之后检查 finally，而不等待输入防抖。
   const original=HTMLAnchorElement.prototype.click;
   HTMLAnchorElement.prototype.click=function(){
     original.call(this);
     queueMicrotask(()=>{ window.exportButtonDisabledAfterDownload=document.getElementById('export').disabled; });
   };
 });
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'下载 Word'}).evaluate(button=>button.click());await download;
 expect(await page.evaluate(()=>window.exportButtonDisabledAfterDownload)).toBe(true);
 await expect(page.locator('#status')).toContainText('100,000');
});
