import { $ } from '@wdio/globals';
import Page from './page.js';

/**
 * Page Object — Troop Search Map (/map or /search)
 */
class TroopSearchPage extends Page {

    private get btnSearch()  { return $('button.btn-primary[type="submit"]'); }
    private get btnAddGirl() { return $('button[name^="addGirl-"]'); }

    /**
     * Searches for troops, adds the first result to cart, then clicks "Add Details".
     */
    public async searchAndSelectTroop(): Promise<void> {
        await this.dismissCookieBanner();

        // Submit the pre-populated search — jsClick bypasses overlay/interactability blocks
        await this.btnSearch.waitForExist({ timeout: 15_000 });
        await this.btnSearch.scrollIntoView({ block: 'center' });
        await browser.pause(1000); // Give the map/search a moment to initialize
        await this.jsClick(await this.btnSearch);
        await this.waitForAngular();

        // Add the first available troop to cart (API can be slow)
        await this.btnAddGirl.waitForExist({ timeout: 30_000 });
        await this.btnAddGirl.scrollIntoView({ block: 'center' });
        await this.jsClick(await this.btnAddGirl);
        await this.waitForAngular();

        // Navigate to the registration form
        await this.clickButtonWithText('add details');
    }
}

export default new TroopSearchPage();
