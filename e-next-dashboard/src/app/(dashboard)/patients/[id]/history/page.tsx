import PatientHistoryPage from './PatientHistoryPage';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;

  return <PatientHistoryPage params={resolvedParams} />;
}