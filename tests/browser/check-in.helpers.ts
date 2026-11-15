import type {Page} from '@playwright/test';
export async function fillCheckIn(page:Page,heartRate='63'){
 await page.getByLabel('Heart rate availability',{exact:true}).selectOption('value');
 await page.getByLabel('Sleep availability',{exact:true}).selectOption('value');
 await page.getByLabel('Heart rate (bpm)',{exact:true}).fill(heartRate);
 await page.getByLabel('Sleep duration (hours)',{exact:true}).fill('7');
 await page.getByLabel('Heart rate context',{exact:true}).selectOption('rest');
 await page.getByLabel('Reported time precision',{exact:true}).selectOption('exact');
 await page.getByLabel('Measured time with offset',{exact:true}).fill('2026-01-10T12:00:00Z');
 const acquisition=page.locator('details').filter({has:page.getByText('Acquisition and confidence',{exact:true})});
 if(await acquisition.getAttribute('open')===null)await page.getByText('Acquisition and confidence',{exact:true}).click();
 await page.getByLabel('Device or report identifier',{exact:true}).fill('fictional-device');
 await page.getByLabel('Reported posture',{exact:true}).selectOption('seated');
 await page.getByLabel('Signal quality',{exact:true}).selectOption('fictional_passed');
}
export async function saveCheckIn(page:Page,heartRate='63'){
 await fillCheckIn(page,heartRate);await page.getByRole('button',{name:'Save check-in',exact:true}).click();
}
