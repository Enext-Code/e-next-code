import React from 'react';
import styles from '@/styles/patientdetails.module.css';
import { PatientData } from '../types';

interface Props {
  patient: PatientData;
}

const STATUS_LABELS: Record<string, string> = {
  admission: 'Admission',
  discharge: 'Discharge',
  lama: 'Lama',
  deceased: 'Deceased',
  referred: 'Referred',
  inactive: 'Inactive',
};

function getStatusDisplayName(status?: string) {
  if (!status) return '';
  const key = status.toLowerCase();
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function formatRemark(value?: string | null) {
  if (!value?.trim()) return '-';
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatRemarkDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function PatientInfo({ patient }: Props) {
  const status = patient.status ?? '';
  // console.log(patient);
  const statusClass = status ? (styles as Record<string, string>)[status] ?? '' : '';
  const statusLabel = getStatusDisplayName(status);
  const remarkLabel = statusLabel ? `${statusLabel} Remark` : 'Remark';
  const remarkDateLabel = statusLabel ? `${statusLabel} Date and Time` : 'Remark Date and Time';

  return (
    <div className={styles.patientInfo}>
      <div className={styles.infoSection}>
        <div className={styles.infoRow}>
          <div className={styles.infoItem}>
            <label>Patient ID:</label>
            <span>{patient.unique_id}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Admission Date:</label>
            <span>
              {patient.admission_date
                ? new Date(patient.admission_date).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <label>UID No:</label>
            <span>{patient.uid_number}</span>
          </div>
        </div>

        <div className={styles.infoRow}>
          <div className={styles.infoItem}>
            <label>Doctor:</label>
            <span>{patient.doctor_full_name}</span>
          </div>
          <div className={styles.infoItem}>
            <label>ICU:</label>
            <span>{patient.organisation_icu_name}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Bed Number:</label>
            <span>{patient.organisation_icu_bed_number}</span>
          </div>
          <div className={styles.infoItem}>
            <label>{remarkLabel}:</label>
            <span>{formatRemark(patient.remark)}</span>
          </div>
          <div className={styles.infoItem}>
            <label>{remarkDateLabel}:</label>
            <span>{formatRemarkDateTime(patient.remark_datetime)}</span>
          </div>
        </div>

        {patient.icd_code && (
          <div className={styles.infoRow}>
            <div className={styles.infoItem}>
              <label>ICD Code:</label>
              <span>{patient.icd_code.code}</span>
            </div>
            <div className={styles.infoItem}>
              <label>ICD Description:</label>
              <span>{patient.icd_code.description}</span>
            </div>
          </div>
        )}

        <div className={styles.infoRow}>
          <div className={styles.infoItem}>
            <label>Status:</label>
            <span className={`${styles.statusBadge ?? ''} ${statusClass}`.trim()}>
              {status ? status.toUpperCase() : 'UNKNOWN'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <label>IPID Number:</label>
            <span>{patient.ipid_number}</span>
          </div>
          <div className={styles.infoItem}>
            <label>MLC Number:</label>
            <span>{patient.mlc_or_non_mlc_number}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Insurance:</label>
            <span>{patient.insurance || '-'}</span>
          </div>
        </div>
      </div>

      <div className={styles.statusSection}>
        <div className={`${styles.statusItem} ${patient.is_patient_past_medical_history ? styles.completed : ''}`}>
          <span className={styles.statusIcon}>✓</span>
          <span>Past Medical History</span>
        </div>
        <div className={`${styles.statusItem} ${patient.is_patient_heent ? styles.completed : ''}`}>
          <span className={styles.statusIcon}>✓</span>
          <span>HEENT</span>
        </div>
        <div className={`${styles.statusItem} ${patient.is_patient_investigation ? styles.completed : ''}`}>
          <span className={styles.statusIcon}>✓</span>
          <span>Investigation</span>
        </div>
      </div>
    </div>
  );
}
