import EditInvestigationHistoryClient from './editinvestigationhistoryclient';

export default async function EditInvestigationHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;

  return <EditInvestigationHistoryClient params={resolvedParams} />;
}