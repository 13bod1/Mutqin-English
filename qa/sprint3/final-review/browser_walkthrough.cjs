const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Samer/AppData/Local/hermes/profiles/jira/workspace/samer_sherry_delivery/merge_main_repository/node_modules/@playwright/test');

const [base, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = {
    executionTimestamp: new Date().toISOString(),
    boundary: 'AGENT INTERNAL UAT WALKTHROUGH ONLY — Not human PO sign-off. Built Angular SPA from dist/mutqin-english/browser served on local HTTP server. No live DRM license server, no physical mobile hardware, no production DDL.',
    environment: {
      baseUrl: base,
      engine: 'Chromium (Playwright)',
      viewport: { width: 1280, height: 900 }
    },
    executedSteps: [],
    screenshots: [],
    houseRulesVerification: {},
    sampleQuestionsVerification: {},
    offlineFallbackVerification: {}
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      serviceWorkers: 'block'
    });
    await context.addInitScript(() => localStorage.setItem('mutqin_lang', 'en'));

    // Block unexpected external egress
    await context.route('**/*', route => {
      const u = new URL(route.request().url());
      if (u.origin === new URL(base).origin) {
        route.continue();
      } else {
        route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'External blocked in UAT' }) });
      }
    });

    const page = await context.newPage();

    // Step 1: Landing Page
    await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.locator('app-header app-logo').waitFor();
    assert.match(await page.title(), /Mr\. Adel Mostafa/i);
    const landingFile = 'landing.png';
    await page.screenshot({ path: path.join(outDir, landingFile), fullPage: true });
    report.screenshots.push({ file: landingFile, route: '/', title: await page.title() });
    report.executedSteps.push({ step: '1. Landing Page Navigation', status: 'PASS', route: '/', title: await page.title() });

    // Step 2: Live Catalog
    await page.goto(base + '/live', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.locator('app-live-list h2').first().waitFor();
    const catalogFile = 'live_catalog.png';
    await page.screenshot({ path: path.join(outDir, catalogFile), fullPage: true });
    report.screenshots.push({ file: catalogFile, route: '/live', title: await page.title() });
    report.executedSteps.push({ step: '2. Live Catalog Navigation', status: 'PASS', route: '/live' });

    // Step 3: Live Session WIP & Q&A
    const liveLink = await page.locator('a[href^="/live/"]').first().getAttribute('href').catch(() => null);
    const sessionRoute = liveLink || '/live/reading-inference';
    await page.goto(base + sessionRoute, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.locator('app-live-session').waitFor();
    const sessionFile = 'live_session_wip.png';
    await page.screenshot({ path: path.join(outDir, sessionFile), fullPage: true });
    report.screenshots.push({ file: sessionFile, route: sessionRoute, title: await page.title() });
    report.executedSteps.push({ step: '3. Live Session WIP Navigation', status: 'PASS', route: sessionRoute });

    // Step 4: Guardian Report (Invalid / Synthetic Token)
    const guardianRoute = '/guardian/report/synthetic-invalid-token';
    await page.goto(base + guardianRoute, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1200);
    await page.getByText('Report Not Found', { exact: true }).waitFor();
    const guardianFile = 'guardian_invalid_or_empty.png';
    await page.screenshot({ path: path.join(outDir, guardianFile), fullPage: true });
    report.screenshots.push({ file: guardianFile, route: guardianRoute, title: await page.title() });
    report.executedSteps.push({ step: '4. Guardian Report Invalid Token Handling', status: 'PASS', route: guardianRoute });

    await context.close();

    // Step 5: Service Worker & Offline Fallback Execution
    const swContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
    await swContext.route('**/*', route => {
      const u = new URL(route.request().url());
      if (u.origin === new URL(base).origin) route.continue();
      else route.abort();
    });
    const swPage = await swContext.newPage();
    await swPage.goto(base, { waitUntil: 'load', timeout: 15000 });
    await swPage.evaluate(() => navigator.serviceWorker.ready);
    await swPage.reload({ waitUntil: 'load' });

    const swMeta = await swPage.evaluate(async () => ({
      hasController: !!navigator.serviceWorker.controller,
      registrationCount: (await navigator.serviceWorker.getRegistrations()).length,
      caches: await caches.keys()
    }));

    await swContext.setOffline(true);
    await swPage.goto(base + '/live', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await swPage.waitForTimeout(1000);
    const offlineBody = await swPage.locator('body').innerText();
    const offlineFile = 'offline_fallback.png';
    await swPage.screenshot({ path: path.join(outDir, offlineFile), fullPage: true });
    report.screenshots.push({ file: offlineFile, route: '/live (offline)', title: await swPage.title() });

    const fallbackActive = offlineBody.includes('Offline') || offlineBody.includes('اتصال') || offlineBody.includes('إنترنت');
    assert.equal(swMeta.hasController, true, 'Expected active service worker controller');
    assert.equal(fallbackActive, true, 'Expected actual offline fallback text');
    report.offlineFallbackVerification = {
      serviceWorker: swMeta,
      offlineFallbackTriggered: fallbackActive,
      observedBodySnippet: offlineBody.slice(0, 500)
    };
    report.executedSteps.push({ step: '5. Service Worker Offline Simulation', status: fallbackActive ? 'PASS' : 'WARN', details: swMeta });

    await swContext.close();

    // Step 6: Verify Content House Rules & 5 Sample Questions
    // Read directly from verified service definitions
    const qnaSource = fs.readFileSync('C:/Users/Samer/AppData/Local/hermes/profiles/jira/workspace/samer_sherry_delivery/merge_main_repository/src/app/core/services/live-qna.service.ts', 'utf-8');

    // Extract rules
    const enRulesMatch = qnaSource.match(/en:\s*\[([\s\S]*?)\]/);
    const arRulesMatch = qnaSource.match(/ar:\s*\[([\s\S]*?)\]/);

    function parseRules(block) {
      if (!block) return [];
      return block[1].split('\n')
        .map(l => l.trim().replace(/^['"],?/, '').replace(/['"],?$/, ''))
        .filter(l => l.length > 5 && !l.startsWith('//'));
    }

    const enRules = parseRules(enRulesMatch);
    const arRules = parseRules(arRulesMatch);

    const enWordCount = enRules.join(' ').split(/\s+/).filter(Boolean).length;
    const arWordCount = arRules.join(' ').split(/\s+/).filter(Boolean).length;

    report.houseRulesVerification = {
      criteria: 'Bilingual (Arabic & English), respectful, on-topic, no personal contact, under 60 words each',
      english: {
        rules: enRules,
        wordCount: enWordCount,
        under60Words: enWordCount < 60,
        coversRespectAndTopic: enRules.some(r => r.toLowerCase().includes('polite') || r.toLowerCase().includes('related')),
        coversNoPersonalContact: enRules.some(r => r.toLowerCase().includes('personal contacts') || r.toLowerCase().includes('spam')),
        coversRateLimit: enRules.some(r => r.toLowerCase().includes('15 seconds'))
      },
      arabic: {
        rules: arRules,
        wordCount: arWordCount,
        under60Words: arWordCount < 60,
        coversRespectAndTopic: arRules.some(r => r.includes('متعلقة') || r.includes('إيجاز')),
        coversNoPersonalContact: arRules.some(r => r.includes('هواتف') || r.includes('روابط')),
        coversRateLimit: arRules.some(r => r.includes('15 ثانية'))
      }
    };

    // Extract 5 sample questions
    const sampleMatch = qnaSource.match(/export const SAMPLE_QUESTIONS[\s\S]*?=\s*\[([\s\S]*?)\];/);
    assert.ok(sampleMatch, 'Actual exported SAMPLE_QUESTIONS array must exist');
    const sampleQuestions = [...sampleMatch[1].matchAll(/\{\s*body:\s*'([^']*(?:\\'[^']*)*)',\s*topic:\s*'([^']+)'\s*\}/g)]
      .map(match => ({ body: match[1], topic: match[2] }));
    assert.equal(sampleQuestions.length, 5, 'Exactly five questions must be extracted from actual source');
    assert.ok(enRules.length > 0 && arRules.length > 0 && enWordCount < 60 && arWordCount < 60, 'Both actual rule languages must be nonempty and under60words');

    report.sampleQuestionsVerification = {
      criteria: '5 sample questions matching English-lesson topics, synthetic prompts without real student PII',
      count: sampleQuestions.length,
      fiveQuestionsPresent: sampleQuestions.length === 5,
      questions: sampleQuestions
    };
    report.executedSteps.push({ step: '6. Q&A House Rules & 5 Pedagogical Questions Check', status: 'PASS', details: { enWordCount, arWordCount, sampleQuestionsCount: sampleQuestions.length } });

  } catch (err) {
    report.error = err.message;
    process.exitCode = 1;
    console.error('Execution error:', err);
  } finally {
    fs.writeFileSync(path.join(outDir, 'capture_receipt.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(report.error ? 'AGENT_WALKTHROUGH_FAILED' : 'AGENT_WALKTHROUGH_COMPLETED_WITH_SCOPED_ASSERTIONS');
})();
