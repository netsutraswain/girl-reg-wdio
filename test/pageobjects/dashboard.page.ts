import { $, browser } from '@wdio/globals';
import Page from './page.js';

class DashboardPage extends Page {

    private get myAccountBtn() { return $('#myAccountBtn'); }

    /**
     * Navigates from the dashboard to the Household page.
     *
     * "My Household" lives inside a collapsed nav dropdown — it exists in the DOM
     * but is not CSS-visible until the menu is opened. We use JS click which
     * bypasses visibility, consistent with how the app's Angular router handles it.
     *
     * Falls back to direct URL navigation if the link is never found.
     */
    public async navigateToHousehold(): Promise<void> {
        await this.myAccountBtn.waitForExist({ timeout: 15_000 });
        await this.waitForAngular();

        // Dismiss any "Time to Renew" / cookie banners
        try {
            const closeBanner = await $('button*=Close');
            if (await closeBanner.isExisting() && await closeBanner.isDisplayed()) {
                await closeBanner.click();
                await browser.pause(600);
            }
        } catch { /* no banner */ }

        // JS click — works even when the dropdown is collapsed (not CSS-visible)
        const clicked = await browser.execute(() => {
            const link = Array.from(document.querySelectorAll('a, button, li'))
                .find(el => (el.textContent ?? '').trim().includes('My Household'));
            if (link) { (link as HTMLElement).click(); return true; }
            return false;
        });

        if (!clicked) {
            console.warn('[Dashboard] "My Household" not found — navigating directly.');
            await this.open('household');
        }

        await this.waitForAngular();
    }
}

export default new DashboardPage();
