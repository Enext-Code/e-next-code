'use client';

import React, { useEffect, useState } from 'react';
import { ICDCode, patientService } from '@/services/patientService';
import styles from '@/styles/add-icd-code-modal.module.css';

interface AddIcdCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (code: ICDCode) => void;
}

const AddIcdCodeModal: React.FC<AddIcdCodeModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setDescription('');
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim();
    const trimmedDescription = description.trim();

    if (!trimmedCode || !trimmedDescription) {
      setError('ICD code and description are required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await patientService.createICDCode({
        code: trimmedCode,
        description: trimmedDescription,
      });

      if (response.success && response.data) {
        onCreated(response.data);
        onClose();
        return;
      }

      setError(response.message || 'Failed to create ICD code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ICD code');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Add ICD Code</h3>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="icd-code">ICD Code</label>
            <input
              id="icd-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={styles.input}
              placeholder="e.g. A01.0"
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="icd-description">Description</label>
            <textarea
              id="icd-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              placeholder="e.g. Typhoid fever"
              rows={3}
            />
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton} disabled={isSaving}>
              {isSaving && <div className={styles.loadingSpinner}></div>}
              {isSaving ? 'Saving...' : 'Save ICD Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddIcdCodeModal;
