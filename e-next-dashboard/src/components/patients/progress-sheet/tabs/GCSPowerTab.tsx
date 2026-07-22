'use client';

import React from 'react';
import styles from '@/styles/progressParameters.module.css';

interface GCSPowerTabProps {
  formData: {
    eyeOpening: string;
    verbalResponse: string;
    motorResponse: string;
    gcsScore: string;
    rightPupilSize: string;
    leftPupilSize: string;
    pupilType: string;
    sedation: string;
    pain: string;
  };
  isEditing: boolean;
  onEdit: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const GCSPowerTab: React.FC<GCSPowerTabProps> = ({ formData, isEditing, onEdit, onInputChange }) => {
  if (!isEditing) {
    return (
      <div className={styles.viewMode}>
        <div className={styles.viewHeader}>
          <h3>GCS & Power</h3>
          <button onClick={onEdit} className={styles.editButton}>
            <span>✏️</span> Edit Details
          </button>
        </div>

        <div className={styles.viewContent}>
          <div className={styles.gcsSection}>
            <h4>GCS</h4>
            <div className={styles.viewRow}>
              <label>Eye Opening (E):</label>
              <span>{formData.eyeOpening}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Verbal Response (V):</label>
              <span>{formData.verbalResponse}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Motor Response (M):</label>
              <span>{formData.motorResponse}</span>
            </div>
            <div className={styles.viewRow}>
              <label>GCS SCORE:</label>
              <span>{formData.gcsScore}</span>
            </div>
          </div>

          <div className={styles.cnsSection}>
            <h4>CNS, Pupils:</h4>
            <div className={styles.viewRow}>
              <label>Right Pupil Size:</label>
              <span>{formData.rightPupilSize}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Left Pupil Size:</label>
              <span>{formData.leftPupilSize}</span>
            </div>
          </div>

          <div className={styles.powerSection}>
            <h4>Power:</h4>
            <div className={styles.viewRow}>
              <label>Pupil Type:</label>
              <span>{formData.pupilType}</span>
            </div>
          </div>

          <div className={styles.otherSection}>
            <div className={styles.viewRow}>
              <label>Sedation:</label>
              <span>{formData.sedation}</span>
            </div>
            <div className={styles.viewRow}>
              <label>Pain:</label>
              <span>{formData.pain}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editMode}>
      {/* Edit mode form fields */}
      <div className={styles.gcsSection}>
        <h3>GCS</h3>
        <div className={styles.gcsGrid}>
          <div className={styles.formGroup}>
            <label>Eye Opening (E):</label>
            <select
              name="eyeOpening"
              value={formData.eyeOpening}
              onChange={onInputChange}
            >
              <option value="">Select Eye Opening</option>
              <option value="4">4 - Spontaneous</option>
              <option value="3">3 - To Voice</option>
              <option value="2">2 - To Pain</option>
              <option value="1">1 - None</option>
            </select>
          </div>
          {/* Add other form fields similarly */}
        </div>
      </div>
    </div>
  );
};

export default GCSPowerTab; 