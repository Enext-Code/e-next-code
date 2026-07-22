import React from 'react';
import styles from '@/styles/components/arterialAnalysisForm.module.css';

interface ArterialAnalysisFormProps {
  onSave: (data: any) => void;
}

const ArterialAnalysisForm = ({ onSave }: ArterialAnalysisFormProps) => {
  const fields = [
    [
      { id: 'ph', label: 'pH' },
      { id: 'pco2', label: 'pCO2' }
    ],
    [
      { id: 'po2', label: 'pO2' },
      { id: 'hematocritHct', label: 'Hematocrit Hct' }
    ],
    [
      { id: 'ck', label: 'cK' },
      { id: 'cna', label: 'cNa' }
    ],
    [
      { id: 'cca2', label: 'cCa2+' },
      { id: 'ccl', label: 'cCl' }
    ],
    [
      { id: 'gluc', label: 'GLuc' },
      { id: 'chlac', label: 'cHLac' }
    ],
    [
      { id: 'chco3', label: 'cHCO3' },
      { id: 'cbase', label: 'cBase' }
    ],
    [
      { id: 'anionGap', label: 'Anion Gap' },
      { id: 'so2e', label: 'sO2e' }
    ]
  ];

  const handleInputChange = (fieldId: string, value: string) => {
    // Handle input change
    // console.log(`${fieldId} changed to ${value}`);
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.section}>
        {/* <h3 className={styles.sectionTitle}>
          Arterial Blood Gas Analysis
          <button className={styles.expandButton}>-</button>
        </h3> */}
        <div className={styles.sectionContent}>
          {fields.map((row, rowIndex) => (
            <div key={rowIndex} className={styles.row}>
              {row.map((field) => (
                <div key={field.id} className={styles.field}>
                  <label htmlFor={field.id}>{field.label}</label>
                  <input
                    type="text"
                    id={field.id}
                    name={field.id}
                    className={styles.input}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* <div className={styles.actions}>
            <button className={styles.saveButton} onClick={() => onSave({})}>
              Save Changes
            </button>
            <button className={styles.resetButton}>
              Reset
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default ArterialAnalysisForm; 