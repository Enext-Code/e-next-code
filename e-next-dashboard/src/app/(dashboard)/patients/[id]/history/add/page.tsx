import PatientHistoryPageClient from './PatientHistoryPageClient';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;

  return <PatientHistoryPageClient params={resolvedParams} />;
}