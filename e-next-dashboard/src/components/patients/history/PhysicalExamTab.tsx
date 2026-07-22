import React from 'react';
import { useRouter } from 'next/navigation';
import EditButton from '@/components/common/EditButton';
import styles from '@/styles/patienthistory.module.css';

interface HeentData {
  cvs: string;
  rs: string;
  p_a: string;
  right_pupil_size: string;
  right_pupil_reaction: string;
  left_pupil_size: string;
  left_pupil_reaction: string;
  eye_opening: number;
  verbal_response: number;
  motor_response: number;
  rll: string;
  lll: string;
  rul: string;
  lul: string;
  other_medical_findings: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  heent: HeentData;
  patientId: string;
}

const PhysicalExamTab = ({ heent, patientId }: Props) => {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`/patients/${patientId}/history/edit/physical-exam`);
  };

  const calculateGCS = () => {
    return heent.eye_opening + heent.verbal_response + heent.motor_response;
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.tabHeader}>
        <h2>Physical Examination</h2>
        <EditButton onClick={handleEdit} />
      </div>

      {/* <div className={styles.section}> */}
          <div className={styles.examItem}>
            <label>CVS</label>
            <span>{heent.cvs}</span>
          </div>
          <div className={styles.examItem}>
            <label>RS</label>
            <span>{heent.rs}</span>
          </div>
          <div className={styles.examItem}>
            <label>P/A</label>
            <span>{heent.p_a}</span>
          </div>
          <div className={styles.examItem}>
          <label style={{fontWeight: 'bold'}}>CNS Pupils</label>
          </div>
          <div className={styles.examItem}>
                <label>Right Pupil Size</label>
                <span>{heent.right_pupil_size}</span>
              </div>
              <div className={styles.examItem}>
                <label>Right Pupil Reaction</label>
                <span>{heent.right_pupil_reaction}</span>
              </div>
              <div className={styles.examItem}>
                <label>Left Pupil Size</label>
                <span>{heent.left_pupil_size}</span>
              </div>
              <div className={styles.examItem}>
                <label>Left Pupil Reaction</label>
                <span>{heent.left_pupil_reaction}</span>
              </div>
              <div className={styles.examItem}>
                <label style={{fontWeight: 'bold'}}>Glasgow Coma Scale (GCS)</label>
              </div>
              <div className={styles.examItem}>
            <label>Eye Opening</label>
            <span>{heent.eye_opening}</span>
          </div>
          <div className={styles.examItem}>
            <label>Verbal Response</label>
            <span>{heent.verbal_response}</span>
          </div>
          <div className={styles.examItem}>
            <label>Motor Response</label>
            <span>{heent.motor_response}</span>
          </div>
          <div className={styles.examItem}>
            <label style={{fontWeight: 'bold'}}>Total GCS Score</label>
            <span>{calculateGCS()}</span>
          </div>
          <div className={styles.examItem}>
            <label style={{fontWeight: 'bold'}}>DEFICIT</label>
          </div>
          <div className={styles.examItem}>
            <label>RLL</label>
            <span>{heent.rll}</span>
          </div>
          <div className={styles.examItem}>
            <label>LLL</label>
            <span>{heent.lll}</span>
          </div>
          <div className={styles.examItem}>
            <label>RUL</label>
            <span>{heent.rul}</span>
          </div>
          <div className={styles.examItem}>
            <label>LUL</label>
            <span>{heent.lul}</span>
          </div>
          {/* <div className={styles.examItem}>
            <label>Other Medical Findings</label>
            <span>{heent.other_medical_findings}</span>
          </div> */}
      {/* </div> */}

      





      {heent.other_medical_findings && (
        <div className={styles.section}>
          <h3>Other Medical Findings</h3>
          <div className={styles.findings}>
            <p>{heent.other_medical_findings}</p>
          </div>
        </div>
      )}

      {/* <div className={styles.timestamps}>
        <p>Created: {new Date(heent.created_at).toLocaleString()}</p>
        <p>Last Updated: {new Date(heent.updated_at).toLocaleString()}</p>
      </div> */}
    </div>
  );
};

export default PhysicalExamTab; 