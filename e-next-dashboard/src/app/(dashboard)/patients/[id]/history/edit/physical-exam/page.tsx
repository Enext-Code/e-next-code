import EditPhysicalExamClient from './EditPhysicalExamClient';

export default async function EditPhysicalExamPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;

  return <EditPhysicalExamClient params={resolvedParams} />;
}