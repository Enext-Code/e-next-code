import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import EditButton from '@/components/common/EditButton';
import styles from '@/styles/history-page-style/patient-history-investigation.module.css';


const bloodAnalysisTests = [
  "Haemoglobin",
  "TLC",
  "PCV",
  "Platelet",
  "CBC",
  "B. Urea",
  "S. Creatinine",
  "Sodium",
  "Potassium",
  "Chloride",
  "Bicarbonate",
  "Ammonia",
  "Total Protein",
  "Albumin",
  "Bilirubin (T)",
  "Bilirubin (D)",
  "SGPT/ALT",
  "SGOT/AST",
  "ALP",
  "GGT",
  "S. Uric Acid",
  "S. Phosphorus",
  "Calcium",
  "Magnesium",
  "CPK",
  "CK MB",
  "TROP I",
  "PT",
  "INR",
  "APTT",
  "TSH",
  "T3",
  "T4",
  "Procalcitonin",
  "BUN",
  "Pro BUN",
  "C-Reactive Protein",
  "Urine R/M",
  "ABG",
  "CSF BioChemistory"
];

// Microbiology Tests
const microbiologyTests = [
  'Blood C/S', 'ET C/S', 'ET-Gram Stain', 'Urine C/S', 'CSF-Gram Stain' , 'CSF Culture'
];

// Radiology Types and Subtypes
const radiologyTypes = {
  'X-Ray': [
    'Chest PA', 'Chest AP', 'Chest Lateral', 'Abdomen AP', 'KUB'
  ],
  'CT Scan': [
    'Head',
    'Head-Contrast',
    'Neck',
    'Neck-Contrast',
    'Thorax',
    'Thorax-Contrast',
    'Abdomen',
    'Abdomen-Contrast',
    'Whole Body',
    'KUB',
    'KUB-Contrast'
  ],
  'MRI': [
    'Head',
    'Head-Contrast',
    'Neck',
    'Neck-Contrast',
    'Thorax',
    'Thorax-Contrast',
    'Abdomen',
    'Abdomen-Contrast',
    'Whole Body',
    'KUB',
    'KUB-Contrast'
  ],
  'Ultrasound': [
    'Whole Abdomen', 'KUB' , 'Venous Doppler' , 'Arterial Doppler'
  ],
  'ECG': [],
  '2D Echo': [],
  'Endoscopy': [],
  'Colonoscopy': []
};

const arterialAnalysisTests = [
  "pH",
  "pCO2",
  "pO2",
  "Hcl",
  "K+",
  "Na+",
  "Ca2+",
  "Cl-",
  "Lac",
  "Hbc",
  "HCO3-(P)c",
  "Base (B)c",
  "Anion Gapc",
  "sO2e"
];


interface RadiologyType {
  type: string;
  subtypes: string[];
}

interface InvestigationData {
  blood_analysis: string[];
  radiology: RadiologyType[];
  microbiology: string[];
  arterial_analysis: string[];
  created_at: string;
  updated_at: string;
}

interface Props {
  investigation: InvestigationData;
  patientId: string;
}

