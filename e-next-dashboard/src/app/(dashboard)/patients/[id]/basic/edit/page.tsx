import { Suspense } from 'react';
import EditPatientPageClient from './EditPatientPageClient';

export default async function Page({   params }: {   params: Promise<{ id: string }> }) {
  const resolvedParams = await params;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditPatientPageClient params={resolvedParams} />
    </Suspense>
  );
}