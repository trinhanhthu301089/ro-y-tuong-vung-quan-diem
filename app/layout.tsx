import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rõ Ý Tưởng, Vững Quan Điểm | Coach Anh Thư',
  description: 'Coaching 1-1 dành cho người đi làm muốn nói rõ điều mình biết và đứng vững với điều mình tin trong những tình huống công việc quan trọng.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
