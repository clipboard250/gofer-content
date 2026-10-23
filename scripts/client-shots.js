// Takes a fresh iPhone-sized screenshot of each client homepage.
// Run by .github/workflows/client-shots.yml once a week.
// Saves to images/clients/<slug>.jpg, which the Work cards on index.html use.

const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const CLIENTS = [
  { slug: 'omgitswicks', url: 'https://omgitswicks.com/' },
  { slug: 'jawscustomwood', url: 'https://jawscustomwood.com/' },
  { slug: 'livingrestorations', url: 'https://www.livingrestorations.com/' },
  { slug: 'livingspacesgardening', url: 'https://livingspacesgardening.com/' },
  { slug: 'misfittoys', url: 'https://misfittoys.art/' },
  { slug: 'hippocketstudios', url: 'https://hippocketstudios.com/' },
  { slug: 'janierichards', url: 'https://janierichards.com/' },
  { slug: 'motelfunk', url: 'https://janierichards.com/motel-funk.html' },
  { slug: 'joeydrums', url: 'https://joeydrums.com/' },
];

const OUT = path.join(__dirname, '..', 'images', 'clients');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    // Turns off fade-in animations so heroes aren't captured blank.
    reducedMotion: 'reduce',
  });

  let failed = 0;
  for (const c of CLIENTS) {
    const page = await context.newPage();
    try {
      await page.goto(c.url, { waitUntil: 'networkidle', timeout: 60000 });
      // Force any scroll-reveal elements visible, then let images settle.
      await page.addStyleTag({
        content: '.rv,.reveal,[data-reveal]{opacity:1!important;transform:none!important}',
      });
      await page.waitForTimeout(3000);
      await page.screenshot({
        path: path.join(OUT, `${c.slug}.jpg`),
        type: 'jpeg',
        quality: 80,
      });
      console.log(`ok   ${c.slug}`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${c.slug}: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
  // One bad site shouldn't block the others; old image stays in place.
  if (failed === CLIENTS.length) process.exit(1);
})();
