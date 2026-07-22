import React from 'react';
import styles from '@/styles/confirmation-modal.module.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Yes, Delete',
  cancelButtonText = 'No, Cancel'
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>{title}</h2>
        <p className={styles.modalMessage}>{message}</p>
        <div className={styles.modalActions}>
          <button 
            onClick={onClose}
            className={styles.cancelButton}
          >
            {cancelButtonText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={styles.confirmButton}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal; 