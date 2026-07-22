'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/patients.module.css';

const PatientHeader = () => {
  const router = useRouter();

  const handleAddNewPatient = () => {
    router.push('/patients/add');
  };

  return (
    <div className={styles.header}>
      <div className={styles.titleSection}>
        <h1>All Patient lists</h1>
        <span className={styles.patientCount}>32 Patients</span>
        <span className={styles.date}>Today, 28-05-2025</span>
      </div>
      <button className={styles.addButton} onClick={handleAddNewPatient}>
        <span>+</span> Add New Patients
      </button>
    </div>
  );
};

export default PatientHeader; 