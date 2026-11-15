import {expect,type Page} from '@playwright/test';

export type Tab='Overview'|'Check-in'|'Trends'|'Atlas'|'Reports'|'Findings'|'Log'|'Sources';

/** Switch the dashboard to a tab and wait until its page is the visible one. */
export async function show(page:Page,tab:Tab){
  const button=page.getByRole('button',{name:tab,exact:true});
  await expect(button).toBeVisible();
  if(await button.getAttribute('aria-current')!=='page')await button.click();
  await expect(button).toHaveAttribute('aria-current','page');
}
