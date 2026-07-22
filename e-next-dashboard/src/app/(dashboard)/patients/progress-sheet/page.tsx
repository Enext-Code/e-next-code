'use client';

import React from 'react';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import ProgressSheetView from '@/components/patients/progress-sheet/ProgressSheetView';
import styles from '@/styles/progress-sheet.module.css';
import Breadcrumb from '@/components/common/Breadcrumb';

export default function ProgressSheetPage() {
  const breadcrumbItems = [
    { label: 'Patient', href: '/patients' },
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