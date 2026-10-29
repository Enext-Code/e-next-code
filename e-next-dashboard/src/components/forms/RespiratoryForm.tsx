'use client';

import React from 'react';
import styles from '@/styles/respiratory.module.css';
import { Fio2Unit, displayStoredFio2, formatFio2ForSave, parseStoredFio2 } from '@/components/forms/fio2Value';

export interface RespiratoryData {
  values: {
    "Vent Mode": string | null;
    "Rate": number | null;
    "FiO2": number | string | null;
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

const Fio2FieldLabel = ({ unit }: { unit: Fio2Unit }) => (
  unit === "O2" ? <>O<sub>2</sub></> : <>FiO<sub>2</sub></>
);

const RespiratoryForm: React.FC<RespiratoryFormProps> = ({
  initialValues,
  isViewMode = false,
  time,
  onSubmit,
}) => {
  const [formValues, setFormValues] = React.useState<RespiratoryData>(initialValues);
  const [isLoading, setIsLoading] = React.useState(false);
  const initialFio2 = parseStoredFio2(initialValues?.values?.["FiO2"]);
  const [fio2Unit, setFio2Unit] = React.useState<Fio2Unit>(initialFio2.unit);
  const [fio2Amount, setFio2Amount] = React.useState(initialFio2.amount);
  const incomingKey = JSON.stringify(initialValues?.values ?? null);

  React.useEffect(() => {
    setFormValues(initialValues);
    const parsed = parseStoredFio2(initialValues?.values?.["FiO2"]);
    setFio2Unit(parsed.unit);
    setFio2Amount(parsed.amount);
  }, [incomingKey]);

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
      await onSubmit(time, {
        ...formValues,
        values: {
          ...formValues.values,
          FiO2: formatFio2ForSave(fio2Unit, fio2Amount),
        },
      });
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
        <div className={styles.section}>
          <div className={styles.row}>
            <label>Type:</label>
            <span>{formValues.values.Type ?? "-"}</span>
          </div>
        </div>

        {isOxygen && (
          <div className={styles.section}>
            <div className={styles.row}>
              <label>Oxygen Device:</label>
              <span>{formValues.values["Oxygen Device"] ?? "-"}</span>
            </div>
            <div className={styles.row}>
              <label>Oxygen Flow:</label>
              <span>{formValues.values["Oxygen Flow"] ?? "-"}</span>
            </div>
          </div>
        )}

        {isVentilator && (
          <>
            {Object.entries(RESPIRATORY_SECTIONS).map(([sectionKey, section]) => (
              <div key={sectionKey} className={styles.section}>
                <div className={styles.sectionTitle}>{section.title}</div>
                {section.parameters.map((param) => (
                  <div key={param.name} className={styles.row}>
                    <label>{param.name === "FiO2" ? <Fio2FieldLabel unit={parseStoredFio2(initialValues?.values?.["FiO2"]).unit} /> : param.name}:</label>
                    <span>{param.name === "FiO2" ? displayStoredFio2(initialValues?.values?.["FiO2"]) : (formValues.values[param.name as keyof RespiratoryData['values']] ?? "-")}</span>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Remarks</div>
          <div className={styles.row}>
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
                  {section.parameters.map((param) => param.name === "FiO2" ? (
                    <div key={param.name} className={styles.formGroup}>
                      <label><Fio2FieldLabel unit={fio2Unit} /></label>
                      <div className={styles.fio2Row}>
                        <select
                          value={fio2Unit}
                          onChange={(e) => setFio2Unit(e.target.value as Fio2Unit)}
                          className={`${styles.input} ${styles.fio2Unit}`}
                        >
                          <option value="FiO2">FiO₂</option>
                          <option value="O2">O₂</option>
                        </select>
                        <input
                          type="number"
                          value={fio2Amount}
                          onChange={(e) => setFio2Amount(e.target.value)}
                          placeholder={param.placeholder}
                          className={`${styles.input} ${styles.fio2Amount}`}
                        />
                        <span className={styles.unitSuffix}>{fio2Unit === "O2" ? "Litre" : "%"}</span>
                      </div>
                    </div>
                  ) : (
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