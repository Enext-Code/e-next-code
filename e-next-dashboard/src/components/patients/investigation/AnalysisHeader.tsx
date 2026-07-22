import React from 'react';
import styles from '@/styles/components/analysisHeader.module.css';

interface AnalysisHeaderProps {
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  selectedDate: string;
  selectedTime: string;
}

const AnalysisHeader = ({
  onDateChange,
  onTimeChange,
  selectedDate,
  selectedTime
}: AnalysisHeaderProps) => {
  return (
    <div className={styles.analysisHeader}>
      <div className={styles.dateSection}>
        <label>Date Of Analysis</label>
        <div className={styles.dateInput}>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
          />
          <span className={styles.calendarIcon}>📅</span>
        </div>
      </div>

      <div className={styles.timeSection}>
        <label>Time Of Analysis</label>
        <div className={styles.timeInput}>
          <input 
            type="time" 
            value={selectedTime}
            onChange={(e) => onTimeChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default AnalysisHeader; 