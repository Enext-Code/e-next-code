import React from 'react';
import Link from 'next/link';
import styles from '@/styles/patientdetails-new.module.css';

const PatientDetailsHeader = () => {
  return (
    <div className={styles.header}>
      <div className={styles.titleSection}>
        <h1>Patient Details</h1>
        <div className={styles.metadata}>
          <span>Date: 28-05-2025</span>
          <span className={styles.separator}>|</span>
          <span>DAY: 06</span>
        </div>
      </div>
      <Link href="/patients" className={styles.backButton}>
        <span>←</span> Patient Details
      </Link>
    </div>
  );
};

export default PatientDetailsHeader; 