export const config: WebdriverIO.Config = {
    runner: 'local',

    specs: [
        './test/specs/**/*.ts'
    ],

    maxInstances: 1,

   capabilities: [{
    browserName: 'chrome',
 
    'goog:chromeOptions': {
        args: [
            '--headless=new',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-infobars',
            '--window-size=1351,900'
        ]
    }
}],

    // Show only errors
    logLevel: 'error',

    baseUrl: 'https://mygs-uat.girlscouts.org/',

    waitforTimeout: 30000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,

    framework: 'mocha',

    reporters: [
        'spec', // Console output ke liye
        ['allure', {
            outputDir: 'allure-results',
            disableWebdriverStepsReporting: true,
            disableWebdriverScreenshotsReporting: false,
        }]
    ],

    // Test fail hone par automatic screenshot Allure me daalne ke liye hook
    afterTest: async function (test, context, { error, duration, passed, retries }) {
        if (!passed) {
            await browser.takeScreenshot();
        }
    },

    mochaOpts: {
        ui: 'bdd',
        timeout: 600000
    }
};