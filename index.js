// download chrome from here http://chromedriver.storage.googleapis.com/index.html

const {Builder, By, Key, until} = require('selenium-webdriver');
const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const cookies = require('./cookies/1.json');

const WAIT_TIMEOUT = 30 * 1000;

const browserOptions = (new chrome.Options())
// .headless()
.windowSize({width: 640, height: 480})
    // .addArguments('--headless') // note: without dashes
    // .addArguments('disable-gpu');

async function main() { 
    let driver = new webdriver.Builder()
        .forBrowser('chrome')
        .withCapabilities(webdriver.Capabilities.chrome()) 
        .setChromeOptions(browserOptions)
        .usingServer('http://localhost:9515')
        .build();

    try {
        await driver.get('https://all-access.wax.io/cloud-wallet/login')

        await Promise.all(cookies.map(async (cookie) => {
            cookie.sameSite = 'Strict';
            await driver.manage().addCookie(cookie);
        }));
        await driver.wait(until.titleIs('WAX Cloud Wallet'), WAIT_TIMEOUT);

        await driver.get('https://play.alienworlds.io/mining');
        const loginButton = driver.findElement({tagName: 'span', linkText: 'Start Now'});
        loginButton.click();

        await startMining(driver);
    } catch (error) {
        console.log('Error:', error);
    }

    await driver.quit();
}

async function startMining(driver) {
    const mineButtonLocator = {tagName: 'span', linkText: 'Mine'};
    log('Start mining: waint until alienworlds load');
    await driver.wait(until.urlContains('play.alienworlds.io/inventory'), WAIT_TIMEOUT);
    log('Start mining: wait until button appeare');
    await driver.wait(until.elementsLocated(mineButtonLocator), WAIT_TIMEOUT);
    log('Start mining: find mining button');
    const mineButton = await findButton(driver, mineButtonLocator.linkText);
    log('Start mining: mining button click', mineButton);
    mineButton.click();
    log('Start mining: find claim button');
    const claimButton = await findButton(driver, 'Claim Mine');
    log('Start mining: claim button click', claimButton);
    claimButton.click();

    try {
        await switchToApproveWindow(driver, async () => clickApproveTransactionButton(driver));
        log('Start mining: wait until Alien Worlds title appeare');
        // await driver.wait(until.titleIs('Alien Worlds'), WAIT_TIMEOUT);
        await new Promise((res) => setTimeout(res, 5*1000));
    } catch(error) {
        console.log('Error in switch window:', error);
    }

    return startMining(driver);
}

async function switchToApproveWindow(driver, cb) {
    log('switchToApproveWindow: get originl window handle');
    const originalWindow = await driver.getWindowHandle();
    log('switchToApproveWindow: getAllWindowHandles');
    await driver.wait(
        async () => (await driver.getAllWindowHandles()).length === 2,
        WAIT_TIMEOUT,
    );
    log('switchToApproveWindow: getAllWindowHandles');
    const windows = await driver.getAllWindowHandles();
    log('switchToApproveWindow: getAllWindowHandles windows', {windows: windows.length});
    windows.forEach(async handle => {
        if (handle !== originalWindow) {
            await driver.switchTo().window(handle);
        }
    });
    delete windows;
    log('switchToApproveWindow: wait until all-access.wax.io/cloud-wallet/signing');
    await driver.wait(until.urlContains('all-access.wax.io/cloud-wallet/signing'), WAIT_TIMEOUT);

    await cb();
    log('switchToApproveWindow: switchTo original window');
    await driver.switchTo().window(originalWindow);
}

async function clickApproveTransactionButton(driver) {
    const approveButtonLocator = {tagName: 'div', className: 'button-text', linkText: 'Approve'};
    log('clickApproveTransactionButton: wait until approve button located');
    await driver.wait(until.elementsLocated(approveButtonLocator), WAIT_TIMEOUT);
    await new Promise((res) => setTimeout(res, 5*1000));
    log('clickApproveTransactionButton: findElements');
    const buttons = await driver.findElements(approveButtonLocator);
    log('clickApproveTransactionButton: buttons', {buttons: buttons.length});
    for(const button of buttons) {
        log('clickApproveTransactionButton: get button text');
        const text = await button.getText().catch(() => 'errored');
        log('clickApproveTransactionButton: button text:');
        if (text === 'Approve') {
            try {
                log('clickApproveTransactionButton: click approve button',text);
                button.click();
            } catch(error) {
                console.log("Error in button click 'Approve'")
            }
        }

        if (text === 'errored') {
            console.log('Error in clickApproveTransactionButton');
        }
    }
}

async function findButton(driver, buttonLocator) {
    log('findButton: find buttons', buttonLocator);
    const buttons = await driver.findElements({tagName: 'span', linkText: buttonLocator});
    log('findButton: found buttons:', buttons.length);
    let searchedButton;

    for(const button of buttons) {
        log('findButton: get button text');
        const text = await button.getText().catch(() => 'errored');
        log('findButton: button text');
        if (text === buttonLocator) {
            searchedButton = button;
            break;
        }

        if (text === 'errored') {
            console.log('Error in findButton: getText catch');
        }
    }

    if (!searchedButton) {
        await new Promise((res) => setTimeout(res, 5*1000));
        return findButton(driver, buttonLocator);
    }

    return searchedButton;
}

main();

function log(text, ...args) {
    // console.log(text, ...args);
}

process.on('unhandledRejection', (reason, promise) => {
    const args = (reason && reason.toString && reason.toString().includes('StaleElementReferenceError')) ? [reason.toString().substring(0, 98)] : [reason, promise];
    console.log(`Handle Error: `, ...args);
});

