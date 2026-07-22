'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/styles/historySheet.module.css';

interface HistorySheetHeaderProps {
  patientId: string;
  currentStep: string;
}

const HistorySheetHeader = ({ patientId, currentStep }: HistorySheetHeaderProps) => {
  const router = useRouter();

  const handleNavigation = (step: string) => {
    router.push(`/patients/add/${step}?patientId=${patientId}`);
  };

  return (
    <div className={styles.header}>
      <Link href="/patients" className={styles.backButton}>
        <span>←</span> History Sheet
      </Link>
      
      <div className={styles.navigationButtons}>
        <button 
          className={`${styles.navButton} ${currentStep === 'basic-info' ? styles.active : styles.inactive}`}
          onClick={() => handleNavigation('basic-info')}
        >
          Patient Basic Info
        </button>
        
        <button 
          className={`${styles.navButton} ${currentStep === 'history-sheet' ? styles.active : styles.inactive}`}
          onClick={() => handleNavigation('history-sheet')}
        >
          Add History Sheet
        </button>
        
        <button 
          className={`${styles.navButton} ${currentStep === 'physical-examination' ? styles.active : styles.inactive}`}
          onClick={() => handleNavigation('physical-examination')}
        >
          Physical Examination
        </button>
        
        <button 
          className={`${styles.navButton} ${currentStep === 'investigation' ? styles.active : styles.inactive}`}
          onClick={() => handleNavigation('investigation')}
        >
          Investigation
        </button>
      </div>
    </div>
  );
};

export default HistorySheetHeader; 