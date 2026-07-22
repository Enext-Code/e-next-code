import React from 'react';
import styles from '@/styles/patients.module.css';

const PatientFilters = () => {
  return (
    <div className={styles.filterSection}>
      <div className={styles.filters}>
        <div className={styles.filterIcon}>⚟</div>
        <span>Filter By</span>
        
        <select className={styles.filterSelect}>
          <option>Date</option>
        </select>
        
        <select className={styles.filterSelect}>
          <option>Patient Type</option>
        </select>
        
        <select className={styles.filterSelect}>
          <option>Status</option>
        </select>
        
        <button className={styles.resetFilter}>
          ↺ Reset Filter
        </button>
      </div>
    </div>
  );
};

export default PatientFilters; 