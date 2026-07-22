import React from 'react';
import styles from '@/styles/patientdetails-new.module.css';

const PatientActions = () => {
  return (
    <div className={styles.actionButtons}>
      <button className={styles.actionButton}>Apache Score</button>
      <button className={styles.actionButton}>History Sheet</button>
      <button className={styles.actionButton}>Transfer Bed</button>
      <button className={styles.actionButton}>Critical Input</button>
    </div>
  );
};

export default PatientActions; 