import {test,expect} from '@playwright/test';
import {show} from './nav.helpers';

test('NASA context and public research fixture stay separate from crew history and reopen offline',async({page,context})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.getByRole('heading',{name:'Aster'})).toBeVisible();await show(page,'Sources');
 await expect(page.getByRole('link',{name:'NASA HRP: Five Hazards of Human Spaceflight'})).toHaveAttribute('href','https://www.nasa.gov/hrp/hazards/');
 await page.getByText('Inspect the archive sample and evidence',{exact:true}).click();await expect(page.getByText('NASA OSD-575 contains serum laboratory metadata.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Open research sample'}).click();await expect(page.getByRole('table',{name:'Public research intervals'})).toBeVisible();await expect(page.getByRole('table',{name:'Public research intervals'}).locator('tbody tr')).toHaveCount(6);await expect(page.getByRole('table',{name:'Public research intervals'})).toContainText('270 ms');
 await show(page,'Overview');await expect(page.getByRole('table',{name:'Reading history'})).not.toContainText('PTB');await page.getByLabel('Choose crew',{exact:true}).selectOption('crew-b');await expect(page.getByRole('table',{name:'Reading history'})).toContainText('72');await expect(page.getByRole('table',{name:'Reading history'})).not.toContainText('270');
 await show(page,'Sources');await page.getByRole('button',{name:'Open research sample'}).click();await expect(page.getByText('Retained research sample unchanged.',{exact:true})).toBeVisible();
 await page.screenshot({path:'.scratch/module02/sources-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.scratch/module02/sources-mobile.png',fullPage:true});
 await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'Vega'})).toBeVisible();await show(page,'Sources');await page.getByText('Inspect the archive sample and evidence',{exact:true}).click();await expect(page.getByRole('table',{name:'Public research intervals'}).locator('tbody tr')).toHaveCount(6);await page.getByRole('button',{name:'Open research sample'}).click();await expect(page.getByText('Retained research sample unchanged.',{exact:true})).toBeVisible();expect(errors).toEqual([]);
});
