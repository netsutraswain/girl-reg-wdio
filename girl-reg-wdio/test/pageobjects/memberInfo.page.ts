import { $, $$ } from '@wdio/globals';
import Page from './page.js';
import { MemberData, uniqueSuffix } from '../fixtures/testData.js';

/**
 * Page Object — Member Information Form (/register)
 *
 * Encapsulates all locators and interactions for the Girl member
 * registration form. Test data is accepted as parameters — never hardcoded here.
 */
class MemberInfoPage extends Page {

    // ── Locator helpers ───────────────────────────────────────────────────────

    /** Returns the first DISPLAYED input matching the placeholder */
    private async displayedInput(placeholder: string): Promise<WebdriverIO.Element> {
        const inputs = await $$(`input[placeholder="${placeholder}"]`);
        for (const el of inputs) {
            if (await el.isDisplayed()) return el;
        }
        return inputs[0]; // fallback to first
    }

    private async getDisplayedBdayInput(index: number = 0) {
        return browser.waitUntil(async () => {
            const els = await $$('input.bday');
            const displayed = [];
            for (const el of els) {
                if (await el.isDisplayed()) displayed.push(el);
            }
            if (displayed.length > index) return displayed[index];
            return false;
        }, { timeout: 10_000, timeoutMsg: `Could not find displayed input.bday at index ${index}` }) as unknown as WebdriverIO.Element;
    }

    // Girl fields
    private get fldGirlFirstName() { return this.displayedInput('Girl first name'); }
    private get fldGirlLastName() { return this.displayedInput('Girl last name'); }
    private get fldGirlDOB() { return this.getDisplayedBdayInput(0); }

    // School Attending — custom Angular typeahead (search input)
    private get fldSchoolAttending() { return $('input[placeholder="School Attending"]'); }
    private get schoolDropdownList() { return $('ul.list-group[id*="schoolListGroup"]'); }

    // Caregiver fields
    private get fldCgFirstName() { return this.displayedInput('Caregiver first name'); }
    private get fldCgLastName() { return this.displayedInput('Caregiver last name'); }
    private get fldCgDOB() { return this.getDisplayedBdayInput(1); }
    private get fldPhone() { return $('input[placeholder*="phone number"]'); }
    private get fldEmail() { return $('input[type="email"][placeholder*="email"], input[placeholder="Caregiver email address"], input[placeholder*="email"]'); }

    // Address
    private get fldAddressLine1() { return this.displayedInput('Street address line 1'); }
    private get fldAddressLine2() { return this.displayedInput('Street address line 2'); }
    private get fldZip() { return this.displayedInput('ZIP Code'); }
    private get fldCity() { return this.displayedInput('City'); }

    // Buttons
    private get btnSaveDetails() {
        return $('//button[contains(translate(normalize-space(.),"abcdefghijklmnopqrstuvwxyz","ABCDEFGHIJKLMNOPQRSTUVWXYZ"),"SAVE DETAILS")]');
    }

    // ── Section helpers ────────────────────────────────────────────────────────

    /**
     * Dynamically finds an ng-select element by scanning its parent container's text.
     * This perfectly overcomes missing aria-labels and highly nested DOM structures.
     */
    private async findNgSelect(exactPlaceholder: string) {
        const selects = await $$('ng-select');
        for (const select of selects) {
            if (!await select.isDisplayed()) continue; // Ignore hidden dropdowns in collapsed accordions!
            const innerInput = await select.$('input');
            if (await innerInput.isExisting()) {
                const placeholder = await innerInput.getAttribute('placeholder') || '';
                if (placeholder.toLowerCase() === exactPlaceholder.toLowerCase()) {
                    return select;
                }
            }
        }
        // fallback to first visible
        for (const select of selects) {
            if (await select.isDisplayed()) return select;
        }
        return $('ng-select');
    }

