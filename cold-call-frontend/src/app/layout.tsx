import './globals.css';

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3002';

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'ColdCall Tracker',
  description: 'The fastest way to track your cold calls and manage your leads.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f6f8fb] text-gray-900 min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}