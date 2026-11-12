import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Root HTML for the web demo. Keeps the site shareable and mobile-friendly
 * when presenting PharmaSense in a browser.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta
          name="description"
          content="PharmaSense — hypertension label-scan prototype. Medication and nutrition label reading, local med list, and sodium watch. Not medical advice."
        />
        <meta name="theme-color" content="#1278B8" />
        <title>PharmaSense</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveRoot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveRoot = `
html, body, #root {
  height: 100%;
}
body {
  margin: 0;
  background:
    radial-gradient(1200px 600px at 10% -10%, #d7eef8 0%, transparent 55%),
    radial-gradient(900px 500px at 100% 0%, #e8f4fc 0%, transparent 50%),
    #eef3f7;
  font-family: "Spline Sans", ui-sans-serif, system-ui, -apple-system, sans-serif;
}
`;