    /** Fills the girl's core identity fields */
    private async fillGirlIdentity(
        firstName: string,
        lastName: string,
        dob: string,
        grade: string,
    ): Promise<void> {
        const fnField = await this.fldGirlFirstName;
        await fnField.scrollIntoView({ block: 'center' });
        await fnField.setValue(firstName);

        const lnField = await this.fldGirlLastName;
        await lnField.setValue(lastName);

        await this.selectFirstNgOptionByLabel('Gender');
        await this.waitForAngular(); // Gender selection may trigger Angular state update
        await this.selectGrade(grade);
        // Retry loop for DOB: The field mask or Angular event loop sometimes drops the input,
        // leaving the dependent School Attending field disabled.
        const dobField = await this.fldGirlDOB;
        await dobField.scrollIntoView({ block: 'center' });

        // Wait until the field is truly interactable (spinners/overlays are gone)
        await browser.waitUntil(async () => {
            try {
                await dobField.click();
                return true;
            } catch (e) {
                return false;
            }
        }, { timeout: 15_000, interval: 1000, timeoutMsg: 'DOB field remained obscured or non-interactable' });

        for (let attempt = 1; attempt <= 3; attempt++) {
            await dobField.click(); // Ensure focus
            await browser.pause(200);
            await browser.keys(['Backspace', 'Backspace', 'Backspace', 'Backspace', 'Backspace']);
            await dobField.setValue(dob);
            await browser.pause(200);
            await browser.keys(['Tab']);

            // Explicitly click outside to force blur
            const schoolLabel = await $('label*=School Attending');
            if (await schoolLabel.isExisting()) {
                try {
                    await this.jsClick(schoolLabel);
                } catch (e) {
                    // Ignore interactability errors, we just want to blur
                }
            }
            await this.waitForAngular();

            // Check if School Attending field unlocked
            const schoolFld = await this.fldSchoolAttending;
            if (await schoolFld.isExisting() && await schoolFld.isEnabled()) {
                break;
            }
            if (attempt === 3) {
                console.warn('School Attending field never unlocked after 3 DOB attempts. Waiting for downstream interactions to unlock it.');
            }
        }
    }

    /**
     * Selects a grade and re-selects Participation Type + Troop afterward.
     * Grade changes reset the downstream dropdowns.
     */

