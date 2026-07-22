'use client';

import React from 'react';
import styles from '@/styles/bloodgas.module.css';

export interface BloodGasData {
  values: {
    "pH": number | null;
    "pO2": number | null;
    "CO2-P": number | null;
    "CO2-ET": number | null;
    "BE": number | null;
    "Sat %": number | null;
    "Lac": number | null;
    "K+": number | null;
    "Hb": number | null;
    "Glucose": number | null;
    "Insulin": number | null;
  };
}

interface BloodGasFormProps {
  initialValues: BloodGasData;
  isViewMode?: boolean;
  time: string;
  onSubmit: (time: string, values: BloodGasData) => void;
}

const BLOOD_GAS_SECTIONS = {
  bloodGases: {
    title: "Blood Gases",
    parameters: [
      { name: "pH", unit: "/mhr", type: "number", step: "0.1", placeholder: "-" },
      { name: "pO2", unit: "mmHg", type: "number", step: "1", placeholder: "-" },
      { name: "CO2-P", unit: "mmHg", type: "number", step: "1", placeholder: "-" },
      { name: "CO2-ET", unit: "mmHg", type: "number", step: "1", placeholder: "-" },
      { name: "BE", unit: "mEq/L", type: "number", step: "1", placeholder: "-" },
      { name: "Sat %", unit: "%", type: "number", step: "1", placeholder: "-" },
      { name: "Lac", unit: "mmol/L", type: "number", step: "0.1", placeholder: "-" },
      { name: "K+", unit: "mEq/L", type: "number", step: "0.1", placeholder: "-" },
      { name: "Hb", unit: "g/dL", type: "number", step: "0.1", placeholder: "-" },
      { name: "Glucose", unit: "mg/dL", type: "number", step: "1", placeholder: "-" }
    ]
  },
  other: {
    title: "Blood Gases",
    parameters: [
      { name: "Insulin", unit: "units", type: "number", step: "0.1", placeholder: "-" }
    ]
  }
} as const;

const BloodGasForm: React.FC<BloodGasFormProps> = ({
  initialValues,
  isViewMode = false,
  time,
  onSubmit,
}) => {
  const [formValues, setFormValues] = React.useState<BloodGasData>(initialValues);

  const handleInputChange = (field: keyof BloodGasData['values'], value: string) => {
    setFormValues(prev => ({
      values: {
        ...prev.values,
        [field]: value === "" ? null : parseFloat(value)
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(time, formValues);
  };

  if (isViewMode) {
    return (
      <div className={styles.viewContainer}>
        {Object.entries(BLOOD_GAS_SECTIONS).map(([sectionKey, section]) => (
          <div key={sectionKey} className={styles.section}>
            <div className={styles.sectionTitle}>{section.title}</div>
            {section.parameters.map((param) => (
              <div key={param.name} className={styles.row}>
                <label>{param.name}:</label>
                <span>
                  {formValues.values[param.name as keyof BloodGasData['values']] ?? "-"}
                  {formValues.values[param.name as keyof BloodGasData['values']] !== null && param.unit && ` ${param.unit}`}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.bloodGasForm}>
      <div className={styles.formGrid}>
        {Object.entries(BLOOD_GAS_SECTIONS).map(([sectionKey, section]) => (
          <div key={sectionKey} className={styles.section}>
            <div className={styles.sectionTitle}>{section.title}</div>
            <div className={styles.inputGroup}>
              {section.parameters.map((param) => (
                <div key={param.name} className={styles.formGroup}>
                  <label>{param.name}</label>
                  <input
                    type="number"
                    step={param.step || "1"}
                    value={formValues.values[param.name as keyof BloodGasData['values']] ?? ""}
                    onChange={(e) => handleInputChange(param.name as keyof BloodGasData['values'], e.target.value)}
                    placeholder={param.placeholder}
                    className={styles.input}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.submitButton}>
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default BloodGasForm; 