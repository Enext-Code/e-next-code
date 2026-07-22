import React from 'react';
import styles from '@/styles/components/bloodAnalysisForm.module.css';

interface BloodAnalysisFormProps {
  onSave: (data: any) => void;
}

const BloodAnalysisForm = ({ onSave }: BloodAnalysisFormProps) => {
  return (
    <div className={styles.formContainer}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Haematology
          <button className={styles.expandButton}>-</button>
        </h3>
        <div className={styles.sectionContent}>
          <h4>Complete Blood Count (CBC)</h4>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>Hemoglobin</label>
              <input type="text" name="hemoglobin" />
            </div>
            <div className={styles.inputGroup}>
              <label>Red Blood Cell (RBC)</label>
              <input type="text" name="rbc" />
            </div>
            <div className={styles.inputGroup}>
              <label>Hematocrit (PCV)</label>
              <input type="text" name="hematocrit" />
            </div>
            <div className={styles.inputGroup}>
              <label>Mean Corpuscular Volume (MCV)</label>
              <input type="text" name="mcv" />
            </div>
            <div className={styles.inputGroup}>
              <label>Mean Corpuscular Hemoglobin (MCH)</label>
              <input type="text" name="mch" />
            </div>
            <div className={styles.inputGroup}>
              <label>Mean Corpuscular Hemoglobin Concentration(MCHC)</label>
              <input type="text" name="mchc" />
            </div>
            <div className={styles.inputGroup}>
              <label>Mean Platelet Volume (MPV)</label>
              <input type="text" name="mpv" />
            </div>
            <div className={styles.inputGroup}>
              <label>Platelet Count</label>
              <input type="text" name="plateletCount" />
            </div>
          </div>

          <h4>TLC</h4>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>White Blood Cell (WBC) Count</label>
              <input type="text" name="wbc" />
            </div>
            <div className={styles.inputGroup}>
              <label>Neutrophils</label>
              <input type="text" name="neutrophils" />
            </div>
            <div className={styles.inputGroup}>
              <label>Lymphocytes</label>
              <input type="text" name="lymphocytes" />
            </div>
            <div className={styles.inputGroup}>
              <label>Monocytes</label>
              <input type="text" name="monocytes" />
            </div>
            <div className={styles.inputGroup}>
              <label>Eosinophils</label>
              <input type="text" name="eosinophils" />
            </div>
            <div className={styles.inputGroup}>
              <label>Basophils</label>
              <input type="text" name="basophils" />
            </div>
            <div className={styles.inputGroup}>
              <label>Absolute Neutrophil Count</label>
              <input type="text" name="absoluteNeutrophilCount" />
            </div>
            <div className={styles.inputGroup}>
              <label>Absolute Lymphocyte Count</label>
              <input type="text" name="absoluteLymphocyteCount" />
            </div>
            <div className={styles.inputGroup}>
              <label>Absolute Monocyte Count</label>
              <input type="text" name="absoluteMonocyteCount" />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Liver Function Test (LFT)
          <button className={styles.expandButton}>-</button>
        </h3>
        <div className={styles.sectionContent}>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>PT</label>
              <input type="text" name="pt" />
            </div>
            <div className={styles.inputGroup}>
              <label>INR</label>
              <input type="text" name="inr" />
            </div>
            <div className={styles.inputGroup}>
              <label>APTT</label>
              <input type="text" name="aptt" />
            </div>
            <div className={styles.inputGroup}>
              <label>Ammonia</label>
              <input type="text" name="ammonia" />
            </div>
            <div className={styles.inputGroup}>
              <label>Total Protein</label>
              <input type="text" name="totalProtein" />
            </div>
            <div className={styles.inputGroup}>
              <label>Albumin</label>
              <input type="text" name="albumin" />
            </div>
            <div className={styles.inputGroup}>
              <label>Bilirubin (T)</label>
              <input type="text" name="bilirubinT" />
            </div>
            <div className={styles.inputGroup}>
              <label>Bilirubin (D)</label>
              <input type="text" name="bilirubinD" />
            </div>
            <div className={styles.inputGroup}>
              <label>SGPT/ALT</label>
              <input type="text" name="sgptAlt" />
            </div>
            <div className={styles.inputGroup}>
              <label>ALP</label>
              <input type="text" name="alp" />
            </div>
            <div className={styles.inputGroup}>
              <label>GGT</label>
              <input type="text" name="ggt" />
            </div>
            <div className={styles.inputGroup}>
              <label>S. Uric Acid</label>
              <input type="text" name="sUricAcid" />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Renal Function Test (RFT)
          <button className={styles.expandButton}>+</button>
        </h3>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Electrolyte
          <button className={styles.expandButton}>+</button>
        </h3>
      </div>
    </div>
  );
};

export default BloodAnalysisForm; 