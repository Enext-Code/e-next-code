'use client';

import React from 'react';
import styles from './RespiratoryForm.module.css';

export interface RespiratoryData {
  values: {
    "Vent Mode": string | null;
    "Rate": number | null;
    "FiO2": number | null;
    "PEEP": number | null;
    "Set": number | null;
    "Dalta P (P Plat PEEP)": number | null;
    "AW Pressure": number | null;
    "Ins %": number | null;
    "Peak Pressure": number | null;
    "Plateau Pressure": number | null;
    "Remarks": string | null;
    "ETV": number | null; 
    "ITV": number | null;
    "Type": string | null;
    "Oxygen Device": string | null;
    "Oxygen Flow": number | null;
  };
}

interface RespiratoryFormProps {
  initialValues: RespiratoryData;
  isViewMode?: boolean;
  time: string;
  onSubmit: (time: string, values: RespiratoryData) => void | Promise<void>;
}

const RESPIRATORY_SECTIONS = {
  respiratory: {
    title: "Respiratory",
    parameters: [
      { name: "Vent Mode", type: "select", options: ["VCV", "PCV", "PS", "NIV"], placeholder: "-" },
      { name: "Rate", type: "number", placeholder: "-" },
      { name: "FiO2", type: "number", placeholder: "-" },
      { name: "PEEP", type: "number", placeholder: "-" },
      { name: "I PAP", type: "number", placeholder: "-" },
      { name: "E PAP", type: "number", placeholder: "-" }
    ]
  },
  mv: {
    title: "MV",
    parameters: [
      { name: "Set", type: "number", placeholder: "-" },
      { name: "Dalta P (P Plat PEEP)", type: "number", placeholder: "-" },
      { name: "AW Pressure", type: "number", placeholder: "-" },
      { name: "Ins %", type: "number", placeholder: "-" },
      { name: "Peak Pressure", type: "number", placeholder: "-" },
      { name: "Plateau Pressure", type: "number", placeholder: "-" },
      { name: "ETV", type: "number", placeholder: "-" },
      { name: "ITV", type: "number", placeholder: "-" }
    ]
  }
} as const;

const RespiratoryForm: React.FC<RespiratoryFormProps> = ({
  initialValues,
  isViewMode = false,
  time,
  onSubmit,
}) => {
  const [formValues, setFormValues] = React.useState<RespiratoryData>(initialValues);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleInputChange = (field: keyof RespiratoryData['values'], value: string) => {
    setFormValues(prev => ({
      values: {
        ...prev.values,
        [field]: field === "Vent Mode" || field === "Remarks" || field === "Type" || field === "Oxygen Device"
          ? (value || null)
          : value === "" ? null : parseFloat(value)
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(time, formValues);
    } catch (error) {
      console.error('Error submitting respiratory data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine which fields to show based on Type
  const isVentilator = formValues.values.Type === "Ventilator";
  const isOxygen = formValues.values.Type === "oxygen";

  if (isViewMode) {
    return (
      <div className={styles.viewContainer}>
        <div className={styles.topGrid}>
          {isVentilator ? (
            <>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Respiratory</h3>
                <div className={styles.row}>
                  <label>Type:</label>
                  <span>{formValues.values.Type ?? "-"}</span>
                </div>
                {RESPIRATORY_SECTIONS.respiratory.parameters.map((param) => (
                  <div key={param.name} className={styles.row}>
                    <label>{param.name}:</label>
                    <span>{formValues.values[param.name as keyof RespiratoryData['values']] ?? "-"}</span>
                  </div>
                ))}
              </div>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>MV</h3>
                {RESPIRATORY_SECTIONS.mv.parameters.map((param) => (
                  <div key={param.name} className={styles.row}>
                    <label>{param.name}:</label>
                    <span>{formValues.values[param.name as keyof RespiratoryData['values']] ?? "-"}</span>
                  </div>
                ))}
              </div>
            </>
          ) : isOxygen ? (
            <>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Type</h3>
                <div className={styles.row}>
                  <label>Type:</label>
                  <span>{formValues.values.Type ?? "-"}</span>
                </div>
              </div>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Oxygen</h3>
                <div className={styles.row}>
                  <label>Oxygen Device:</label>
                  <span>{formValues.values["Oxygen Device"] ?? "-"}</span>
                </div>
                <div className={styles.row}>
                  <label>Oxygen Flow:</label>
                  <span>{formValues.values["Oxygen Flow"] ?? "-"}</span>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Type</h3>
              <div className={styles.row}>
                <label>Type:</label>
                <span>{formValues.values.Type ?? "-"}</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Remarks</h3>
          <div className={styles.remarksRow}>
            <span>{formValues.values.Remarks ?? "-"}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.respiratoryForm}>
      <div className={styles.formGrid}>
        {/* Type Selection */}
        <div className={styles.section}>
          <div className={styles.formGroup}>
            <label>Type</label>
            <select
              value={formValues.values.Type ?? ""}
              onChange={(e) => handleInputChange("Type", e.target.value)}
              className={styles.input}
            >
              <option value="">Select Type</option>
              <option value="oxygen">Oxygen</option>
              <option value="Ventilator">Ventilator</option>
            </select>
          </div>
        </div>

        {/* Oxygen Device - Only show when type is oxygen */}
        {isOxygen && (
          <div className={styles.section}>
            <div className={styles.formGroup}>
              <label>Oxygen Device</label>
              <input
                type="text"
                value={formValues.values["Oxygen Device"] ?? ""}
                onChange={(e) => handleInputChange("Oxygen Device", e.target.value)}
                placeholder="Enter oxygen device"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Oxygen Flow per L/min</label>
              <input
                type="number"
                value={formValues.values["Oxygen Flow"] ?? ""}
                onChange={(e) => handleInputChange("Oxygen Flow", e.target.value)}
                placeholder="Enter oxygen flow per L/min"
                className={styles.input}
              />
            </div>
          </div>
        )}

        {/* Ventilator Fields - Only show when type is Ventilator */}
        {isVentilator && (
          <>
            {Object.entries(RESPIRATORY_SECTIONS).map(([sectionKey, section]) => (
              <div key={sectionKey} className={styles.section}>
                <div className={styles.sectionTitle}>{section.title}</div>
                <div className={styles.inputGroup}>
                  {section.parameters.map((param) => (
                    <div key={param.name} className={styles.formGroup}>
                      <label>{param.name}</label>
                      {param.type === "select" ? (
                        <select
                          value={formValues.values[param.name as keyof RespiratoryData['values']] ?? ""}
                          onChange={(e) => handleInputChange(param.name as keyof RespiratoryData['values'], e.target.value)}
                          className={styles.input}
                        >
                          <option value="">{param.placeholder}</option>
                          {param.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={param.type}
                          value={formValues.values[param.name as keyof RespiratoryData['values']] ?? ""}
                          onChange={(e) => handleInputChange(param.name as keyof RespiratoryData['values'], e.target.value)}
                          placeholder={param.placeholder}
                          className={styles.input}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Remarks - Always visible */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Remarks</div>
          <textarea
            value={formValues.values.Remarks ?? ""}
            onChange={(e) => handleInputChange("Remarks", e.target.value)}
            placeholder="XXXXXX"
            className={styles.remarksInput}
          />
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

export default RespiratoryForm; 