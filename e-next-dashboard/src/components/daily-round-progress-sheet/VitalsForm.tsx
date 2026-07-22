'use client';

import React from 'react';
import styles from './vitals.module.css';

export interface VitalsData {
  values: {
    "Heart Rate": number | null;
    "Rythm": string | null;
    "Temp Oral": number | null;
    "CVP": number | null;
    "RBS": number | null;
    "Systolic": number | null;
    "Diastolic": number | null;
    "SpO2": number | null;
  };
}

interface VitalsFormProps {
  initialValues: VitalsData;
  isViewMode?: boolean;
  time: string;
  onSubmit: (time: string, values: VitalsData) => void | Promise<void>;
}

const VitalsForm: React.FC<VitalsFormProps> = ({
  initialValues,
  isViewMode = false,
  time,
  onSubmit,
}) => {
  const [formValues, setFormValues] = React.useState<VitalsData>(initialValues);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleInputChange = (field: keyof VitalsData['values'], value: string) => {
    setFormValues(prev => ({
      values: {
        ...prev.values,
        [field]: value === "" ? null : (field === "Rythm" ? value : parseFloat(value))
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(time, formValues);
    } catch (error) {
      console.error('Error submitting vitals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMAP = (): number | null => {
    const systolic = formValues.values["Systolic"];
    const diastolic = formValues.values["Diastolic"];
    if (systolic !== null && diastolic !== null) {
      return Math.round(((systolic + 2 * diastolic) / 3) * 10) / 10; // Round to 1 decimal place
    }
    return null;
  };

  if (isViewMode) {
    return (
      <div className={styles.viewContainer}>
        <div className={styles.section}>
          <div className={styles.row}>
            <label style={{fontWeight: "bold"}}>Cardiac</label>
          </div>
          <div className={styles.row}>
            <label>Heart Rate:</label>
            <span>{formValues.values["Heart Rate"] ?? "-"} {formValues.values["Heart Rate"] !== null && "BPM"}</span>
          </div>
          <div className={styles.row}>
            <label>Rythm:</label>
            <span>{formValues.values["Rythm"] ?? "-"}</span>
          </div>
          {/* <div className={styles.row}>
            <label>CVP:</label>
            <span>{formValues.values["CVP"] ?? "-"} {formValues.values["CVP"] !== null && "mmHg"}</span>
          </div> */}
          <div className={styles.row}>
            <label>Temp (F) (Oral):</label>
            <span>{formValues.values["Temp Oral"] ?? "-"} {formValues.values["Temp Oral"] !== null && "°F"}</span>
          </div>
          <div className={styles.row}>
            <label>RBS:</label>
            <span>{formValues.values["RBS"] ?? "-"} {formValues.values["RBS"] !== null && "mmHg"}</span>
          </div>
          <div className={styles.row}>
            <label>SpO2:</label>
            <span>{formValues.values["SpO2"] ?? "-"} {formValues.values["SpO2"] !== null && "%"}</span>
          </div>
        </div>


        <div className={styles.section}>
          <div className={styles.row}>
            <label style={{fontWeight: "bold"}}>Blood Pressure</label>
          </div>
          <div className={styles.row}>
            <label>Systolic:</label>
            <span>{formValues.values["Systolic"] ?? "-"} {formValues.values["Systolic"] !== null && "mmHg"}</span>
          </div>
          <div className={styles.row}>
            <label>Diastolic:</label>
            <span>{formValues.values["Diastolic"] ?? "-"} {formValues.values["Diastolic"] !== null && "mmHg"}</span>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.row}>
            <label style={{fontWeight: "bold"}}>MAP Score</label>
          </div>
          <div className={styles.row}>
            <label>MAP:</label>
            <span>{calculateMAP() ?? "-"} {calculateMAP() !== null}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.vitalsForm}>
      <div className={styles.formGrid}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Cardiac</div>
          <div className={styles.inputGroup}>
            <div className={styles.formGroup}>
              <label>Heart Rate</label>
              <input
                type="number"
                value={formValues.values["Heart Rate"] ?? ""}
                onChange={(e) => handleInputChange("Heart Rate", e.target.value)}
                placeholder="103"
                className={styles.input}
                min="40"
                max="250"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Rythm</label>
              <select
                value={formValues.values["Rythm"] ?? ""}
                onChange={(e) => handleInputChange("Rythm", e.target.value)}
                className={styles.input}
              >
                <option value="">--</option>
                <option value="SINUS">SINUS</option>
                <option value="VT">VT</option>
                <option value="VF">VF</option>
                <option value="AFIBRILLATION">AFIBRILLATION</option>
                <option value="A FLUTTER">A FLUTTER</option>
                <option value="Bradycardia Sinus">Bradycardia Sinus</option>
                <option value="1° AV Block">1° AV Block</option>
                <option value="2° AV Block">2° AV Block</option>
                <option value="3° AV Block">3° AV Block</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Temp (F) (Oral):</label>
            <input
              type="number"
              value={formValues.values["Temp Oral"] ?? ""}
              onChange={(e) => handleInputChange("Temp Oral", e.target.value)}
              placeholder="--"
              className={styles.input}
              min="93"
              max="110"
              step="0.1"
            />
          </div>

          {/* <div className={styles.formGroup}>
            <label>CVP</label>
            <input
              type="number"
              value={formValues.values["CVP"] ?? ""}
              onChange={(e) => handleInputChange("CVP", e.target.value)}
              placeholder="0"
              className={styles.input}
            />
          </div> */}
          <div className={styles.formGroup}>
            <label>RBS:</label>
            <input
              type="number"
              value={formValues.values["RBS"] ?? ""}
              onChange={(e) => handleInputChange("RBS", e.target.value)}
              placeholder="106"
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label>SpO2:</label>
            <input
              type="number"
              value={formValues.values["SpO2"] ?? ""}
              onChange={(e) => handleInputChange("SpO2", e.target.value)}
              placeholder="106"
              className={styles.input}
              min="40"
              max="250"
            />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Blood Pressure</div>
          <div className={styles.inputGroup}>
            <div className={styles.formGroup}>
              <label>Systolic:</label>
              <input
                type="number"
                value={formValues.values["Systolic"] ?? ""}
                onChange={(e) => handleInputChange("Systolic", e.target.value)}
                placeholder="80"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Diastolic:</label>
              <input
                type="number"
                value={formValues.values["Diastolic"] ?? ""}
                onChange={(e) => handleInputChange("Diastolic", e.target.value)}
                placeholder="120"
                className={styles.input}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>MAP Score</div>
          <div className={styles.formGroup}>
            <label>MAP:</label>
            <div className={`${styles.input} ${styles.readOnlyInput}`}>
            {calculateMAP() ?? "-"} {calculateMAP() !== null }
              {/* {calculateMAP() ?? "-"} {calculateMAP() !== null && "mmHg"} */}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.formActions}>
        <button 
          type="submit" 
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading && <div className={styles.loadingSpinner}></div>}
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default VitalsForm; 