'use client';

import React from 'react';
import styles from '@/styles/progressParameters.module.css';

interface FluidTabProps {
  formData: {
    infusions: {
      sedatives: string;
      vasopressin: string;
      inotropes: string;
      otherInfusions: string;
    };
    intake: {
      intravenous: Array<{ name: string; value: string; count: number }>;
      oralIntake: Array<{ value: string; count: string }>;
    };
    rilesType: {
      oralIntake: string;
      total: string;
    };
    output: {
      urineQuantity: string;
      total: string;
    };
    drainage: Array<{ value: string }>;
    cumulativeBalance: {
      totalInput: string;
    };
  };
  isEditing: boolean;
  onEdit: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const FluidTab: React.FC<FluidTabProps> = ({ formData, isEditing, onEdit, onInputChange }) => {
  if (!isEditing) {
    return (
      <div className={styles.viewMode}>
        <div className={styles.viewHeader}>
          <h3>Fluid</h3>
          <button onClick={onEdit} className={styles.editButton}>
            <span>✏️</span> Edit Details
          </button>
        </div>

        <div className={styles.viewContent}>
          <div className={styles.fluidSection}>
            <h4>Infusions (A)</h4>
            <div className={styles.fluidTable}>
              <div className={styles.fluidRow}>
                <span>Sedatives:</span>
                <span>Constant</span>
                <span>1</span>
              </div>
              {/* Add other infusion rows */}
            </div>

            {/* Add other sections similarly */}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editMode}>
      {/* Add edit mode form fields */}
    </div>
  );
};

export default FluidTab; 