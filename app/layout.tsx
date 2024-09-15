import './globals.css'; 

import { MantineProvider } from '@mantine/core';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-900">
        <MantineProvider>
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
