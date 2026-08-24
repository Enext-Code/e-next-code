import React from 'react';
import { useRouter } from 'next/navigation';
import EditButton from '@/components/common/EditButton';
import { PatientData } from '@/services/patientService';
import styles from '@/styles/history-page-style/patient-history-basic.module.css';

interface Props {
  patient: PatientData;
  patientId: string;
}

const BasicInfoTab = ({ patient, patientId }: Props) => {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`/patients/${patientId}/basic/edit`);
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.tabHeader}>
        <h2>Basic Information</h2>
        <EditButton onClick={handleEdit} />
      </div>

      <div className={styles.section}>
      <div className={styles.infoItem}>
            <label>Admission Date</label>
            <span>{new Date(patient.admission_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Name</label>
            <span>{`${patient.first_name} ${patient.last_name}`}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Age</label>
            <span>{patient.age} years</span>
          </div>
          <div className={styles.infoItem}>
            <label>Gender</label>
            <span>{patient.gender}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Height</label>
            <span>{patient.height ? `${patient.height} cm` : 'N/A'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Weight</label>
            <span>{patient.weight ? `${patient.weight} kg` : 'N/A'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>UID Number</label>
            <span>{patient.uid_number}</span>
          </div>
          <div className={styles.infoItem}>
            <label>IPID Number</label>
            <span>{patient.ipid_number}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Admission Time</label>
            <span>{patient.admission_time ? patient.admission_time.split('.')[0].replace('Z', '') : 'N/A'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Tele ICU Date</label>
            <span>{new Date(patient.tele_icu_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Tele ICU Time</label>
            <span>{patient.tele_icu_time ? patient.tele_icu_time.split('.')[0].replace('Z', '') : 'N/A'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>MLC/Non-MLC Number</label>
            <span>{patient.mlc_or_non_mlc_number}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Insurance</label>
            <span>{patient.insurance || '-'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>ICU Name</label>
            <span>{patient.organisation_icu_name}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Bed Number</label>
            <span>{patient.organisation_icu_bed_number}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Doctor</label>
            <span>{patient.doctor_full_name}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Criticality</label>
            <span className={styles[patient.criticality]}>{patient.criticality.toUpperCase()}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Triage</label>
            <span className={styles[patient.triage]}>{patient.triage.toUpperCase()}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Status</label>
            <span>{patient.status}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Address</label>
            <span>{patient.address}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Consultant</label>
            <span>{patient.consultant_full_name}</span>
          </div>
          <div className={styles.infoItem}>
            <label>ICD Code</label>
            <span>{patient.icd_codes.map((icd) => `${icd.code} - ${icd.description}`).join(', ')}</span>
          </div>
      </div>



    </div>
  );
};

export default BasicInfoTab; 