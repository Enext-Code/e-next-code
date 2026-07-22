'use client';

import React, { useEffect, useState } from 'react';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import PatientHistoryForm from '@/components/patients/history/PatientHistoryForm';
import Breadcrumb from '@/components/common/Breadcrumb';
import styles from '@/styles/patients.module.css';
import { patientService } from '@/services/patientService';

interface PageParams {
  id: string;
}

export default function PatientHistoryPageClient({ params }: { params: PageParams }) {
  // Get current date in DD-MM-YYYY format (IST)
  const currentDate = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
  
  // Calculate days since admission (for demo, using 6 as shown in image)
  const day = '06';

  const breadcrumbItems = [
    { label: 'Patient', href: '/patients' },
    { label: 'Patient Details', href: `/patients/${params.id}` },
    { label: 'History Sheet' }
  ];

  return (
    <>
      <div className={styles.pageContainer}>
        <Breadcrumb 
          items={breadcrumbItems}
          date={currentDate}
          day={day}
        />
        <PatientHistoryForm patientId={params.id} />
      </div>
    </>
  );
} 