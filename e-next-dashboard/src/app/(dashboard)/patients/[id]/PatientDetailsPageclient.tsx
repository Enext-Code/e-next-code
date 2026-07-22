'use client';
import React from 'react';
import PatientDetailsView from '@/components/patients/PatientDetailsView';
import styles from '@/styles/patients.module.css';
import Breadcrumb from '@/components/common/Breadcrumb';    
import { useParams } from 'next/navigation';

// interface PageParams {
//   id: string;
// }
type PageParams = {
    id: string;
  };

  
export default function PatientDetailsPageClient() {
  const params = useParams<PageParams>();
  const breadcrumbItems = [
    { label: 'Patients', href: '/patients' },
    { label: 'Patient Details' }
  ];
  return (
    <div className={styles.pageContainer}>
      <h2 style={{fontSize: '24px', fontWeight: '500'}}>Patient Details</h2>
      <Breadcrumb items={breadcrumbItems} />
      <PatientDetailsView patientId={params.id} />
    </div>
  );
} 