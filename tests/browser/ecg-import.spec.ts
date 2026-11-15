import {test,expect} from '@playwright/test';
import {show} from './nav.helpers';

test('public ECG report preview, selection, import and research export stay outside crew histories',async({page})=>{
 await page.goto('/');await show(page,'Sources');const panel=page.getByRole('region',{name:'Public ECG report import',exact:true});
 await panel.getByRole('button',{name:'Preview ECG import',exact:true}).click();
 await expect(panel.getByText('PTB-patient-15709',{exact:true})).toBeVisible();
 await expect(panel.getByText('PTB-patient-13243',{exact:true})).toBeVisible();
 await panel.getByLabel('Select ECG 2',{exact:true}).uncheck();
 await panel.getByRole('button',{name:'Import selected ECG reports',exact:true}).click();
 await expect(panel.getByRole('status').filter({hasText:'ECG research reports retained'})).toBeVisible();
 await expect(panel.getByText('Retained public ECG reports (1)',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'ECG reports',exact:true}).getByText('PTB-patient-15709',{exact:true})).toHaveCount(0);
 await page.getByLabel('Choose crew',{exact:true}).selectOption('crew-b');await expect(panel.getByText('Retained public ECG reports (1)',{exact:true})).toBeVisible();
 await page.reload();await show(page,'Sources');await expect(panel.getByText('Retained public ECG reports (1)',{exact:true})).toBeVisible();
 await panel.getByRole('combobox',{name:'Published ECG feature method',exact:true}).selectOption('Uni-G');await panel.getByRole('button',{name:'Preview ECG import',exact:true}).click();
 await panel.getByText('Inspect fields for ECG 1',{exact:true}).click();await expect(panel.getByText('63 /min · original 63.0 bpm',{exact:true})).toBeVisible();
 const download=page.waitForEvent('download');await panel.getByRole('button',{name:'Export ECG research records',exact:true}).click();expect((await download).suggestedFilename()).toBe('ptb-ecg-research.json');
 await page.setViewportSize({width:390,height:844});await panel.scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await panel.screenshot({path:'docs/evidence/04-ecg-import-mobile.png'});await page.setViewportSize({width:1365,height:1000});await panel.screenshot({path:'docs/evidence/04-ecg-import-desktop.png'});
 await expect(page.getByText('Available offline after installation',{exact:true})).toBeVisible();await page.context().setOffline(true);await page.reload();await show(page,'Sources');
 await expect(panel.getByText('Retained public ECG reports (1)',{exact:true})).toBeVisible();
});
