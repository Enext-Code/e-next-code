'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import EditPatientPhysicalExam from '@/components/patients/history/edit/edit-physical-exam';
import Breadcrumb from '@/components/common/Breadcrumb';
import styles from '@/styles/patients.module.css';

interface PageParams {
  id: string;
}

export default function EditPhysicalExamClient({ params }: { params: PageParams }) {
  // Get current date in DD-MM-YYYY format (IST)
  const currentDate = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
  const router = useRouter();
  const handleTabClick = (tab: string) => {
    switch(tab) {
      case 'basic':
        router.push(`/patients/${params.id}/basic/edit`);
        break;
      case 'history':
        router.push(`/patients/${params.id}/history/edit/past-medical`);
        break;
      case 'physical':
        router.push(`/patients/${params.id}/history/edit/physical-exam`);
        break;
      case 'investigation':
        router.push(`/patients/${params.id}/history/edit/investigation`);
        break;
    }
  };
  
  const breadcrumbItems = [
    { label: 'Patient', href: '/patients' },
    { label: 'Patient Details', href: `/patients/${params.id}` },
    { label: 'History Sheet', href: `/patients/${params.id}/history` },
    { label: 'Edit Physical Exam' }
  ];

  return (
    <>
      <div className={styles.pageContainer}>
        <Breadcrumb 
          items={breadcrumbItems}
          date={currentDate}
        />
          
{/* <div className={styles.marginTab}>
        <div className={styles.tabsContainer}>
          <button 
            className={styles.tabswidth}
            onClick={() => handleTabClick('basic')}
          >
            Basic Info
          </button>
          <button 
            className={styles.tabswidth}
            onClick={() => handleTabClick('history')}
          >
            History
          </button>
          <button 
            className={styles.tabswidth}
            onClick={() => handleTabClick('physical')}
          >
            Physical
          </button>
          <button 
            className={styles.tabswidth}
            onClick={() => handleTabClick('investigation')}
          >
            Investigation
          </button>
        </div>
      </div> */}

        <EditPatientPhysicalExam patientId={params.id} />
      </div>
    </>
  );
} 