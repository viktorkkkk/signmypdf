/**
 * IndexNow bulk submission — submits all signmypdf.io URLs to Bing
 * Key file: https://signmypdf.io/8e0aa4aa055ef1d076ab294fd8edb9ba.txt
 * Run: node scripts/submit-indexnow.mjs
 */

const HOST = 'signmypdf.io';
const KEY  = '8e0aa4aa055ef1d076ab294fd8edb9ba';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const STATIC_URLS = [
  `https://${HOST}/`,
  `https://${HOST}/fill`,
  `https://${HOST}/protect`,
  `https://${HOST}/blog`,
  `https://${HOST}/privacy`,
  `https://${HOST}/terms`,
];

const BLOG_SLUGS = [
  'how-to-sign-pdf-online',
  'sign-pdf-free-without-registration',
  'how-to-add-signature-to-pdf',
  'sign-pdf-on-iphone-free',
  'sign-pdf-on-mac',
  'sign-pdf-android-free',
  'sign-pdf-windows-free',
  'sign-pdf-without-adobe',
  'sign-pdf-no-watermark',
  'sign-pdf-fast-secure',
  'how-to-sign-lease-agreement-online',
  'how-to-sign-nda-online',
  'docusign-alternative-free',
  'fill-pdf-form-online-free',
  'signmypdf-vs-docusign-freelancers',
  'real-estate-agents-sign-documents',
  'fill-w9-form-online-free',
  'electronic-signature-legal-rental',
  'sign-nda-online-without-printing',
  'pdf-wont-let-me-type-fix',
  'ilovepdf-vs-signmypdf',
  'fill-irs-form-online-free',
  'freelancers-sign-contracts-free',
  'electronic-signature-laws-by-state',
  'sign-employment-offer-letter-online',
  'cant-sign-pdf-iphone-fix',
  'adobe-acrobat-vs-signmypdf',
  'sign-pdf-on-chromebook-free',
  'sign-pdf-from-google-drive-free',
  'fill-rental-application-pdf-free',
  'small-business-document-signing',
  'eidas-regulation-eu-signatures',
  'sign-medical-release-form-online',
  'fill-medical-release-form-online',
  'eidas-fill-pdf-eu',
  'pdf-form-fields-not-working-fix',
  'sign-insurance-documents-online',
  'hellosign-alternatives-free',
  'hr-teams-collect-signatures',
  'esign-act-explained',
  'fill-job-application-pdf-online',
  'sign-pdf-no-editing-allowed',
];

const BLOG_URLS = BLOG_SLUGS.map(slug => `https://${HOST}/blog/${slug}`);

const ALL_URLS = [...STATIC_URLS, ...BLOG_URLS];

async function submitIndexNow(engine, endpoint) {
  const body = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: ALL_URLS,
  };

  console.log(`\n→ Submitting ${ALL_URLS.length} URLs to ${engine}...`);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  if (res.ok || res.status === 200 || res.status === 202) {
    console.log(`✅ ${engine}: ${res.status} — accepted`);
  } else {
    const text = await res.text().catch(() => '');
    console.error(`❌ ${engine}: ${res.status} — ${text}`);
  }
}

async function main() {
  console.log('IndexNow bulk submission');
  console.log(`Host: ${HOST}`);
  console.log(`Key:  ${KEY}`);
  console.log(`URLs: ${ALL_URLS.length} total\n`);
  ALL_URLS.forEach(u => console.log('  ' + u));

  // Submit to all major IndexNow endpoints (they share the data)
  await submitIndexNow('Bing',        'https://www.bing.com/indexnow');
  await submitIndexNow('IndexNow API','https://api.indexnow.org/indexnow');

  console.log('\nDone. Bing typically processes within 1–4 hours.');
  console.log(`Verify: https://www.bing.com/webmasters/about?siteUrl=https://${HOST}/`);
}

main().catch(console.error);
