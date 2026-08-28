const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto("http://localhost:5173/files");
  await page.click("text=QA2");
  await page.waitForTimeout(200);
  await page.click("text=test3.pdf");
  await page.waitForSelector(".textLayer", { timeout: 10000 });
  await page.waitForTimeout(1500);

  // Scrollear el contenedor interno del visor hacia abajo para ver página 2 y 3
  await page.evaluate(() => {
    const scrollers = document.querySelectorAll(".overflow-auto");
    scrollers.forEach((el) => {
      el.scrollTop = el.scrollHeight; // ir al fondo
    });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(process.cwd(), "qa3-scrolled-bottom.png") });

  await browser.close();
})();
