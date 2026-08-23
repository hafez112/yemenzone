import type { Metadata } from 'next';
import CertificateClient from './CertificateClient';

export const metadata: Metadata = {
  title: 'صك ملكية أسهم — منصة يمن زون',
  description: 'صك ملكية أسهم موثق من منصة يمن زون — تحقق من صحته برقمه الفريد',
  robots: { index: false }, // وثيقة شخصية — تُشارك برابطها ولا تُفهرس
};

export default async function ShareCertificatePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return <CertificateClient number={number} />;
}
