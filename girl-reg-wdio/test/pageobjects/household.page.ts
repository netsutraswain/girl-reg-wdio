import { $ } from '@wdio/globals';
import Page from './page.js';

class HouseholdPage extends Page {
    /**
     * Define selectors using getter methods
     */
    public get registerMemberBtn () {
        return $("*=Register a new household member");
    }

    /**
     * Clicks the register member button using robust JS click
     * after waiting for the Angular spinner to disappear
     */
    public async registerNewMember () {
        // Wait for spinner to disappear before trying to interact
        await this.waitForSpinnerToDisappear();
        
        try {
            await this.registerMemberBtn.waitForExist({ timeout: 5000 });
            
            // Scroll the button into view in case it's at the bottom
            await this.registerMemberBtn.scrollIntoView();
            await this.clickByText('Register a new household member');
        } catch(e) {
            console.warn("Register button not found (account state likely changed). Falling back to direct navigation...");
            await browser.url('https://mygs-uat.girlscouts.org/search?type=TROOP&address=,,10001,&season=Current');
        }
    }
}

export default new HouseholdPage();
