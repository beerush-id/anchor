import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@components/Header';
import Script from 'next/script.js';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Anchor - State Management For Humans',
    template: '%s | Anchor',
  },
  description:
    'A revolutionary state management framework for modern web applications with fine-grained reactivity and true immutability. First-class support for React, Vue, Svelte, and vanilla JavaScript/TypeScript.',
  keywords: [
    'state management',
    'reactivity',
    'immutability',
    'javascript',
    'typescript',
    'vue',
    'react',
    'svelte',
    'fine-grained reactivity',
    'web development',
    'enterprise apps',
    'dsv model',
    'data state view',
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
  applicationName: 'Anchor',
  openGraph: {
    type: 'website',
    title: 'Anchor - State Management For Humans',
    description:
      'Anchor - A revolutionary state management framework for modern web applications with fine-grained reactivity and true immutability. First-class support for React, Vue, Svelte, and vanilla JavaScript/TypeScript.',
    images: [
      {
        url: 'https://anchor.mahdaen.name/docs/social.jpg',
        alt: 'Anchor State Management Library',
      },
    ],
    url: 'https://anchor.mahdaen.name/',
    siteName: 'Anchor',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anchor - State Management For Humans',
    description:
      'Anchor - A revolutionary state management framework for modern web applications with fine-grained reactivity and true immutability. First-class support for React, Vue, Svelte, and vanilla JavaScript/TypeScript.',
    images: ['https://anchor.mahdaen.name/docs/social.jpg'],
    site: '@beerush_id',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
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
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Header />
        {children}
      </body>
    </html>
  );
}
