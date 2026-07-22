import React from 'react';
import { useRouter } from 'next/navigation';
import EditButton from '@/components/common/EditButton';
import styles from '@/styles/patienthistory.module.css';

interface HistoryData {
  initial_treatment: string;
  presenting_complaints: Array<{
    serial_number: number;
    complaint: string;
  }>;
  current_medications: Array<{
    serial_number: number;
    medication: string;
  }>;
  food_allergies: string[];
  drug_allergies: string[];
  personal_hz: string[];
  personal_hz_others: string;
  medical_history: string[];
  medical_history_others: string;
  bp: string;
  hr: number;
  rr: number;
  spo2: string;
  temperature: number;
  rbs: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  history: HistoryData;
  patientId: string;
}

const PastMedicalHistoryTab = ({ history, patientId }: Props) => {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`/patients/${patientId}/history/edit/past-medical`);
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.tabHeader}>
        <h2>Past Medical History</h2>
        <EditButton onClick={handleEdit} />
      </div>

          <div className={styles.vitalItem}>
            <label>BP</label>
            <span>{history.bp}</span>
          </div>
          <div className={styles.vitalItem}>
            <label>HR</label>
            <span>{history.hr} bpm</span>
          </div>
          <div className={styles.vitalItem}>
            <label>RR</label>
            <span>{history.rr} /min</span>
          </div>
          <div className={styles.vitalItem}>
            <label>SpO2</label>
            <span>{history.spo2}</span>
          </div>
          <div className={styles.vitalItem}>
            <label>Temperature</label>
            <span>{history.temperature}°F</span>
          </div>
          <div className={styles.vitalItem}>
            <label>RBS</label>
            <span>{history.rbs} mg/dL</span>
          </div>
          <div className={styles.vitalItem}>
            <label>Personal History</label>
            <div>
          {history.personal_hz.map((item, index) => (
            <span key={index} className={styles.tag}>{item}</span>
          ))}
          {history.personal_hz_others && (
            <span className={styles.tag}>{history.personal_hz_others}</span>
          )}
          </div>
        </div>
        <div className={styles.vitalItem}>
          <label>Medical History</label>
          <div>
          {history.medical_history.map((item, index) => (
            <span key={index} className={styles.tag}>{item}</span>
          ))}
          {history.medical_history_others && (
            <span className={styles.tag}>{history.medical_history_others}</span>
          )}
          </div>
      </div>
      <div className={styles.vitalItem}>
        <label>Drug Allergies</label>
            <div className={styles.tagContainer}>
              <div>
              {history.drug_allergies.map((allergy, index) => (
                <span key={index} className={styles.tag}>{allergy}</span>
              ))}
            </div>
            </div>
      </div>
      <div className={styles.vitalItem}>
        <label>Food Allergies</label>
            <div className={styles.tagContainer}>
              <div>
              {history.food_allergies.map((allergy, index) => (
                <span key={index} className={styles.tag}>{allergy}</span>
              ))}
            </div>
            </div>
      </div>
      
      <div className={styles.section}>
        <h3>Initial Treatment</h3>
        <div className={styles.textContent}>
          {history.initial_treatment || '—'}
        </div>
      </div>

      <div className={styles.section}>
        <h3>Presenting Complaints</h3>
        <div className={styles.listGrid}>
          {history.presenting_complaints.map((item) => (
            <div key={item.serial_number} className={styles.listItem}>
              <span className={styles.serialNumber}>{item.serial_number}.</span>
              <span>{item.complaint}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3>Current Medications</h3>
        <div className={styles.listGrid}>
          {history.current_medications.map((item) => (
            <div key={item.serial_number} className={styles.listItem}>
              <span className={styles.serialNumber}>{item.serial_number}.</span>
              <span>{item.medication}</span>
            </div>
          ))}
        </div>
      </div>

      {/* <div className={styles.timestamps}>
        <p>Created: {new Date(history.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })}</p>
        <p>Last Updated: {new Date(history.updated_at).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })}</p>
      </div> */}
    </div>
  );
};

export default PastMedicalHistoryTab; 