const InvestigationTab = ({ investigation, patientId }: Props) => {
  const router = useRouter();
  const [isBloodAnalysisExpanded, setIsBloodAnalysisExpanded] = useState(false);
  const [isRadiologyExpanded, setIsRadiologyExpanded] = useState(false);
  const [isMicrobiologyExpanded, setIsMicrobiologyExpanded] = useState(false);
  const [isArterialAnalysisExpanded, setIsArterialAnalysisExpanded] = useState(false);
  
  const handleEdit = () => {
    router.push(`/patients/${patientId}/history/edit/investigation`);
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.tabHeader}>
        <h2>Investigation Details</h2>
        <EditButton onClick={handleEdit} />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader} onClick={() => setIsBloodAnalysisExpanded(!isBloodAnalysisExpanded)}>
          <h3>Blood Analysis</h3>
          <button className={`${styles.expandButton} ${isBloodAnalysisExpanded ? styles.expanded : ''}`}>
            {isBloodAnalysisExpanded ? '-' : '+'}
          </button>
        </div>
        {isBloodAnalysisExpanded && (
          <div className={styles.checkboxGrid}>
            {bloodAnalysisTests.map((test, index) => (
              <div key={index} className={styles.checkboxItem}>
                <input 
                  type="checkbox" 
                  id={`blood-${index}`} 
                  checked={investigation.blood_analysis.includes(test)}
                  readOnly 
                />
                <label htmlFor={`blood-${index}`}>{test}</label>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader} onClick={() => setIsRadiologyExpanded(!isRadiologyExpanded)}>
          <h3>Radiology</h3>
          <button className={`${styles.expandButton} ${isRadiologyExpanded ? styles.expanded : ''}`}>
            {isRadiologyExpanded ? '-' : '+'}
          </button>
        </div>
        {isRadiologyExpanded && (
          <div className={styles.radiologyGrid}>
            {Object.entries(radiologyTypes).map(([type, subtypes], typeIndex) => (
              <div key={typeIndex} className={styles.radiologySection}>
                <div className={styles.radiologyType}>
                  <input 
                    type="checkbox" 
                    id={`rad-${typeIndex}`} 
                    checked={investigation.radiology.some(r => r.type === type)}
                    readOnly 
                  />
                  <label htmlFor={`rad-${typeIndex}`}>{type}</label>
                </div>
                <div className={styles.subtypeGrid}>
                  {subtypes.map((subtype, subIndex) => {
                    const isChecked = investigation.radiology.some(
                      r => r.type === type && r.subtypes.includes(subtype)
                    );
                    return (
                      <div key={subIndex} className={styles.checkboxItem}>
                        <input 
                          type="checkbox" 
                          id={`subtype-${typeIndex}-${subIndex}`} 
                          checked={isChecked}
                          readOnly 
                        />
                        <label htmlFor={`subtype-${typeIndex}-${subIndex}`}>{subtype}</label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader} onClick={() => setIsMicrobiologyExpanded(!isMicrobiologyExpanded)}>
          <h3>Microbiology</h3>
          <button className={`${styles.expandButton} ${isMicrobiologyExpanded ? styles.expanded : ''}`}>
            {isMicrobiologyExpanded ? '-' : '+'}
          </button>
        </div>
        {isMicrobiologyExpanded && (
          <div className={styles.checkboxGrid}>
            {microbiologyTests.map((test, index) => (
              <div key={index} className={styles.checkboxItem}>
                <input 
                  type="checkbox" 
                  id={`micro-${index}`} 
                  checked={investigation.microbiology.includes(test)}
                  readOnly 
                />
                <label htmlFor={`micro-${index}`}>{test}</label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* <div className={styles.section}>
        <div className={styles.sectionHeader} onClick={() => setIsArterialAnalysisExpanded(!isArterialAnalysisExpanded)}>
          <h3>Arterial Analysis</h3>
          <button className={`${styles.expandButton} ${isArterialAnalysisExpanded ? styles.expanded : ''}`}>
            {isArterialAnalysisExpanded ? '-' : '+'}
          </button>
        </div>
        {isArterialAnalysisExpanded && (
          <div className={styles.checkboxGrid}>
            {arterialAnalysisTests.map((test, index) => (
              <div key={index} className={styles.checkboxItem}>
                <input 
                  type="checkbox" 
                  id={`arterial-${index}`} 
                  checked={investigation.arterial_analysis.includes(test)}
                  readOnly 
                />
                <label htmlFor={`arterial-${index}`}>{test}</label>
              </div>
            ))}
          </div>
        )}
      </div> */}

      {/* <div className={styles.timestamps}>
        <p>Created: {new Date(investigation.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })}</p>
        <p>Last Updated: {new Date(investigation.updated_at).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })}</p>
      </div> */}
    </div>
  );
};

export default InvestigationTab; 