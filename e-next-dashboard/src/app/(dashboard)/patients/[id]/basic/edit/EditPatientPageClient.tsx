'use client';

import React from 'react';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import EditBasicInfoPage from '@/components/patients/history/edit/EditBasicInfoPage';
// import { Patient } from '@/services/patientService';

interface EditPatientPageClientProps {
  params: {
    id: string;
  };
//   initialPatientData?: Patient; // Make this optional since EditBasicInfoPage doesn't use it directly
}

export default function EditPatientPageClient({ params }: EditPatientPageClientProps) {
  return (
    <>
      <EditBasicInfoPage id={params.id} />
    </>
  );
} 