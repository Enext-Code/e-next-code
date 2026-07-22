'use client';

import React from 'react';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import InvestigationReportView from '@/components/patients/investigation-report/InvestigationReportView';
import styles from '@/styles/investigation-report/investigation-report.module.css';
import Breadcrumb from '@/components/common/Breadcrumb';
import { useParams } from 'next/navigation';
interface PageParams {
  id: string;
} 
export default function InvestigationReportPage() {
  const params = useParams() as unknown as PageParams;
  const breadcrumbItems = [
    { label: 'Patient', href: '/patients' },
    { label: 'Patient Details', href: `/patients/${params.id}` },
    { label: 'Investigation Report' }
  ];

  return (
    <>
    
      <div className={styles.pageContainer}>
        
        <Breadcrumb items={breadcrumbItems} />
        <InvestigationReportView />
      </div>
    </>
  );
} 