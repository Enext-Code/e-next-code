'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/common/Breadcrumb';
import EditPatientBasicInfo from '@/components/patients/history/edit/edit-patient-basic-info';
import styles from '@/styles/patients.module.css';

type EditBasicInfoPageProps = {
  id: string;
};

export default function EditBasicInfoPage({ id }: EditBasicInfoPageProps) {
  const router = useRouter();

  const breadcrumbItems = [
    { label: 'Patient', href: '/patients' },
    { label: 'Patient Details', href: `/patients/${id}` },
    { label: 'History Sheet', href: `/patients/${id}/history` },
    { label: 'Edit Basic Info' }
  ];

  const handleTabClick = (tab: string) => {
    switch(tab) {
      case 'basic':
        router.push(`/patients/${id}/basic/edit`);
        break;
      case 'history':
        router.push(`/patients/${id}/history/edit/past-medical`);
        break;
      case 'physical':
        router.push(`/patients/${id}/history/edit/physical-exam`);
        break;
      case 'investigation':
        router.push(`/patients/${id}/history/edit/investigation`);
        break;
    }
  };

  return (

      <div className={styles.pageContainer}>
        <h2 style={{fontSize: '24px', fontWeight: '600'}}>Edit Basic Info</h2>

        <Breadcrumb items={breadcrumbItems} />
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
      <EditPatientBasicInfo patientId={id} />
    </div>
  );
} 