    private async selectGrade(grade: string): Promise<void> {
        console.log('--- FORM HTML DUMP ---');
        try {
            const formHtml = await $('form').getHTML();
            console.log(formHtml);
        } catch (e) { }
        console.log('--- END FORM HTML DUMP ---');

        const gradeDropdown = await $('//label[normalize-space(.)="Grade"]/following::ng-select[1]');
        if (!await gradeDropdown.isExisting()) return;

        await gradeDropdown.scrollIntoView({ block: 'center' });
        const gradeContainer = await gradeDropdown.$('.ng-select-container');
        await this.jsClick(await gradeContainer.isExisting() ? gradeContainer : gradeDropdown);

        // Same pattern as selectFirstNgOption — wait for options, not the panel
        try {
            await browser.waitUntil(
                async () => (await $$('.ng-option:not(.ng-option-disabled)')).length > 0,
                { timeout: 8_000, interval: 150, timeoutMsg: 'Grade options never appeared' }
            );
        } catch (e) {
            console.error('Grade Dropdown HTML:', await gradeDropdown.getHTML());
            console.error('Panel HTML:', await $('.ng-dropdown-panel').isExisting() ? await $('.ng-dropdown-panel').getHTML() : 'No panel found');
            throw e;
        }
        const gradeOptions = await $$('.ng-option:not(.ng-option-disabled)');
        // Find the grade matching our target value, fallback to first
        let targetOpt = gradeOptions[0];
        for (const opt of gradeOptions) {
            const text = await opt.getText();
            if (text.trim() === grade || text.includes(grade)) {
                targetOpt = opt;
                break;
            }
        }
        await this.jsClick(targetOpt);
        await browser.pause(400);

        // Participation resets after grade change — re-select "Troop member"
        const participation = await $('//label[normalize-space(.)="Participation type"]/following::ng-select[1]');
        if (await participation.isExisting()) {
            await participation.scrollIntoView({ block: 'center' });
            const partContainer = await participation.$('.ng-select-container');
            await this.jsClick(await partContainer.isExisting() ? partContainer : participation);

            try {
                await browser.waitUntil(
                    async () => (await $$('.ng-option:not(.ng-option-disabled)')).length > 0,
                    { timeout: 8_000, interval: 150, timeoutMsg: 'Participation options never appeared' }
                );
            } catch (e) {
                console.error('Participation Dropdown HTML:', await participation.getHTML());
                console.error('Panel HTML:', await $('.ng-dropdown-panel').isExisting() ? await $('.ng-dropdown-panel').getHTML() : 'No panel found');
                throw e;
            }
            const partOptions = await $$('.ng-option:not(.ng-option-disabled)');
            // Prefer "Troop" option if present
            let chosen = partOptions[0];
            for (const opt of partOptions) {
                const txt = (await opt.getText()).toLowerCase();
                if (txt.includes('troop')) { chosen = opt; break; }
            }
            await this.jsClick(chosen);
            await this.waitForAngular(10_000);
        }

        // Re-select the first available troop only if not already pre-filled and locked
        const troopDd = await $('//label[contains(translate(normalize-space(.),"abcdefghijklmnopqrstuvwxyz","ABCDEFGHIJKLMNOPQRSTUVWXYZ"),"TROOP")]/following::ng-select[1]');
        if (await troopDd.isExisting()) {
            // Wait briefly to see if it becomes enabled (handles temporary loading state)
            try {
                await browser.waitUntil(
                    async () => !(await troopDd.getAttribute('class') || '').includes('ng-select-disabled'),
                    { timeout: 3000 }
                );
                // If we get here, it's enabled. We must select an option.
                await this.selectFirstNgOption(troopDd);
            } catch (e) {
                // If it timed out, it means it is permanently disabled (locked with pre-filled value).
                console.log('Troop dropdown is disabled/locked. Skipping selection.');
            }
        }
    }

    /**
     * Fills the School Attending typeahead.
     * Types 'home' to surface the static options, then clicks "Home Schooled".
     * The field's initial disabled state is intentional — DOB must be filled first.
     */
    private async selectSchoolAttending(): Promise<void> {
        const field = await this.fldSchoolAttending;
        if (!await field.isExisting()) return;

        await field.scrollIntoView({ block: 'center' });

        try {
            // Wait for Angular to enable the field
            await browser.waitUntil(async () => await field.isEnabled(), {
                timeout: 10_000,
                timeoutMsg: 'School Attending field never became enabled'
            });

            await field.click();
            await browser.pause(200);
            await field.setValue('home');

            // Wait for the dropdown list to appear
            const anchor = await $('//ul[contains(@class,"list-group")]//a[contains(normalize-space(.),"Home Schooled")]');
            await anchor.waitForExist({ timeout: 5_000 });
            await anchor.scrollIntoView({ block: 'center' });

            // Use robust jsClick which fires mousedown, mouseup, click
            await this.jsClick(anchor);
            await browser.pause(500); // Give Angular time to update the input field model

        } catch (e) {
            console.log('School Attending field remained disabled or failed to select. Skipping as it may not be required.');
        }
    }

    /** Fills demographic dropdowns: State, Ethnicity, Race */
    private async fillDemographics(): Promise<void> {
        await this.selectFirstNgOptionByLabel('State');
        await this.selectFirstNgOptionByLabel('Ethnicity');

        const raceDd = await $('ng-select[aria-label*="Race"]');
        if (await raceDd.isExisting()) {
            await this.selectFirstNgOption(raceDd);
            // Race is multi-select — close the panel
            await browser.keys(['Escape']);
        }
    }

