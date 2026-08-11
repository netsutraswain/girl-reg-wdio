import { browser, expect } from '@wdio/globals';
import LoginPage from '../pageobjects/login.page.js';
import DashboardPage from '../pageobjects/dashboard.page.js';
import HouseholdPage from '../pageobjects/household.page.js';
import TroopSearchPage from '../pageobjects/troopSearch.page.js';
import MemberInfoPage from '../pageobjects/memberInfo.page.js';
import PaymentPage from '../pageobjects/payment.page.js';
import { DEFAULT_MEMBER_DATA, uniqueSuffix } from '../fixtures/testData.js';

describe('Girl Scouts Household Registration Flow', () => {

    it('E2E: Girl Scouts Login Test Failed', async () => {

        // ── 1. Setup ─────────────────────────────────────────────────────────
        await browser.setWindowSize(1351, 800);
        await LoginPage.open('');
        await expect(browser).toHaveUrl('https://mygs-uat.girlscouts.org/');
        try {
            await LoginPage.login(
                'LTOct11adult00818@yopmail.com',
                '1Test123#'
            );

            await expect(browser).toHaveUrl(expect.stringContaining('dashboard'));

        } catch (error) {
            console.error('Login failed:', error);
            throw new Error(`Login Test Failed: ${error.message}`);
        }
        await browser.pause(5000); // Wait for post-login redirect to settle

        // ── 2. Unique data for this run ───────────────────────────────────────
        const suffix = uniqueSuffix();
        const firstName = `Girl${suffix}`;
        const lastName = `Last${suffix}`;
        const email = `testcg${suffix}@yopmail.com`;
        console.info(`[TEST] Run: ${suffix} | Girl: ${firstName} ${lastName} | Email: ${email}`);

        // ── 3. Navigate to registration form ──────────────────────────────────
        await DashboardPage.navigateToHousehold();
        await HouseholdPage.registerNewMember();
        await TroopSearchPage.searchAndSelectTroop();

        await browser.waitUntil(
            async () => (await browser.getUrl()).includes('register'),
            { timeout: 30_000, timeoutMsg: 'Did not navigate to /register after clicking Add Details.' }
        );

        // ── 4. Fill member form ───────────────────────────────────────────────
        await MemberInfoPage.fillMemberDetails(firstName, lastName, email, DEFAULT_MEMBER_DATA);
        await MemberInfoPage.submitAndReviewCart();

        // ── 5. Payment ────────────────────────────────────────────────────────
        await PaymentPage.acceptTermsAndFillCardholderName('Sudhansu', 'Swain');
        await PaymentPage.fillCardAndSubmit(DEFAULT_MEMBER_DATA.payment);
    });

    it('E2E: Girl Scouts Household Registration with Payment Success', async () => {

        // ── 1. Setup ─────────────────────────────────────────────────────────
        await browser.setWindowSize(1351, 800);
        await LoginPage.open('');
        await expect(browser).toHaveUrl('https://mygs-uat.girlscouts.org/');
        await LoginPage.login('LTOct11adult00818@yopmail.com', 'Test123#');
        await browser.pause(5000); // Wait for post-login redirect to settle

        // ── 2. Unique data for this run ───────────────────────────────────────
        const suffix = uniqueSuffix();
        const firstName = `Girl${suffix}`;
        const lastName = `Last${suffix}`;
        const email = `testcg${suffix}@yopmail.com`;
        console.info(`[TEST] Run: ${suffix} | Girl: ${firstName} ${lastName} | Email: ${email}`);

        // ── 3. Navigate to registration form ──────────────────────────────────
        await DashboardPage.navigateToHousehold();
        await HouseholdPage.registerNewMember();
        await TroopSearchPage.searchAndSelectTroop();

        await browser.waitUntil(
            async () => (await browser.getUrl()).includes('register'),
            { timeout: 30_000, timeoutMsg: 'Did not navigate to /register after clicking Add Details.' }
        );

        // ── 4. Fill member form ───────────────────────────────────────────────
        await MemberInfoPage.fillMemberDetails(firstName, lastName, email, DEFAULT_MEMBER_DATA);
        await MemberInfoPage.submitAndReviewCart();

        // ── 5. Payment ────────────────────────────────────────────────────────
        await PaymentPage.acceptTermsAndFillCardholderName('Sudhansu', 'Swain');
        await PaymentPage.fillCardAndSubmit(DEFAULT_MEMBER_DATA.payment);
    });



    // it('E2E: Girl Scouts Login Test Failed', async () => {

    //     // ── 1. Setup ─────────────────────────────────────────────────────────
    //     await browser.setWindowSize(1351, 800);
    //     await LoginPage.open('');

    //     await expect(browser).toHaveUrl('https://mygs-uat.girlscouts.org/');

    //     // Wrong password
    //     await LoginPage.login(
    //         'LTOct11adult00818@yopmail.com',
    //         '1Test123#'
    //     );

    //     // Give application time to respond
    //     await browser.pause(3000);

    //     // Assertion - this will FAIL if login is unsuccessful
    //     const currentUrl = await browser.getUrl();

    //     expect(currentUrl).toContain('/dashboard');

    // });

});