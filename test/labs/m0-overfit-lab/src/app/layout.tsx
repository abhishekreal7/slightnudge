import './globals.css';

export const metadata = {
  title: 'Overfit Lab',
  description: 'Second test app for SlightNudge M0 verification',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
