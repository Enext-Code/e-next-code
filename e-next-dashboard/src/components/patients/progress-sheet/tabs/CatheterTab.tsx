'use client';

import React from 'react';
import styles from '@/styles/progressParameters.module.css';

interface CatheterTabProps {
  formData: {
    catheter: {
      type1: {
        catheterType: string;
        size1: string;
        size2: string;
        dateOfInsertion: string;
        daysInUse: string;
        dateOfRemoval: string;
      };
      type2: {
        catheterType: string;
        dateOfInsertion: string;
        daysInUse: string;
        dateOfRemoval: string;
      };
    };
  };
  isEditing: boolean;
  onEdit: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const CatheterTab: React.FC<CatheterTabProps> = ({ formData, isEditing, onEdit, onInputChange }) => {
  if (!isEditing) {
    return (
      <div className={styles.viewMode}>
        <div className={styles.viewHeader}>
          <h3>Catheter</h3>
          <button onClick={onEdit} className={styles.editButton}>
            <span>✏️</span> Edit Details
          </button>
        </div>

        <div className={styles.viewContent}>
          <div className={styles.catheterSection}>
            <h4>Catheter Type I</h4>
            <div className={styles.viewRow}>
              <label>Catheter Type:</label>
              <span>{formData.catheter.type1.catheterType}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Size:</label>
              <span>{formData.catheter.type1.size1}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Size:</label>
              <span>{formData.catheter.type1.size2}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Date Of Insertion:</label>
              <span>{formData.catheter.type1.dateOfInsertion}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Days in use:</label>
              <span>{formData.catheter.type1.daysInUse}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Date Of Removal:</label>
              <span>{formData.catheter.type1.dateOfRemoval}</span>
            </div>

            <h4>Catheter Type II</h4>
            <div className={styles.viewRow}>
              <label>Catheter Type II:</label>
              <span>{formData.catheter.type2.catheterType}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Date Of Insertion:</label>
              <span>{formData.catheter.type2.dateOfInsertion}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Days in use:</label>
              <span>{formData.catheter.type2.daysInUse}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Date Of Removal:</label>
              <span>{formData.catheter.type2.dateOfRemoval}</span>
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

export default CatheterTab; 