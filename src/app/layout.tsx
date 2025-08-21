import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SwiftTrack - Advanced Middleware Architecture for Modern Logistics",
  description: "SwiftLogistics middleware platform integrating CMS, WMS, and ROS systems with real-time tracking and delivery management",
  keywords: "logistics, middleware, real-time tracking, delivery management, system integration",
  authors: [{ name: "SwiftLogistics Team" }],
  creator: "SwiftLogistics",
  publisher: "SwiftLogistics (Pvt) Ltd",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    title: "SwiftTrack - Advanced Middleware Architecture",
    description: "Modern logistics middleware platform with real-time tracking",
    url: 'http://localhost:3000',
    siteName: 'SwiftTrack',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SwiftTrack Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SwiftTrack - Advanced Middleware Architecture',
    description: 'Modern logistics middleware platform with real-time tracking',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-gray-50 text-gray-900 min-h-full`}>
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">
            {children}
          </main>
          <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
            <div className="container mx-auto px-4">
              <div className="text-center text-gray-600">
                <p>&copy; 2025 SwiftLogistics (Pvt) Ltd. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
