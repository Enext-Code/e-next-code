import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/styles/patientdetails-new.module.css';

interface ActionCardsProps {
  patient: {
    id: string;
  };
}

const ActionCards: React.FC<ActionCardsProps> = ({ patient }) => {
  const ArrowIcon = () => (
    <div className={styles.arrowIcon}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 8H13M13 8L8.5 3.5M13 8L8.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );

  const icons = {
    progressSheet: "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/Group+1597881432.svg",
    investigationReport: "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/patient-details/Group+1597880718(1).svg",
    dailyRound: "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/patient-details/Group+1321315461.svg",
    discharge: "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/patient-details/Group+1597880718(2).svg"
  };

  return (
    <div className={styles.actionCards}>
      <Link href={`/patients/${patient.id}/progress-sheet`} className={styles.actionCard}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className={styles.cardIcon}>
            <Image
              src={icons.progressSheet}
              alt="Progress Sheet"
              width={48}
              height={48}
            />
          </div>
          <div className={styles.cardContent}>
            <h3>Progress Sheet</h3>
          </div>
        </div>
        <Image src="https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/patient-details/Frame+1410113461.svg" alt="Arrow" width={16} height={16} />
      </Link>

      <Link href={`/patients/${patient.id}/investigation-report`} className={styles.actionCard}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className={styles.cardIcon}>
            <Image
              src={icons.investigationReport}
              alt="Investigation Report"
              width={48}
              height={48}
            />
          </div>
          <div className={styles.cardContent}>
            <h3>Investigation Report</h3>
          </div>
        </div>
        <Image src="https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/patient-details/Frame+1410113461.svg" alt="Arrow" width={16} height={16} />
      </Link>

      <Link href={`/patients/${patient.id}/daily-round`} className={styles.actionCard}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className={styles.cardIcon}>
            <Image
              src={icons.dailyRound}
              alt="Daily Round Sheet"
              width={48}
              height={48}
            />
          </div>
          <div className={styles.cardContent}>
            <h3>Daily Round Sheet</h3>
          </div>
        </div>
        <Image src="https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/patient-details/Frame+1410113461.svg" alt="Arrow" width={16} height={16} />
        </Link>

      <Link href={`/patients/${patient.id}/discharge`} className={styles.actionCard}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className={styles.cardIcon}>
            <Image
              src={icons.discharge}
              alt="Discharge"
              width={48}
              height={48}
            />
          </div>
          <div className={styles.cardContent}>
            <h3>Discharge</h3>
          </div>
        </div>
        <Image src="https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/patient-details/Frame+1410113461.svg" alt="Arrow" width={16} height={16} />
      </Link>
    </div>
  );
};

export default ActionCards; 