import { browser, $$ } from '@wdio/globals';

/**
 * Base Page Object.
 * Contains ONLY infrastructure helpers shared across all pages.
 * No business logic, no test data.
 */
export default class Page {

    /** Navigate to a sub-path. Base URL is read from wdio.conf.ts `baseUrl`. */
    public async open(path: string): Promise<void> {
        const base = (browser.options.baseUrl ?? 'https://mygs-uat.girlscouts.org').replace(/\/$/, '');
        await browser.url(`${base}/${path}`);
    }

    /**
     * Waits for the Angular ngx-spinner overlay to disappear.
     * Treats absence of the element as "already gone" — never throws.
     */
    public async waitForAngular(timeout = 15_000): Promise<void> {
        try {
            const spinner = await $('.ngx-spinner-overlay');
            if (await spinner.isExisting()) {
                await spinner.waitForDisplayed({ reverse: true, timeout });
            }
        } catch {
            // Spinner gone before we could check — that is fine
        }
    }

    /**
     * Opens an ng-select component and clicks the first rendered option.
     * Queries options *within* the active dropdown panel, not globally.
     */
    public async selectFirstNgOption(dropdown: WebdriverIO.Element): Promise<void> {
        await dropdown.scrollIntoView({ block: 'center' });
        
        // Wait for the dropdown to be enabled (no 'ng-select-disabled' class)
        await browser.waitUntil(
            async () => {
                const clazz = await dropdown.getAttribute('class');
                return !(clazz || '').includes('ng-select-disabled');
            },
            { timeout: 15_000, timeoutMsg: 'Dropdown remained disabled' }
        );

        // Click the inner .ng-select-container where Angular binds (click)="open()"
        const container = await dropdown.$('.ng-select-container');
        const clickTarget = await container.isExisting() ? container : dropdown;
        await this.jsClick(clickTarget);

        // Wait for options to EXIST anywhere in the document.
        try {
            await browser.waitUntil(
                async () => (await $$('.ng-option:not(.ng-option-disabled)')).length > 0,
                { timeout: 8_000, interval: 150, timeoutMsg: 'ng-select options never appeared' }
            );
        } catch (e) {
            console.error('Dropdown HTML when options did not appear:', await dropdown.getHTML());
            console.error('Panel HTML:', await $('.ng-dropdown-panel').isExisting() ? await $('.ng-dropdown-panel').getHTML() : 'No panel found');
            throw e;
        }
        
        const options = await $$('.ng-option:not(.ng-option-disabled)');
        for (const opt of options) {
            if (await opt.isDisplayed()) {
                await browser.pause(500); // Crucial pause for Angular click handlers
                await this.jsClick(opt);
                await browser.pause(300); // Wait for dropdown to close and update state
                return;
            }
        }
        console.error('ERROR: No visible ng-option found to click!');
    }

    /**
     * Finds the ng-select whose preceding label contains `labelText` (case-insensitive)
     * and selects its first option.
     */
    public async selectFirstNgOptionByLabel(labelText: string): Promise<void> {
        const upper = labelText.toUpperCase();
        const dropdown = await $(
            `//label[contains(translate(normalize-space(.),'abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ'),'${upper}')]/following::ng-select[1]`
        );
        if (await dropdown.isExisting()) {
            await this.selectFirstNgOption(dropdown);
        }
    }

    /**
     * Dispatches a full mouse click sequence (mousedown → mouseup → click).
     * Required for Angular components like ng-select that listen on `mousedown`
     * to open their panels. A plain `el.click()` only fires `click` and is
     * insufficient for these components.
     */
    public async jsClick(element: WebdriverIO.Element): Promise<void> {
        await browser.execute((el) => {
            const htmlEl = el as HTMLElement;
            (['mousedown', 'mouseup', 'click'] as const).forEach(type => {
                htmlEl.dispatchEvent(new MouseEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                }));
            });
        }, element);
    }

    /**
     * Dismisses a cookie/consent banner by clicking the first "Accept" button found.
     * Silent no-op if no banner exists.
     */
    public async dismissCookieBanner(): Promise<void> {
        await browser.execute(() => {
            const btn = Array.from(document.querySelectorAll('button'))
                .find(b => b.textContent?.trim().toLowerCase() === 'accept');
            if (btn) btn.click();
        });
    }

    /**
     * Clicks a `<button>` whose visible text contains `text` (case-insensitive).
     * Pierces Shadow DOM. Throws clearly if the button is not found.
     */
    public async clickButtonWithText(text: string): Promise<void> {
        const lower = text.toLowerCase();
        const buttons = [
            ...await $$('>>>button'),
            ...await $$('>>>input[type="submit"]'),
            ...await $$('>>>input[type="button"]'),
        ];
        for (const btn of buttons) {
            const tagName = await btn.getTagName();
            const label = tagName === 'input' ? await btn.getValue() : await btn.getText();
            if (label && label.trim().toLowerCase().includes(lower)) {
                await btn.scrollIntoView({ block: 'center' });
                await btn.waitForClickable({ timeout: 15_000 });
                await this.jsClick(btn);
                return;
            }
        }
        throw new Error(`Button containing text "${text}" not found.`);
    }

    /** @deprecated Use waitForAngular() */
    public async waitForSpinnerToDisappear(): Promise<void> {
        return this.waitForAngular();
    }

    /** @deprecated Use jsClick() + explicit locator */
    public async clickByText(text: string): Promise<void> {
        await browser.execute((searchText: string) => {
            const el = Array.from(document.querySelectorAll('a, button, span, div'))
                .find(e => e.children.length < 5 && (e.textContent ?? '').includes(searchText));
            if (el) (el as HTMLElement).click();
            else throw new Error('clickByText: not found — ' + searchText);
        }, text);
    }
}
