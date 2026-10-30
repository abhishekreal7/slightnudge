// Navigation adapter only. Existing selection assertions, selectors and limits
// are deliberately left intact, including failures inherited from the baseline.
const { chromium } = require('playwright');
const launch = chromium.launch.bind(chromium);
chromium.launch = async (...args) => {
  const browser = await launch(...args), newPage = browser.newPage.bind(browser);
  browser.newPage = async (...options) => {
    const page = await newPage(...options), goto = page.goto.bind(page);
    page.goto = (input, navigation) => {
      const url = new URL(input);
      if (/^\/fixtures\/\d+$/.test(url.pathname)) {
        const fixture = url.pathname.split('/').at(-1);
        url.pathname = '/editor'; url.searchParams.set('view', process.env.UNIFIED_TEST_VIEW);
        url.searchParams.set('fixture', fixture);
        console.log('SELECTION NAVIGATION ' + url.pathname + url.search);
      }
      return goto(url.toString(), navigation);
    };
    return page;
  };
  return browser;
};
