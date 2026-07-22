import InvestigationReportPageClient from './InvestigationReportPagedateclient';

export default async function InvestigationReport({ params }: { params: Promise<{ id: string; date: string }> }) {
  const resolvedParams = await params;

  return <InvestigationReportPageClient params={resolvedParams} />;
}