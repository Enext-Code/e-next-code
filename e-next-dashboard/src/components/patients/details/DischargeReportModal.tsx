'use client';

import React, { useState, useEffect } from 'react';
import { patientService, DischargeReportData } from '@/services/patientService';
import styles from './DischargeReportModal.module.css';

interface DischargeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
}

export default function DischargeReportModal({
  isOpen,
  onClose,
  patientId,
  patientName,
}: DischargeReportModalProps) {
  const [formData, setFormData] = useState<DischargeReportData>({
    history_of_present_illness: '',
    past_history: '',
    course_in_hospital: '',
    condition_on_discharge: '',
    medication_on_discharge: '',
    follow_up_advice: '',
  });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportCreated, setReportCreated] = useState(false);
  const [patientStillAdmitted, setPatientStillAdmitted] = useState(false);

  // Check if discharge report already exists when modal opens
  useEffect(() => {
    if (isOpen) {
      checkExistingReport();
    }
  }, [isOpen]);

  const checkExistingReport = async () => {
    setChecking(true);
    setError(null);

    try {
      const response = await patientService.getDischargeReport(patientId);
      if (response.success && response.data) {
        // Report already exists — pre-fill form and show download
        setFormData({
          history_of_present_illness: response.data.history_of_present_illness || '',
          past_history: response.data.past_history || '',
          course_in_hospital: response.data.course_in_hospital || '',
          condition_on_discharge: response.data.condition_on_discharge || '',
          medication_on_discharge: response.data.medication_on_discharge || '',
          follow_up_advice: response.data.follow_up_advice || '',
        });
        setReportCreated(true);
      }
    } catch (err: any) {
      // Check if patient is still admitted
      if (err?.data?.error_code === 'PATIENT_STILL_ADMITTED') {
        setPatientStillAdmitted(true);
      } else {
        // No existing report — that's fine, show the form
        setReportCreated(false);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleInputChange = (field: keyof DischargeReportData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await patientService.createDischargeReport(patientId, formData);
      if (response.success) {
        setReportCreated(true);
      } else {
        setError(response.message || 'Failed to create discharge report');
      }
    } catch (err) {
      console.error('Error creating discharge report:', err);
      setError(err instanceof Error ? err.message : 'Failed to create discharge report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);

    try {
      await patientService.downloadDischargeReport(patientId, patientName);
    } catch (err) {
      console.error('Error downloading discharge report:', err);
      setError(err instanceof Error ? err.message : 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      history_of_present_illness: '',
      past_history: '',
      course_in_hospital: '',
      condition_on_discharge: '',
      medication_on_discharge: '',
      follow_up_advice: '',
    });
    setError(null);
    setReportCreated(false);
    setPatientStillAdmitted(false);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Generate Discharge Report</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            &times;
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {checking ? (
          <div className={styles.modalBody}>
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#666' }}>
              Checking for existing report...
            </div>
          </div>
        ) : patientStillAdmitted ? (
          <>
            <div className={styles.modalBody}>
              <div className={styles.warningMessage}>
                Discharge report is not available while patient is still admitted.
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={handleClose}>
                Close
              </button>
            </div>
          </>
        ) : reportCreated ? (
          <>
            <div className={styles.modalBody}>
              <div className={styles.successMessage}>
                Discharge report already generated!
              </div>

              <div className={styles.formGroup}>
                <label>History of Present Illness</label>
                <textarea value={formData.history_of_present_illness} readOnly rows={2} />
              </div>
              <div className={styles.formGroup}>
                <label>Past History</label>
                <textarea value={formData.past_history} readOnly rows={2} />
              </div>
              <div className={styles.formGroup}>
                <label>Course in Hospital</label>
                <textarea value={formData.course_in_hospital} readOnly rows={2} />
              </div>
              <div className={styles.formGroup}>
                <label>Condition on Discharge</label>
                <textarea value={formData.condition_on_discharge} readOnly rows={2} />
              </div>
              <div className={styles.formGroup}>
                <label>Medication on Discharge</label>
                <textarea value={formData.medication_on_discharge} readOnly rows={2} />
              </div>
              <div className={styles.formGroup}>
                <label>Follow Up Advice</label>
                <textarea value={formData.follow_up_advice} readOnly rows={2} />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={handleClose}>
                Close
              </button>
              <button
                type="button"
                className={styles.downloadButton}
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading && <div className={styles.loadingSpinner}></div>}
                {downloading ? 'Downloading...' : 'Download Report'}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>History of Present Illness</label>
                <textarea
                  value={formData.history_of_present_illness}
                  onChange={(e) => handleInputChange('history_of_present_illness', e.target.value)}
                  placeholder="Enter history of present illness"
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Past History</label>
                <textarea
                  value={formData.past_history}
                  onChange={(e) => handleInputChange('past_history', e.target.value)}
                  placeholder="Enter past history"
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Course in Hospital</label>
                <textarea
                  value={formData.course_in_hospital}
                  onChange={(e) => handleInputChange('course_in_hospital', e.target.value)}
                  placeholder="Enter course in hospital"
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Condition on Discharge</label>
                <textarea
                  value={formData.condition_on_discharge}
                  onChange={(e) => handleInputChange('condition_on_discharge', e.target.value)}
                  placeholder="Enter condition on discharge"
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Medication on Discharge</label>
                <textarea
                  value={formData.medication_on_discharge}
                  onChange={(e) => handleInputChange('medication_on_discharge', e.target.value)}
                  placeholder="Enter medication on discharge"
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Follow Up Advice</label>
                <textarea
                  value={formData.follow_up_advice}
                  onChange={(e) => handleInputChange('follow_up_advice', e.target.value)}
                  placeholder="Enter follow up advice"
                  rows={3}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={handleClose}>
                Cancel
              </button>
              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading && <div className={styles.loadingSpinner}></div>}
                {loading ? 'Creating...' : 'Create Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
