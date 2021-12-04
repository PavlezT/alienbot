// download chrome from here http://chromedriver.storage.googleapis.com/index.html

const {Builder, By, Key, until} = require('selenium-webdriver');
const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const cookies = require('./cookies/1.json');

const WAIT_TIMEOUT = 30 * 1000;

async function main() { 
    let driver = new webdriver.Builder()
        .forBrowser('chrome')
        .usingServer('http://localhost:9515')
        .build();

    try {
        await driver.get('https://all-access.wax.io/cloud-wallet/login');

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
    await driver.wait(until.urlContains('play.alienworlds.io/inventory'), WAIT_TIMEOUT);
    await driver.wait(until.elementsLocated(mineButtonLocator), WAIT_TIMEOUT);
    
    const mineButton = await findButton(driver, mineButtonLocator.linkText);
    mineButton.click();

    const claimButton = await findButton(driver, 'Claim Mine');
    claimButton.click();

    try {
        await switchToApproveWindow(driver, async () => clickApproveTransactionButton(driver));

        await driver.wait(until.titleIs('Alien Worlds'), WAIT_TIMEOUT);
    } catch(error) {
        console.log('Error in switch window:', error);
    }

    return startMining(driver);
}

async function switchToApproveWindow(driver, cb) {
    const originalWindow = await driver.getWindowHandle();
    await driver.wait(
        async () => (await driver.getAllWindowHandles()).length === 2,
        WAIT_TIMEOUT,
    );

    const windows = await driver.getAllWindowHandles();
    windows.forEach(async handle => {
        if (handle !== originalWindow) {
            await driver.switchTo().window(handle);
        }
    });

    await driver.wait(until.urlContains('all-access.wax.io/cloud-wallet/signing'), WAIT_TIMEOUT);

    await cb();

    await driver.switchTo().window(originalWindow);
}

async function clickApproveTransactionButton(driver) {
    const approveButtonLocator = {tagName: 'div', className: 'button-text', linkText: 'Approve'};
    await driver.wait(until.elementsLocated(approveButtonLocator), WAIT_TIMEOUT);
    await new Promise((res) => setTimeout(res, 5*1000));
    const buttons = await driver.findElements(approveButtonLocator);
    
    for(const button of buttons) {
        const text = await button.getText();
        if (text === 'Approve') {
            try {
                button.click();
            } catch(error) {
                console.log("Error in button click 'Approve'")
            }
        }
    }
}

async function findButton(driver, buttonLocator) {
    const buttons = await driver.findElements({tagName: 'span', linkText: buttonLocator});

    let searchedButton;

    for(const button of buttons) {
        const text = await button.getText().catch(() => 'errored');
        if (text === buttonLocator) {
            searchedButton = button;
            break;
        }

        if (text === 'errored') {
            console.log('Error in findButton');
        }
    }

    if (!searchedButton) {
        await new Promise((res) => setTimeout(res, 5*1000));
        return findButton(driver, buttonLocator);
    }

    return searchedButton;
}

main();