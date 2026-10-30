import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1160},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8770');
await page.getByRole('button',{name:'载入示例'}).click();
await page.screenshot({path:'docs/screenshots/desktop.png',fullPage:true});
for (const [id,name] of [['normal','普通文档示例'],['report','课程报告示例']]) {
 await page.getByLabel('排版模板').selectOption(id);
 await page.getByLabel('文件名称').fill(name);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'下载 Word'}).click();
 const download=await downloadPromise;await download.saveAs(`examples/${name}.docx`);
}
await page.setViewportSize({width:390,height:844});
await page.locator('#editor').evaluate(e=>{e.scrollTop=0;});
await page.screenshot({path:'docs/screenshots/mobile.png',fullPage:true});
await writeFile('docs/screenshots/browser-result.json',JSON.stringify({browser:await browser.version(),errors},null,2));
console.log({browser:await browser.version(),errors});
await browser.close();
