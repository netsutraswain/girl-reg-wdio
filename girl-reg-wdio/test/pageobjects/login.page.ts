import { $ } from '@wdio/globals';
import Page from './page.js';

class LoginPage extends Page {
    /**
     * Define selectors using getter methods
     */
    public get btnLogin () {
        return $('#loginBtn');
    }

    public get inputUsername () {
        // Target inputs inside Gigya container safely
        return $('input[name="username"], input[id^="gigya-loginID"]');
    }

    public get inputPassword () {
        return $('input[name="password"], input[id^="gigya-password"]');
    }

    public get btnSubmit () {
        // Robust submit button selector for Gigya forms
        return $('input[type="submit"][value="LOG IN"], .gigya-input-submit, button[type="submit"]');
    }

    /**
     * Encapsulates the entire login flow
     */
    public async login (username: string, password: string) {
        // 1. Click initial login button
        await this.btnLogin.waitForExist({ timeout: 20000 });
        await this.jsClick(await this.btnLogin);

        // 2. Fill credentials
        await this.inputUsername.waitForDisplayed({ timeout: 20000 });
        await this.inputUsername.setValue(username);

        await this.inputPassword.waitForDisplayed({ timeout: 10000 });
        await this.inputPassword.setValue(password);

        // 3. Submit
        await this.btnSubmit.waitForExist({ timeout: 20000 });
        await this.jsClick(await this.btnSubmit);
    }
}

export default new LoginPage();
