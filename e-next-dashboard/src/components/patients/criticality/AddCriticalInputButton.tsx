import React from 'react';
import styles from './AddCriticalInputButton.module.css';

interface AddCriticalInputButtonProps {
  patientId: string;
  onClick: () => void;
}

export default function AddCriticalInputButton({ patientId, onClick }: AddCriticalInputButtonProps) {
  return (
    <button 
      className={styles.addButton}
      onClick={onClick}
    >
      <span className={styles.buttonText}>Add Critical Input</span>
    </button>
  );
}
