import React, { useState, useEffect } from 'react';
import { criticalityService, CreateCriticalityRequest } from '@/services/criticalityService';
import styles from './CriticalInputModal.module.css';
import { patientData } from '@/data/patients';

interface CriticalInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: () => void;
}

export default function CriticalInputModal({ isOpen, onClose, patientId, onSuccess }: CriticalInputModalProps) {
  const [formData, setFormData] = useState({
    heart_rate: '',
    rhythm: '',
    temp: '',
    spo2: '',
    blood_pressure: '',
    remarks: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '-');

  const formattedTime = currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const requestData: CreateCriticalityRequest = {
        patient_id: patientId,
        date: currentDate.toISOString(),
        blood_pressure: formData.blood_pressure,
        heart_rate: formData.heart_rate,
        rhythm: formData.rhythm,
        spo2: formData.spo2,
        temp: formData.temp,
        remarks: formData.remarks
      };

      await criticalityService.create(requestData);
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        heart_rate: '',
        rhythm: '',
        temp: '98.6',
        spo2: '99',
        blood_pressure: '',
        remarks: 'A medical condition characterized by persistent, debilitating arthralgia and myalgia, potentially impacting daily functionality. Pathogenic factors, including genetic predisposition and autoimmune processes, may contribute to the onset and progression of this disorder. Diagnostic evaluation often involves a comprehensive review of clinical history, physical examination, and laboratory investigations to establish a definitive diagnosis.'
      });
    } catch (err) {
      console.error('Error creating criticality entry:', err);
      setError('Failed to create criticality entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Critical Inputs</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGrid}>
            {/* Heart Rate */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Heart Rate</label>
              <input
                type="number"
                value={formData.heart_rate}
                onChange={(e) => handleInputChange('heart_rate', e.target.value)}
                className={styles.textInput}
                placeholder=""
                min="40"
                max="200"
              />
            </div>

            {/* Rhythm */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Rhythm</label>
              <select
                value={formData.rhythm}
                onChange={(e) => handleInputChange('rhythm', e.target.value)}
                className={styles.textInput}
              >
                <option value="">--</option>
                <option value="SINUS">SINUS</option>
                <option value="VT">VT</option>
                <option value="VF">VF</option>
                <option value="AFIBRILLATION">AFIBRILLATION</option>
                <option value="A FLUTTER">A FLUTTER</option>
                <option value="Bradycardia Sinus">Bradycardia Sinus</option>
                <option value="1° AV Block">1° AV Block</option>
                <option value="2° AV Block">2° AV Block</option>
                <option value="3° AV Block">3° AV Block</option>
              </select>
            </div>

            {/* Temperature */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Temp (F) (Oral)</label>
              <input
                type="number"
                value={formData.temp}
                onChange={(e) => handleInputChange('temp', e.target.value)}
                className={styles.textInput}
                placeholder=""
                step="0.1"
                min="94"
                max="108"
              />
            </div>

            {/* SPO2 */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>SPO2</label>
              <input
                type="number"
                value={formData.spo2}
                onChange={(e) => handleInputChange('spo2', e.target.value)}
                className={styles.textInput}
                placeholder=""
                min="70"
                max="100"
              />
            </div>

            {/* Blood Pressure */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Blood Pressure</label>
              <input
                type="text"
                value={formData.blood_pressure}
                onChange={(e) => handleInputChange('blood_pressure', e.target.value)}
                className={styles.textInput}
                placeholder=""
              />
            </div>
          </div>

          {/* Date and Time Info */}
            <div className={styles.dateTimeInfo}>
              <span>Date: {formattedDate} </span>
            </div>

          {/* Remarks */}
          <div className={styles.remarksGroup}>
            <label className={styles.remarksLabel}>Remarks:</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              className={styles.remarksTextarea}
              rows={6}
            />
          </div>

          {/* Time Info */}
          <div className={styles.timeInfo}>
            <span>Time: {formattedTime}</span>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className={styles.buttonContainer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? 'Saving...' : 'Save Critical Input'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
