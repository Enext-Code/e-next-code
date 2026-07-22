'use client';

import React from 'react';
import styles from '@/styles/progressParameters.module.css';

interface BloodGasesTabProps {
  formData: {
    bloodGases: {
      ph: string;
      po2: string;
      co2_p: string;
      co2_et: string;
      be: string;
      lac: string;
      k: string;
      hb: string;
      glucose: string;
      fio2: string;
    };
  };
  isEditing: boolean;
  onEdit: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const BloodGasesTab: React.FC<BloodGasesTabProps> = ({ formData, isEditing, onEdit, onInputChange }) => {
  if (!isEditing) {
    return (
      <div className={styles.viewMode}>
        <div className={styles.viewHeader}>
          <h3>Blood Gases</h3>
          <button onClick={onEdit} className={styles.editButton}>
            <span>✏️</span> Edit Details
          </button>
        </div>

        <div className={styles.viewContent}>
          <div className={styles.bloodGasesSection}>
            <div className={styles.viewRow}>
              <label>pH:</label>
              <span>{formData.bloodGases.ph} mmHg</span>
            </div>
            <div className={styles.viewRow}>
              <label>PO2:</label>
              <span>{formData.bloodGases.po2} mmHg</span>
            </div>
            <div className={styles.viewRow}>
              <label>CO2 - P:</label>
              <span>{formData.bloodGases.co2_p} mmHg</span>
            </div>
            <div className={styles.viewRow}>
              <label>CO2 - ET:</label>
              <span>{formData.bloodGases.co2_et}</span>
            </div>
            <div className={styles.viewRow}>
              <label>BE:</label>
              <span>{formData.bloodGases.be}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Lac:</label>
              <span>{formData.bloodGases.lac}</span>
            </div>
            <div className={styles.viewRow}>
              <label>K+:</label>
              <span>{formData.bloodGases.k}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Hb:</label>
              <span>{formData.bloodGases.hb}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Glucose:</label>
              <span>{formData.bloodGases.glucose}</span>
            </div>
            <div className={styles.viewRow}>
              <label>FiO2:</label>
              <span>{formData.bloodGases.fio2}</span>
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

export default BloodGasesTab; 