import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/patientdetails-new.module.css';

const PatientReports = () => {
  const router = useRouter();

  const handleProgressSheet = () => {
    router.push('/patients/progress-sheet');
  };

  const handleInvestigationReport = () => {
    router.push('/patients/investigation-report');
  };

  return (
    <div className={styles.reportsGrid}>
      <div className={styles.reportCard} onClick={handleProgressSheet}>
        <div className={styles.reportIcon}>📋</div>
        <span className={styles.reportTitle}>Progress Sheet</span>
        <button className={styles.expandButton}>↗</button>
      </div>
      <div className={styles.reportCard} onClick={handleInvestigationReport}>
        <div className={styles.reportIcon}>🔍</div>
        <span className={styles.reportTitle}>Investigation Report</span>
        <button className={styles.expandButton}>↗</button>
      </div>
      <div className={styles.reportCard}>
        <div className={styles.reportIcon}>📅</div>
        <span className={styles.reportTitle}>Daily Round sheet</span>
        <button className={styles.expandButton}>↗</button>
      </div>
      <div className={styles.reportCard}>
        <div className={styles.reportIcon}>📤</div>
        <span className={styles.reportTitle}>Discharge</span>
        <button className={styles.expandButton}>↗</button>
      </div>
    </div>
  );
};

export default PatientReports; 