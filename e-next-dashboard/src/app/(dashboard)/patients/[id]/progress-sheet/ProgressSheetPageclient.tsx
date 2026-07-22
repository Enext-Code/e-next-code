'use client';

import React from 'react';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import ProgressSheetView from '@/components/patients/progress-sheet/details/progesssheetdetail-view';
import styles from '@/styles/progress-sheet/progress-sheet.module.css';
import Breadcrumb from '@/components/common/Breadcrumb';
import { useParams } from 'next/navigation';

export default function ProgressSheetPageClient() {
  const params = useParams();
  const breadcrumbItems = [
    { label: 'Patient', href: `/patients` },
    { label: 'Patient Details', href: `/patients/${params.id}` },
    { label: 'Progress Sheet' }
  ];

  return (
    <>
      <div className={styles.pageContainer}>
        <Breadcrumb items={breadcrumbItems} />
        <ProgressSheetView />
      </div>
    </>
  );
} 