import React, { useState } from 'react';
import styles from '@/styles/investigationReport.module.css';

interface AddReportFormProps {
  onSubmit: (date: string, time: string) => void | Promise<void>;
  onCancel: () => void;
  params: {
    date: string;
  };
}

const AddReportForm = ({ onSubmit, onCancel, params }: AddReportFormProps) => {
  const [date, setDate] = useState(params.date);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }));
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(date, time);
    } catch (error) {
      console.error('Error creating report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.addReportForm}>
      <h3>Add New Report</h3>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="date">Date:</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="time">Time:</label>
          <input
            type="time"
            id="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
        <div className={styles.formActions}>
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading && <div className={styles.loadingSpinner}></div>}
            {isLoading ? 'Creating...' : 'Create Report'}
          </button>
          <button 
            type="button" 
            className={styles.cancelButton} 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddReportForm; 