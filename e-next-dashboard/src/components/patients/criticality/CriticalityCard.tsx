import React from 'react';
import { CriticalityItem } from '@/services/criticalityService';
import styles from './CriticalityCard.module.css';

interface CriticalityCardProps {
  entry: CriticalityItem;
  entryNumber: number;
}

export default function CriticalityCard({ entry, entryNumber }: CriticalityCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateDayNumber = (dateString: string) => {
    const entryDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - entryDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className={styles.criticalityCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.entryTitle}>Critical Entry {entryNumber.toString().padStart(2, '0')}</h3>
        <div className={styles.dateInfo}>
          <span>Date: {formatDate(entry.date)}</span>
          <span>|</span>
          <span>DAY : {calculateDayNumber(entry.date).toString().padStart(2, '0')}</span>
        </div>
      </div>

      <div className={styles.vitalSigns}>
        <div className={styles.vitalItem}>
          <span className={styles.vitalLabel}>Heart Rate:</span>
          <span className={styles.vitalValue}>{entry.heart_rate}/mhr</span>
        </div>
        <div className={styles.vitalItem}>
          <span className={styles.vitalLabel}>Rhythm:</span>
          <span className={styles.vitalValue}>{entry.rhythm}</span>
        </div>
        <div className={styles.vitalItem}>
          <span className={styles.vitalLabel}>Temp (F) (Oral):</span>
          <span className={styles.vitalValue}>{entry.temp}</span>
        </div>
        <div className={styles.vitalItem}>
          <span className={styles.vitalLabel}>SPO2:</span>
          <span className={styles.vitalValue}>{entry.spo2}</span>
        </div>
        <div className={styles.vitalItem}>
          <span className={styles.vitalLabel}>Blood Pressure:</span>
          <span className={styles.vitalValue}>{entry.blood_pressure}</span>
        </div>
      </div>

      <div className={styles.remarksSection}>
        <label className={styles.remarksLabel}>Remarks:</label>
        <div className={styles.remarksContent}>
          {entry.remarks}
        </div>
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.timeInfo}>Time: {formatTime(entry.date)}</span>
      </div>
    </div>
  );
}