    /** Fills caregiver identity, gender, phone type, and contact details */
    private async fillCaregiverDetails(data: MemberData['caregiver'], email: string): Promise<void> {
        const cgFirstName = await this.fldCgFirstName;
        await cgFirstName.setValue(data.firstName);
        const cgLastName = await this.fldCgLastName;
        await cgLastName.setValue(data.lastName);

        // Caregiver Gender — second "Select Gender" ng-select on the page
        const allGenderDds = await $$('ng-select[aria-label="Select Gender"]');
        const cgGenderDd = allGenderDds.length > 1 ? allGenderDds[1] : allGenderDds[0];
        if (cgGenderDd && await cgGenderDd.isExisting()) {
            await this.selectFirstNgOption(cgGenderDd);
        }

        // Phone Type — there may be two "Phone type" labels (Girl and Caregiver). Get the last/Caregiver one.
        const allPhoneTypeDds = await $$('//label[contains(translate(normalize-space(.),"abcdefghijklmnopqrstuvwxyz","ABCDEFGHIJKLMNOPQRSTUVWXYZ"),"PHONE TYPE")]/following::ng-select[1]');
        const phoneTypeDd = allPhoneTypeDds.length > 1 ? allPhoneTypeDds[allPhoneTypeDds.length - 1] : allPhoneTypeDds[0];
        if (phoneTypeDd && await phoneTypeDd.isExisting()) {
            await this.selectFirstNgOption(phoneTypeDd);
        }

        await this.fldPhone.setValue(data.phone);
        await this.fldEmail.setValue(email);

        // Relationship
        const relDd = await $('//label[contains(translate(normalize-space(.),"abcdefghijklmnopqrstuvwxyz","ABCDEFGHIJKLMNOPQRSTUVWXYZ"),"RELATIONSHIP")]/following::ng-select[1]');
        if (await relDd.isExisting()) {
            await this.selectFirstNgOption(relDd);
        }

        const cgDob = await this.fldCgDOB;
        await cgDob.setValue(data.dob);
        await browser.keys(['Escape']); // close any datepicker
    }

    /** Fills address and ticks "same address" for caregiver */
    private async fillAddress(data: MemberData['caregiver']['address']): Promise<void> {

        const suffixaddress = uniqueSuffix();

        // Address Line 1
        const addrLine1 = await this.fldAddressLine1;
        const addressLine1 = `${data.line1} ${suffixaddress}`;
        await addrLine1.setValue(addressLine1);

        // Address Line 2
        const addrLine2 = await this.fldAddressLine2;
        const addressLine2 = `${data.line2} ${suffixaddress}`;
        await addrLine2.setValue(addressLine2);

        const zipField = await this.fldZip;
        await zipField.setValue(data.zip);

        // City might be disabled during Zip code validation or permanently read-only
        try {
            const cityField = await this.fldCity;
            await browser.waitUntil(async () => await cityField.isEnabled(), { timeout: 3000 });
            await cityField.setValue(data.city);
        } catch (e) {
            console.log('City field remained disabled after zip entry (likely auto-filled)');
        }

        const sameAddrChk = await $('input[type="checkbox"][id^="sameAddressCG"]');
        if (await sameAddrChk.isExisting()) {
            await sameAddrChk.scrollIntoView({ block: 'center' });
            await this.jsClick(sameAddrChk);
        }
    }

