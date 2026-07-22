import React from 'react';
import { useRouter } from 'next/navigation';
import EditButton from '@/components/common/EditButton';
import styles from '@/styles/patienthistory.module.css';

interface InitialTreatmentData {
  initial_treatment: string;
  created_at?: string;
  updated_at?: string;
}

interface Props {
  initialTreatment: InitialTreatmentData;
  patientId: string;
}

const InitialTreatmentTab = ({ initialTreatment, patientId }: Props) => {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`/patients/${patientId}/history/edit/initial-treatment`);
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.tabHeader}>
        <h2>Initial Treatment</h2>
        <EditButton onClick={handleEdit} />
      </div>

      <div className={styles.section}>
        <div className={styles.vitalItem}>
          <label>Initial Treatment</label>
          <textarea
            readOnly
            value={initialTreatment.initial_treatment || ''}
            placeholder="No initial treatment recorded"
            style={{
              width: '100%',
              minHeight: '150px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      {/* {initialTreatment.created_at && initialTreatment.updated_at && (
        <div className={styles.timestamps}>
          <p>Created: {new Date(initialTreatment.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })}</p>
          <p>Last Updated: {new Date(initialTreatment.updated_at).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })}</p>
        </div>
      )} */}
    </div>
  );
};

export default InitialTreatmentTab;

