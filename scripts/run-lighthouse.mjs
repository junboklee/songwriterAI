#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const url = process.env.LIGHTHOUSE_URL || 'http://localhost:3000';
const categoriesEnv = process.env.LIGHTHOUSE_CATEGORIES || 'performance,seo';
const categories = categoriesEnv
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

if (!categories.length) {
  console.error('No Lighthouse categories specified. Set LIGHTHOUSE_CATEGORIES env or use defaults.');
  process.exit(1);
}

const outputPath =
  process.env.LIGHTHOUSE_OUTPUT || path.join(process.cwd(), 'lighthouse-report.json');

async function run() {
  const chrome = await launch({
    chromeFlags: ['--headless=new', '--no-sandbox']
  });

  try {
    const options = {
      logLevel: 'info',
      output: 'json',
      port: chrome.port,
      onlyCategories: categories
    };

    const runnerResult = await lighthouse(url, options);
    const reportJson = runnerResult.report;

    fs.writeFileSync(outputPath, typeof reportJson === 'string' ? reportJson : JSON.stringify(reportJson, null, 2));
    console.log(`Lighthouse report saved to ${outputPath}`);
    console.log(`Scores for ${url}`);
    categories.forEach(category => {
      const score = runnerResult.lhr.categories[category]?.score;
      if (typeof score === 'number') {
        console.log(`  ${category}: ${Math.round(score * 100)}`);
      }
    });
  } finally {
    await chrome.kill();
  }
}

run().catch(error => {
  console.error('Lighthouse run failed:', error);
  process.exit(1);
});