    /** Picks the first membership radio and Credit Card payment method */
    private async selectMembershipAndPaymentType(): Promise<void> {
        const memberships = await $$('input[type="radio"][name="membershipCode"]');
        if (memberships.length > 0) {
            await memberships[0].scrollIntoView({ block: 'center' });
            await this.jsClick(memberships[0]);
        }

        const ccRadio = await $('input[type="radio"][id^="cc-radio"]');
        if (await ccRadio.isExisting()) {
            await this.jsClick(ccRadio);
        }
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Fills the complete member registration form.
     *
     * @param firstName  Girl's first name (unique per run)
     * @param lastName   Girl's last name  (unique per run)
     * @param email      Caregiver email   (unique per run, e.g. testcgXXXXXX@yopmail.com)
     * @param data       Static member fixture data (dob, address, card, etc.)
     */
    public async fillMemberDetails(
        firstName: string,
        lastName: string,
        email: string,
        data: MemberData,
    ): Promise<void> {
        // Wait for page to fully load before interacting
        await this.waitForAngular();
        const firstField = await this.fldGirlFirstName;
        await firstField.waitForDisplayed({ timeout: 15_000 });
        await this.fillGirlIdentity(firstName, lastName, data.girl.dob, data.girl.grade);
        await this.fillDemographics();
        await this.fillCaregiverDetails(data.caregiver, email);
        await this.fillAddress(data.caregiver.address);
        await this.selectSchoolAttending();
        await this.selectMembershipAndPaymentType();
        await this.waitForAngular();
    }

    /**
     * Clicks "Save Details" then waits for and clicks "Review Cart".
     * Throws a clear error if Review Cart never becomes clickable
     * (indicates form has outstanding validation errors).
     */
    // public async submitAndReviewCart(): Promise<void> {
    //     const saveBtn = await this.btnSaveDetails;
    //     await saveBtn.scrollIntoView({ block: 'center' });
    //     await saveBtn.click();
    //     await this.waitForAngular();

    //     // "REVIEW CART" may be rendered as a button or an anchor tag.
    //     // We explicitly exclude div to prevent accidentally matching the "Review cart" text in the progress bar.
    //     const reviewBtn = await $(
    //         '//*[(self::button or self::a) and contains(translate(normalize-space(.),"abcdefghijklmnopqrstuvwxyz","ABCDEFGHIJKLMNOPQRSTUVWXYZ"),"REVIEW CART")]'
    //     );
    //     try {
    //         await reviewBtn.waitForClickable({
    //             timeout: 20_000,
    //             timeoutMsg: 'REVIEW CART is still disabled after 20s — check for form validation errors.',
    //         });
    //     } catch (e) {
    //         await browser.saveScreenshot(require('path').join(process.cwd(), 'review_cart_error.png'));
    //         throw e;
    //     }
    //     await reviewBtn.scrollIntoView({ block: 'center' });
    //     await reviewBtn.click();
    //     await this.waitForAngular();
    // }
    public async submitAndReviewCart(): Promise<void> {

        const saveBtn = await this.btnSaveDetails;

        await saveBtn.scrollIntoView({ block: "center" });
        await saveBtn.click();

        await this.waitForAngular();
        await browser.pause(5000);

        console.log("\n========== FORM ERRORS ==========");

        const errors = await $$(
            'mat-error,.mat-mdc-form-field-error,.invalid-feedback,.error,.text-danger'
        );

        for (const err of errors) {
            const text = (await err.getText()).trim();
            if (text) {
                console.log(text);
            }
        }

        console.log("=================================\n");

        console.log("\n========== INVALID FIELDS ==========");

        const invalidFields = await $$(
            'input.ng-invalid,select.ng-invalid,textarea.ng-invalid,mat-select.ng-invalid'
        );

        console.log("Invalid Count:", invalidFields.length);

        for (const field of invalidFields) {
            console.log({
                id: await field.getAttribute("id"),
                name: await field.getAttribute("name"),
                placeholder: await field.getAttribute("placeholder"),
                formControl: await field.getAttribute("formcontrolname"),
                class: await field.getAttribute("class")
            });
        }

        console.log("====================================\n");

        const reviewBtn = await $('#general-member');

        await reviewBtn.waitForExist({ timeout: 10000 });
        await reviewBtn.scrollIntoView({ block: 'center' });

        await browser.saveScreenshot("./before_review_cart.png");

        // Wait until button is enabled
        await browser.waitUntil(async () => {
            return await reviewBtn.isEnabled();
        }, {
            timeout: 10000,
            interval: 500,
            timeoutMsg: 'Review Cart button never became enabled'
        });

        // Try normal click
        try {
            await reviewBtn.click();
        } catch (e) {
            console.log("Normal click failed. Trying JS click...");

            await browser.execute((el: HTMLButtonElement) => {
                el.click();
            }, await reviewBtn);
        }

        await this.waitForAngular();
    }
}

export default new MemberInfoPage();
