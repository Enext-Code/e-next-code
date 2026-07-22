import EditPastMedicalHistoryClient from './EditPastMedicalHistoryClient';

export default async function EditPastMedicalHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;

  return <EditPastMedicalHistoryClient params={resolvedParams} />;
}