#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();

const checks = [
  {
    name: 'robots.txt includes sitemap reference',
    file: path.join(projectRoot, 'public', 'robots.txt'),
    validate: content => /sitemap:\s*https?:\/\//i.test(content),
    success: 'robots.txt exposes Sitemap URL',
    failure: 'Add `Sitemap:` entry to public/robots.txt'
  },
  {
    name: 'sitemap.xml.tsx uses canonical domain',
    file: path.join(projectRoot, 'pages', 'sitemap.xml.tsx'),
    validate: content => content.includes('https://novasingerai.com'),
    success: 'sitemap builder points to https://novasingerai.com',
    failure: 'Update SITE_URL in pages/sitemap.xml.tsx to production domain'
  },
  {
    name: 'SeoMeta wires GA/GTM env toggles',
    file: path.join(projectRoot, 'components', 'SeoMeta.tsx'),
    validate: content =>
      content.includes('NEXT_PUBLIC_GA_MEASUREMENT_ID') &&
      (content.includes('NEXT_PUBLIC_GTM_ID') || content.includes('NEXT_PUBLIC_GOOGLE_TAG_ID')),
    success: 'SeoMeta reads GA/GTM environment variables',
    failure: 'Ensure SeoMeta.tsx checks GA and GTM env variables'
  },
  {
    name: 'SeoDefaults exports canonical url',
    file: path.join(projectRoot, 'components', 'SeoDefaults.tsx'),
    validate: content => /<link rel="canonical"/i.test(content),
    success: 'SeoDefaults sets canonical link',
    failure: 'Add canonical <link> tag in SeoDefaults.tsx'
  }
];

const results = [];

for (const check of checks) {
  try {
    const content = await readFile(check.file, 'utf-8');
    const ok = check.validate(content);
    results.push({ ...check, ok });
  } catch (error) {
    results.push({
      ...check,
      ok: false,
      failure: `File missing or unreadable: ${check.file}. ${error instanceof Error ? error.message : error}`
    });
  }
}

const failures = results.filter(item => !item.ok);

results.forEach(result => {
  const status = result.ok ? '✅' : '❌';
  const message = result.ok ? result.success : result.failure;
  // eslint-disable-next-line no-console
  console.log(`${status} ${result.name} – ${message}`);
});

if (failures.length) {
  process.exitCode = 1;
  // eslint-disable-next-line no-console
  console.error(`\n${failures.length} SEO checklist item(s) need attention.`);
} else {
  // eslint-disable-next-line no-console
  console.log('\nAll SEO checklist items passed.');
}
