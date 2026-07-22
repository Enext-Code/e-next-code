'use client';

import React from 'react';
import styles from '@/styles/progressParameters.module.css';

interface VitalsTabProps {
  formData: {
    cardiac: {
      heartRate: string;
      rhythm: string;
      temperature: string;
      cvp: string;
    };
    bloodPressure: {
      systolic: string;
      diastolic: string;
    };
  };
  isEditing: boolean;
  onEdit: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const VitalsTab: React.FC<VitalsTabProps> = ({ formData, isEditing, onEdit, onInputChange }) => {
  if (!isEditing) {
    return (
      <div className={styles.viewMode}>
        <div className={styles.viewHeader}>
          <h3>Vitals</h3>
          <button onClick={onEdit} className={styles.editButton}>
            <span>✏️</span> Edit Details
          </button>
        </div>

        <div className={styles.viewContent}>
          <div className={styles.vitalsSection}>
            <h4>Cardiac</h4>
            <div className={styles.viewRow}>
              <label>Heart Rate:</label>
              <span>{formData.cardiac.heartRate} /min</span>
            </div>
            <div className={styles.viewRow}>
              <label>Rhythm:</label>
              <span>{formData.cardiac.rhythm}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Temp (F) (Oral):</label>
              <span>{formData.cardiac.temperature}</span>
            </div>
            <div className={styles.viewRow}>
              <label>CVP:</label>
              <span>{formData.cardiac.cvp}</span>
            </div>
          </div>

          <div className={styles.bpSection}>
            <h4>Blood Pressure</h4>
            <div className={styles.viewRow}>
              <label>Systolic:</label>
              <span>{formData.bloodPressure.systolic}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Diastolic:</label>
              <span>{formData.bloodPressure.diastolic}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editMode}>
      {/* Edit mode form fields */}
    </div>
  );
};

export default VitalsTab; 