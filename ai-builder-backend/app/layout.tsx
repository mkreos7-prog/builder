import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Builder Backend',
  description: 'AI-powered website builder backend API',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
