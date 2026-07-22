'use client';

import React from 'react';
import styles from '@/styles/gcs.module.css';

export interface GCSData {
  values: {
    "Eye Opening": number | null;
    "Verbal Response": number | null;
    "Motor Response": number | null;
    "Right Pupil Size": string | null;
    "Right Pupil Reaction": string | null;
    "Left Pupil Size": string | null;
    "Left Pupil Reaction": string | null;
    "Sedation": boolean;
    "Pain": boolean;
    "RUL": string | null;
    "LUL": string | null;
    "LLL": string | null;
    "RLL": string | null;
    "Pupil Type": string | null;
  };
}

interface GCSFormProps {
  initialValues: GCSData;
  isViewMode?: boolean;
  time: string;
  onSubmit: (time: string, values: GCSData) => void | Promise<void>;
}

const GCSForm: React.FC<GCSFormProps> = ({
  initialValues,
  isViewMode = false,
  time,
  onSubmit,
}) => {
  const [formValues, setFormValues] = React.useState<GCSData>(initialValues);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleInputChange = (field: keyof GCSData['values'], value: string | number | boolean | null) => {
    setFormValues(prev => ({
      values: {
        ...prev.values,
        [field]: value === "" ? null : value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(time, formValues);
    } catch (error) {
      console.error('Error submitting GCS data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalScore = () => {
    const { "Eye Opening": e, "Verbal Response": v, "Motor Response": m } = formValues.values;
    if (e === null || v === null || m === null) return "-";
    // If Verbal Response is 6 (Intubated), treat it as 1 for GCS calculation
    const verbalScore = v === 6 ? 1 : v;
    return e + verbalScore + m;
  };

  // Helper function to get display value for Verbal Response
  const getVerbalResponseDisplay = (value: number | null) => {
    if (value === null) return "-";
    if (value === 6) return "1";
    return value;
  };

  if (isViewMode) {
    return (
      <div className={styles.gcsViewContainer}>
        <div className={styles.gcsSection}>
          <h3>GCS</h3>
          <div className={styles.gcsRow}>
            <div className={styles.gcsItem}>
              <label>Eye Opening (E):</label>
              <span>{formValues.values["Eye Opening"] ?? "-"}</span>
            </div>
            <div className={styles.gcsItem}>
              <label>Verbal Response (V):</label>
              <span>{getVerbalResponseDisplay(formValues.values["Verbal Response"])}</span>
            </div>
            <div className={styles.gcsItem}>
              <label>Motor Response (M):</label>
              <span>{formValues.values["Motor Response"] ?? "-"}</span>
            </div>
            <div className={styles.gcsItem}>
              <label>GCS SCORE:</label>
              <span>{calculateTotalScore()}</span>
            </div>
          </div>
        </div>

        <div className={styles.gcsSection}>
          <h3>CNS: Pupils</h3>
          <div className={styles.gcsRow}>
            <div className={styles.gcsItem}>
              <label>Right Pupil Size:</label>
              <span>{formValues.values["Right Pupil Size"] ?? "-"}</span>
            </div>
            <div className={styles.gcsItem}>
              <label>Right Pupil Reaction:</label>
              <span>{formValues.values["Right Pupil Reaction"] ?? "-"}</span>
            </div>
            <div className={styles.gcsItem}>
              <label>Left Pupil Size:</label>
              <span>{formValues.values["Left Pupil Size"] ?? "-"}</span>
            </div>
            <div className={styles.gcsItem}>
              <label>Left Pupil Reaction:</label>
              <span>{formValues.values["Left Pupil Reaction"] ?? "-"}</span>
            </div>
            {/* <div className={styles.gcsItem}>
              <label>Pupil Type:</label>
              <span>{formValues.values["Pupil Type"] ?? "-"}</span>
            </div> */}
          </div>
        </div>

        <div className={styles.gcsSection}>
          <h3>Lung Fields</h3>
          <div className={styles.gcsRow}>
            <div className={styles.gcsItem}>
              <label>RUL:</label>
              <span>{formValues.values["RUL"] ?? "-"}</span>
            </div>
            <div className={styles.gcsItem}>
              <label>LUL:</label>
              <span>{formValues.values["LUL"] ?? "-"}</span>
            </div>
            <div className={styles.gcsItem}>
              <label>LLL:</label>
              <span>{formValues.values["LLL"] ?? "-"}</span>
            </div>
            <div className={styles.gcsItem}>
              <label>RLL:</label>
              <span>{formValues.values["RLL"] ?? "-"}</span>
            </div>
          </div>
        </div>

        <div className={styles.gcsSection}>
          <h3>Status</h3>
          <div className={styles.gcsRow}>
            <div className={styles.gcsItem}>
              <label>Sedation:</label>
              <span>{formValues.values["Sedation"] ? "Yes" : "No"}</span>
            </div>
            <div className={styles.gcsItem}>
              <label>Pain:</label>
              <span>{formValues.values["Pain"] ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.gcsForm}>
      <div className={styles.gcsEditSection}>
        <h3>GCS</h3>
        <div className={styles.gcsEditGrid}>
          <div className={styles.gcsEditItem}>
            <label>Eye Opening (E):</label>
            <select
              value={formValues.values["Eye Opening"] ?? ""}
              onChange={(e) => handleInputChange("Eye Opening", e.target.value ? parseInt(e.target.value) : null)}
              className={styles.select}
            >
              <option value="">Select Eye Opening</option>
              <option value="4">4 - Spontaneous</option>
              <option value="3">3 - To Voice</option>
              <option value="2">2 - To Pain</option>
              <option value="1">1 - None</option>
            </select>
          </div>

          <div className={styles.gcsEditItem}>
            <label>Verbal Response (V):</label>
            <select
              value={formValues.values["Verbal Response"] ?? ""}
              onChange={(e) => handleInputChange("Verbal Response", e.target.value ? parseInt(e.target.value) : null)}
              className={styles.select}
            >
              <option value="">Select Verbal Response</option>
              <option value="5">5 - Oriented</option>
              <option value="4">4 - Confused</option>
              <option value="3">3 - Inappropriate Words</option>
              <option value="2">2 - Incomprehensible Sounds</option>
              <option value="1">1 - None</option>
              <option value="6">1 - Intubated</option>
            </select>
          </div>

          <div className={styles.gcsEditItem}>
            <label>Motor Response (M):</label>
            <select
              value={formValues.values["Motor Response"] ?? ""}
              onChange={(e) => handleInputChange("Motor Response", e.target.value ? parseInt(e.target.value) : null)}
              className={styles.select}
            >
              <option value="">Select Motor Response</option>
              <option value="6">6 - Obeys Commands</option>
              <option value="5">5 - Localizes Pain</option>
              <option value="4">4 - Withdraws from Pain</option>
              <option value="3">3 - Flexion to Pain</option>
              <option value="2">2 - Extension to Pain</option>
              <option value="1">1 - None</option>
            </select>
          </div>

          <div className={styles.gcsEditItem}>
            <label>GCS SCORE</label>
            <span className={styles.gcsScore}>{calculateTotalScore()}</span>
          </div>
        </div>
      </div>

      <div className={styles.gcsEditSection}>
        <h3>CNS: Pupils</h3>
        <div className={styles.gcsEditGrid}>
          <div className={styles.gcsEditItem}>
            <label>Right Pupil Size:</label>
            <select
              value={formValues.values["Right Pupil Size"] ?? ""}
              onChange={(e) => handleInputChange("Right Pupil Size", e.target.value)}
              className={styles.select}
            >
              <option value="">Select right pupil size</option>
              {["1mm","2mm", "3mm", "4mm", "5mm", "6mm", "7mm", "8mm"].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <div className={styles.gcsEditItem}>
            <label>Right Pupil Reaction:</label>
            <select
              value={formValues.values["Right Pupil Reaction"] ?? ""}
              onChange={(e) => handleInputChange("Right Pupil Reaction", e.target.value)}
              className={styles.select}
            >
              <option value="">Select right pupil reaction</option>
              {["Normal", "Sluggish", "Non-reactive"].map(reaction => (
                <option key={reaction} value={reaction}>{reaction}</option>
              ))}
            </select>
          </div>

          <div className={styles.gcsEditItem}>
            <label>Left Pupil Size:</label>
            <select
              value={formValues.values["Left Pupil Size"] ?? ""}
              onChange={(e) => handleInputChange("Left Pupil Size", e.target.value)}
              className={styles.select}
            >
              <option value="">Select left pupil size</option>
              {["1mm","2mm", "3mm", "4mm", "5mm", "6mm", "7mm", "8mm"].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <div className={styles.gcsEditItem}>
            <label>Left Pupil Reaction:</label>
            <select
              value={formValues.values["Left Pupil Reaction"] ?? ""}
              onChange={(e) => handleInputChange("Left Pupil Reaction", e.target.value)}
              className={styles.select}
            >
              <option value="">Select left pupil reaction</option>
              {["Normal", "Sluggish", "Non-reactive"].map(reaction => (
                <option key={reaction} value={reaction}>{reaction}</option>
              ))}
            </select>
          </div>


          {/* <div className={styles.gcsEditItem}>
            <label>Pupil Type:</label>
            <select
              value={formValues.values["Pupil Type"] ?? ""}
              onChange={(e) => handleInputChange("Pupil Type", e.target.value)}
              className={styles.select}
            >
              <option value="">Select Power</option>
              {["Normal", "Sluggish", "Non-reactive"].map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
             
            </select>
          </div> */}
        </div>
      </div>

      <div className={styles.gcsEditSection}>
        <h3>Lung Fields</h3>
        <div className={styles.gcsEditGrid}>
          <div className={styles.gcsEditItem}>
            <label>RUL:</label>
            <select
              value={formValues.values["RUL"] ?? ""}
              onChange={(e) => handleInputChange("RUL", e.target.value)}
              className={styles.select}
            >
              <option value="">Select RUL</option>
              {["1/5", "2/5", "3/5", "4/5", "5/5"].map(score => (
                <option key={score} value={score}>{score}</option>
              ))}
            </select>
          </div>

          <div className={styles.gcsEditItem}>
            <label>LUL:</label>
            <select
              value={formValues.values["LUL"] ?? ""}
              onChange={(e) => handleInputChange("LUL", e.target.value)}
              className={styles.select}
            >
              <option value="">Select LUL</option>
              {["1/5", "2/5", "3/5", "4/5", "5/5"].map(score => (
                <option key={score} value={score}>{score}</option>
              ))}
            </select>
          </div>

          <div className={styles.gcsEditItem}>
            <label>LLL:</label>
            <select
              value={formValues.values["LLL"] ?? ""}
              onChange={(e) => handleInputChange("LLL", e.target.value)}
              className={styles.select}
            >
              <option value="">Select LLL</option>
              {["1/5", "2/5", "3/5", "4/5", "5/5"].map(score => (
                <option key={score} value={score}>{score}</option>
              ))}
            </select>
          </div>

          <div className={styles.gcsEditItem}>
            <label>RLL:</label>
            <select
              value={formValues.values["RLL"] ?? ""}
              onChange={(e) => handleInputChange("RLL", e.target.value)}
              className={styles.select}
            >
              <option value="">Select RLL</option>
              {["1/5", "2/5", "3/5", "4/5", "5/5"].map(score => (
                <option key={score} value={score}>{score}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.gcsEditSection}>
        <h3>Status</h3>
        <div className={styles.radioGroup}>
          <div className={styles.radioItem}>
            <label>Sedation</label>
            <div className={styles.radioOptions}>
              <label>
                <input
                  type="radio"
                  checked={formValues.values["Sedation"] === true}
                  onChange={() => handleInputChange("Sedation", true)}
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  checked={formValues.values["Sedation"] === false}
                  onChange={() => handleInputChange("Sedation", false)}
                />
                No
              </label>
            </div>
          </div>

          <div className={styles.radioItem}>
            <label>Pain</label>
            <div className={styles.radioOptions}>
              <label>
                <input
                  type="radio"
                  checked={formValues.values["Pain"] === true}
                  onChange={() => handleInputChange("Pain", true)}
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  checked={formValues.values["Pain"] === false}
                  onChange={() => handleInputChange("Pain", false)}
                />
                No
              </label>
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

export default GCSForm; 