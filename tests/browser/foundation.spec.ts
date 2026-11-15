import {test,expect,chromium} from '@playwright/test';
import {mkdtemp,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {saveCheckIn} from './check-in.helpers';
import {show} from './nav.helpers';
test('crew isolation, capture/reload, export and independent restore work without browser errors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.getByRole('heading',{name:'Aster'})).toBeVisible();await expect(page.getByRole('table',{name:'Reading history'})).toContainText('62');
 await page.getByLabel('Choose crew',{exact:true}).selectOption('crew-b');await expect(page.getByRole('heading',{name:'Vega'})).toBeVisible();await expect(page.getByRole('table',{name:'Reading history'})).toContainText('72');await expect(page.getByRole('table',{name:'Reading history'})).not.toContainText('Preflight');
 await page.getByLabel('Choose crew',{exact:true}).selectOption('crew-a');await expect(page.getByRole('heading',{name:'Aster'})).toBeVisible();await show(page,'Check-in');await saveCheckIn(page);await expect(page.getByText('Check-in saved. Evaluation pending; no medical interpretation.')).toBeVisible();await page.reload();await expect(page.getByLabel('Follow-up status')).toHaveText('Completed');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export local data'}).click();const path=await (await download).path();const snapshot=JSON.parse(await readFile(path!,'utf8'));expect(snapshot.schemaVersion).toBe('0.1.0');expect(snapshot.records.filter((r:any)=>r.recordType==='Observation'&&r.observationId.startsWith('checkin-'))).toHaveLength(2);
 await page.getByLabel('Open exported copy').setInputFiles({name:'snapshot.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(snapshot))});await expect(page.getByText('Export opened as an independent local copy.')).toBeVisible();await expect(page.getByLabel('Follow-up status')).toHaveText('Completed');expect(errors).toEqual([]);
 await page.screenshot({path:'.scratch/module01/foundation-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'.scratch/module01/foundation-mobile.png',fullPage:true});
});
test('installed shell and records reopen offline in a new persistent browser session',async()=>{
 const profile=await mkdtemp(resolve('.scratch','browser-profile-'));let context=await chromium.launchPersistentContext(profile,{headless:true});let page=await context.newPage();await page.goto('http://127.0.0.1:4173');await expect(page.getByRole('heading',{name:'Aster'})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);await expect(page.getByText('Available offline after installation',{exact:true})).toBeVisible();await show(page,'Check-in');await saveCheckIn(page);await expect(page.getByText('Check-in saved. Evaluation pending; no medical interpretation.')).toBeVisible();await context.setOffline(true);await page.reload();await expect(page.getByLabel('Follow-up status')).toHaveText('Completed');await context.close();
 context=await chromium.launchPersistentContext(profile,{headless:true,offline:true});page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4173');await expect(page.getByRole('heading',{name:'Aster'})).toBeVisible();await expect(page.getByLabel('Follow-up status')).toHaveText('Completed');expect(errors).toEqual([]);await context.close();
});
