'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { patientService, Patient } from '@/services/patientService';
import Breadcrumb from '@/components/common/Breadcrumb';
import styles from '@/styles/status-change/status-change.module.css';
import ConfirmationModal from '@/components/common/ConfirmationModal';

type PageParams = {
  id: string;
};

/** Status Change page: Step Down (inactive) ↔ Active (admission) only */
type StatusAction = 'inactive' | 'admission';
// Old final statuses moved to discharge page: lama / deceased / referred

interface StatusFormData {
  status: StatusAction;
  remark: string;
  remark_datetime: string;
}

function getOppositeAction(currentStatus: string | undefined): StatusAction | null {
  if (currentStatus === 'admission') return 'inactive';
  if (currentStatus === 'inactive') return 'admission';
  return null;
}

function getActionLabel(status: StatusAction) {
  return status === 'inactive' ? 'Step Down' : 'Active';
}

export default function StatusChangePageClient() {
  const params = useParams<PageParams>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [formData, setFormData] = useState<StatusFormData>({
    status: 'inactive',
    remark: '',
    remark_datetime: new Date().toLocaleString('sv-SE').replace(' ', 'T')
  });

  useEffect(() => {
    loadPatientData();
  }, [params.id]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const response = await patientService.getById(params.id);
      if (response.success && response.data) {
        const data = response.data as unknown as Patient;
        setPatient(data);
        const next = getOppositeAction(data.status);
        if (next) {
          setFormData(prev => ({ ...prev, status: next }));
        }
      } else {
        setError('Patient not found');
      }
    } catch (err) {
      console.error('Error loading patient:', err);
      setError('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof StatusFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.remark.trim()) {
      setError('Remark is required');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const updateData = {
        status: formData.status,
        remark: formData.remark,
        remark_datetime: formData.remark_datetime
      };

      const response = await patientService.update(params.id, updateData);

      if (response.success) {
        setShowConfirmModal(false);
        setSuccess(true);
        setTimeout(() => {
          router.push(`/patients/${params.id}`);
        }, 2000);
      } else {
        setShowConfirmModal(false);
        setError(response.message || 'Failed to update patient status');
      }
    } catch (err) {
      console.error('Error updating patient status:', err);
      setShowConfirmModal(false);
      setError(err instanceof Error ? err.message : 'Failed to update patient status');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading patient data...</div>;
  }

  if (error && !patient) {
    return <div className={styles.error}>{error}</div>;
  }

  const nextAction = getOppositeAction(patient?.status);
  const canToggle = nextAction !== null;

  const breadcrumbItems = [
    { label: 'Patients', href: '/patients' },
    { label: 'Patient Details', href: `/patients/${params.id}` },
    { label: 'Status Change' }
  ];

  return (
    <div className={styles.pageContainer}>
      <Breadcrumb items={breadcrumbItems} />

      <div className={styles.header}>
        <h2>Update Patient Status</h2>
        {patient && (
          <div className={styles.patientInfo}>
            <p><strong>Patient:</strong> {patient.first_name} {patient.last_name}</p>
            <p><strong>Patient ID:</strong> {patient.unique_id}</p>
            <p><strong>Current Status:</strong> {patient.status}</p>
          </div>
        )}
      </div>

      {success ? (
        <div className={styles.successMessage}>
          <h3>✅ Patient status updated successfully!</h3>
          <p>Redirecting to patient details...</p>
        </div>
      ) : !canToggle ? (
        <div className={styles.errorMessage}>
          This page only supports Step Down (from Admission) and Active (from Inactive).
          Current status &quot;{patient?.status}&quot; cannot be changed here.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.dischargeForm}>
          <div className={styles.formSection}>
            <h3>Status Update</h3>

            <div className={styles.formGroup}>
              <label htmlFor="status">New Status:</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as StatusAction)}
                className={styles.select}
                required
              >
                {patient?.status === 'admission' && (
                  <option value="inactive">Step Down</option>
                )}
                {patient?.status === 'inactive' && (
                  <option value="admission">Active</option>
                )}
                {/* Old options moved to discharge page with values: lama / deceased / referred */}
              </select>
              {formData.status === 'admission' && (
                <p style={{ marginTop: 8, fontSize: 13, color: '#555' }}>
                  An available bed in the patient&apos;s ICU will be assigned automatically.
                </p>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="remark">Remark:</label>
              <textarea
                id="remark"
                value={formData.remark}
                onChange={(e) => handleInputChange('remark', e.target.value)}
                className={styles.textarea}
                placeholder="Enter remarks for this status change..."
                rows={4}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="remark_datetime">Date & Time:</label>
              <input
                type="datetime-local"
                id="remark_datetime"
                value={formData.remark_datetime.slice(0, 16)}
                onChange={(e) => handleInputChange('remark_datetime', e.target.value)}
                className={styles.input}
                required
              />
            </div>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={() => router.push(`/patients/${params.id}`)}
              className={styles.cancelButton}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? 'Updating...' : `Update to ${getActionLabel(formData.status)}`}
            </button>
          </div>
        </form>
      )}

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirm Status Change"
        message={`Are you sure you want to update the patient status to "${getActionLabel(formData.status)}"?`}
        confirmButtonText="Yes, Update"
        cancelButtonText="Cancel"
      />
    </div>
  );
}
