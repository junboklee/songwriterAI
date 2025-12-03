import Document, { Html, Head, Main, NextScript } from 'next/document';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || process.env.NEXT_PUBLIC_GOOGLE_TAG_ID;

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="ko">
        <Head />
        <body>
          {GTM_ID ? (
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                height="0"
                width="0"
                style={{ display: 'none', visibility: 'hidden' }}
                title="gtm-noscript"
              />
            </noscript>
          ) : null}
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
