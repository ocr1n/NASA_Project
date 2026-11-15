import {test,expect} from '@playwright/test';
import {show} from './nav.helpers';

test('computed references expose fixed, rolling and date-only exam evidence',async({page})=>{
 await page.goto('/');await show(page,'Trends');const panel=page.getByRole('region',{name:'Computed personal references',exact:true});
 await expect(panel.getByText('62 /min',{exact:true})).toBeVisible();
 await expect(panel.getByText('Coverage unknown — cadence not supplied.',{exact:true})).toBeVisible();
 await panel.getByText('Inspect reference inputs',{exact:true}).click();await expect(panel.getByText('preflight-1',{exact:true})).toBeVisible();
 await expect(panel.getByText('60 /min · 2025-12-20T12:00:00Z · exact precision',{exact:true})).toBeVisible();
 await panel.getByRole('combobox',{name:'Reference method',exact:true}).selectOption('mission_rolling');
 await expect(panel.getByText('68 /min',{exact:true})).toBeVisible();
 await panel.getByRole('combobox',{name:'Reference metric',exact:true}).selectOption('lvef');
 await panel.getByRole('combobox',{name:'Reference method',exact:true}).selectOption('preflight_anchor');
 await expect(panel.getByText('60 %',{exact:true})).toBeVisible();
 await expect(panel.getByText('Single exam: variability is unavailable.',{exact:true})).toBeVisible();
 await panel.getByText('Inspect reference inputs',{exact:true}).click();
 await expect(panel.getByText('60 % · 2025-12-18 · date precision',{exact:true})).toBeVisible();
 await expect(panel.getByText('0 percentage points',{exact:true})).toBeVisible();
});

test('reference save survives reload/export/copy and crew switches preserve isolation',async({page})=>{
 await page.goto('/');await show(page,'Trends');const panel=page.getByRole('region',{name:'Computed personal references',exact:true});
 await expect(panel.getByText('62 /min',{exact:true})).toBeVisible();
 await panel.getByLabel('Reason for saving reference',{exact:true}).fill('Reviewed fictional preflight inputs');
 await panel.getByRole('button',{name:'Save reference',exact:true}).click();
 await expect(panel.getByRole('status').filter({hasText:'Reference saved'})).toBeVisible();
 await panel.getByText('Saved calculation history (1)',{exact:true}).click();
 await expect(panel.getByText('Reviewed fictional preflight inputs',{exact:true})).toBeVisible();
 await page.getByLabel('Choose crew',{exact:true}).selectOption('crew-b');
 await expect(panel.getByText('Baseline unavailable:',{exact:false})).toBeVisible();
 await expect(panel.getByText('Saved calculation history (0)',{exact:true})).toBeVisible();
 await page.getByLabel('Choose crew',{exact:true}).selectOption('crew-a');await page.reload();await show(page,'Trends');
 await expect(panel.getByText('Saved calculation history (1)',{exact:true})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export local data',exact:true}).click();
 const file=await download;const path=await file.path();expect(path).toBeTruthy();
 await page.getByLabel('Open exported copy',{exact:true}).setInputFiles(path!);
 await expect(page.getByText('Export opened as an independent local copy.',{exact:true})).toBeVisible();await show(page,'Trends');
 await expect(panel.getByText('Saved calculation history (1)',{exact:true})).toBeVisible();
 await page.setViewportSize({width:390,height:844});await panel.scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await panel.screenshot({path:'docs/evidence/06-baselines-mobile.png'});
 await page.setViewportSize({width:1365,height:1000});await panel.screenshot({path:'docs/evidence/06-baselines-desktop.png'});
 await expect(page.getByText('Available offline after installation',{exact:true})).toBeVisible();
 await page.context().setOffline(true);await page.reload();await show(page,'Trends');
 await expect(panel.getByText('62 /min',{exact:true})).toBeVisible();
 await expect(panel.getByText('Saved calculation history (1)',{exact:true})).toBeVisible();
});
