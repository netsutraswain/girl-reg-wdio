import { $, $$, browser } from '@wdio/globals';
import Page from './page.js';
import { MemberData } from '../fixtures/testData.js';

/**
 * Page Object — Payment / Cart Review Page
 */
class PaymentPage extends Page {

    // ── Locators ───────────────────────────────────────────────────────────────

    private get chkTerms() {
        return $('#isTermsAndConditions');
    }

    private get fldCardFirstName() {
        return $('aria/Cardholder first name');
    }

    private get fldCardLastName() {
        return $('aria/Cardholder last name');
    }

    public get btnSubmitPayment() {
        return $('button[type="submit"][form="paymentform"]');
    }

    // ── Accept Terms + Cardholder Name ─────────────────────────────────────────

    public async acceptTermsAndFillCardholderName(
        firstName: string,
        lastName: string
    ): Promise<void> {

        await this.waitForAngular();


        await this.chkTerms.waitForExist({
            timeout: 30000,
            timeoutMsg: 'Terms checkbox not found'
        });


        await this.chkTerms.scrollIntoView({
            block: 'center'
        });


        await this.jsClick(await this.chkTerms);



        const addPaymentBtn = await $(
            '//button[contains(translate(normalize-space(.),"abcdefghijklmnopqrstuvwxyz","ABCDEFGHIJKLMNOPQRSTUVWXYZ"),"ADD PAYMENT")]'
        );


        await addPaymentBtn.waitForExist({
            timeout: 15000
        });


        await addPaymentBtn.scrollIntoView({
            block: 'center'
        });


        await this.jsClick(await addPaymentBtn);



        await this.fldCardFirstName.waitForExist({
            timeout: 10000
        });


        await this.fldCardFirstName.setValue(firstName);


        await this.fldCardLastName.setValue(lastName);

    }

    // ── Fill CardConnect Payment ───────────────────────────────────────────────

    public async fillCardAndSubmit(
        card: MemberData['payment']
    ): Promise<void> {

        console.log(`[${new Date().toLocaleString()}] Starting payment details entry.`);

        try {
            await browser.switchFrame(null);
            const outerFrame = await $('iframe[name="tokenFrame"]');

            if (await outerFrame.isExisting()) {
                await outerFrame.waitForExist({ timeout: 20000 });
                await browser.switchFrame(outerFrame);
                const innerFrame = await $('iframe[name="tokenframe"]');
                await innerFrame.waitForExist({ timeout: 20000 });
                await browser.switchFrame(innerFrame);
            } else {
                const singleFrame = await $('iframe[name="tokenframe"]');
                await singleFrame.waitForExist({ timeout: 20000 });
                await browser.switchFrame(singleFrame);
            }

            // ── Card Number ──
            const cardNumber = await $('#ccnumfield');
            await cardNumber.waitForDisplayed({ timeout: 20000 });
            await cardNumber.click();
            await cardNumber.setValue(card.cardNumber);
            await browser.keys(['Tab']); // Field validation trigger karne ke liye

            // ── Expiry Month ──
            const month = await $('#ccexpirymonth');
            await month.selectByAttribute('value', card.expiryMonth);
            await browser.keys(['Tab']);

            // ── Expiry Year ──
            const year = await $('#ccexpiryyear');
            await year.selectByAttribute('value', card.expiryYear);
            await browser.keys(['Tab']);

            // ── CVV ──
            const cvv = await $('#cccvvfield');
            await cvv.setValue(card.cvv);
            await browser.keys(['Tab']); // Iframe ke andar se properly focus out hone ke liye

            console.log('All card fields filled and validated.');

        } catch (error) {
            console.error('Error inside iframe:', error);
            await browser.saveScreenshot('./error-payment-frame.png');
            throw error;
        } finally {
            await browser.switchFrame(null);
        }

        // ── Submit Payment Block ──
        await this.btnSubmitPayment.waitForExist({ timeout: 30000 });

        await browser.waitUntil(async () => {
            return await this.btnSubmitPayment.isEnabled();
        }, {
            timeout: 20000,
            timeoutMsg: "Submit button is still disabled."
        });

        await this.btnSubmitPayment.scrollIntoView({ block: 'center' });

        console.log("Attempting to click Submit via JavaScript Execute...");
        await browser.execute((el) => {
            (el as HTMLElement).click();
        }, await this.btnSubmitPayment);

        console.log("Submit click triggered.");

        // ── Next Page Verification ──
        try {
            await browser.waitUntil(async () => {
                const currentUrl = await browser.getUrl();
                // 'payment' ya 'review' ke alawa success page ka keyword yahan daalein
                return !currentUrl.includes('payment');
            }, {
                timeout: 25000,
                timeoutMsg: "URL did not change. Still stuck on payment page."
            });
            console.log("Successfully navigated to next page: ", await browser.getUrl());
        } catch (urlError) {
            await browser.saveScreenshot('./stuck-on-payment.png');
            throw new Error(`Clicked submit, but page didn't redirect. Screenshot saved.`);
        }

        //  Hard pause for 5 seconds
        console.log("Pausing for 5 seconds to let the last page display...");
        await browser.pause(5000);

        console.log("Resuming test sequence.");
    }
}

export default new PaymentPage();