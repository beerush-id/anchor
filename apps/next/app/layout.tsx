import '@anchorlib/react/client';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Header } from '@components/Header';
import { cookies } from 'next/headers.js';
import Script from 'next/script.js';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair-display',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://anchorlib.dev'),
  alternates: {
    canonical: '/',
  },
  title: {
    default: 'AIR Stack - Anchor + IRPC + Reactive UI | The Future of Web Development',
    template: '%s | AIR Stack',
  },
  description:
    'The complete stack for modern web applications: Anchor (fine-grained state management), IRPC (6.96x faster APIs with automatic batching), and Reactive UI (React, Solid, Svelte, Vue). Build faster, ship cheaper, scale effortlessly.',
  keywords: [
    'AIR Stack',
    'Anchor',
    'IRPC',
    'Reactive UI',
    'state management',
    'RPC',
    'API framework',
    'fine-grained reactivity',
    'batching',
    'type-safe APIs',
    'React',
    'Solid',
    'Vue',
    'Svelte',
    'TypeScript',
    'Bun',
    'performance',
    'enterprise',
    'web development',
  ],
  icons: [
    {
      rel: 'apple-touch-icon-precomposed',
      sizes: '57x57',
      url: '/icons/apple-touch-icon-57x57.png',
    },
    {
      rel: 'apple-touch-icon-precomposed',
      sizes: '114x114',
      url: '/icons/apple-touch-icon-114x114.png',
    },
    {
      rel: 'apple-touch-icon-precomposed',
      sizes: '72x72',
      url: '/icons/apple-touch-icon-72x72.png',
    },
    {
      rel: 'apple-touch-icon-precomposed',
      sizes: '144x144',
      url: '/icons/apple-touch-icon-144x144.png',
    },
    {
      rel: 'apple-touch-icon-precomposed',
      sizes: '60x60',
      url: '/icons/apple-touch-icon-60x60.png',
    },
    {
      rel: 'apple-touch-icon-precomposed',
      sizes: '120x120',
      url: '/icons/apple-touch-icon-120x120.png',
    },
    {
      rel: 'apple-touch-icon-precomposed',
      sizes: '76x76',
      url: '/icons/apple-touch-icon-76x76.png',
    },
    {
      rel: 'apple-touch-icon-precomposed',
      sizes: '152x152',
      url: '/icons/apple-touch-icon-152x152.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '196x196',
      url: '/icons/favicon-196x196.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '96x96',
      url: '/icons/favicon-96x96.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      url: '/icons/favicon-32x32.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      url: '/icons/favicon-16x16.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '128x128',
      url: '/icons/favicon-128.png',
    },
  ],
  authors: [
    {
      name: 'Nanang Mahdaen El Agung',
      url: 'https://www.mahdaen.name',
    },
  ],
  applicationName: 'AIR Stack',
  openGraph: {
    type: 'website',
    title: 'AIR Stack - Anchor + IRPC + Reactive UI',
    description:
      'The complete stack for modern web development: Anchor (state management), IRPC (6.96x faster APIs), and Reactive UI (React, Solid, Svelte, Vue). Build faster, ship cheaper, scale effortlessly.',
    images: [
      {
        url: 'https://anchorlib.dev/docs/social.jpg',
        alt: 'AIR Stack - Anchor + IRPC + Reactive UI',
      },
    ],
    url: 'https://anchorlib.dev/',
    siteName: 'AIR Stack',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AIR Stack - Anchor + IRPC + Reactive UI',
    description:
      'The complete stack for modern web development: Anchor (state management), IRPC (6.96x faster APIs), and Reactive UI (React, Solid, Svelte, Vue). Build faster, ship cheaper, scale effortlessly.',
    images: ['https://anchorlib.dev/docs/social.jpg'],
    site: '@beerush_id',
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookie = await cookies();
  const userSettings = cookie.get('app-settings');
  const settings = userSettings?.value ? JSON.parse(userSettings.value) : {};
  const darkClass =
    settings.theme === 'dark' || (settings.theme === 'system' && settings.systemTheme === 'dark') ? 'dark' : '';

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${darkClass}`}>
      <head>
        {!userSettings?.value && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                const dark = window.matchMedia('prefers-color-scheme: dark').matches;
                if (dark) document.documentElement.classList.add('dark');
              `,
            }}
          ></script>
        )}
      </head>
      <body className={`antialiased`}>
        <Header />
        {children}
        {process.env.NODE_ENV === 'production' && (
          <>
            <Script async src={`https://www.googletagmanager.com/gtag/js?id=G-SSMTTBW5G5`} />
            <Script id={'google-tag-manager'} async>
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-SSMTTBW5G5');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
