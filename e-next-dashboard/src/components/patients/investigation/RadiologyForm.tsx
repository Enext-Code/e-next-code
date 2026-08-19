import React from 'react';
import styles from '@/styles/components/radiologyForm.module.css';

interface RadiologyFormProps {
  onSave: (data: any) => void;
}

const RadiologyForm = ({ onSave }: RadiologyFormProps) => {
  const radiologyTypes = [
    { id: 'ecg', title: 'ECG' },
    { id: 'xray', title: 'X-RAY' },
    { id: 'mri', title: 'MRI Scans' },
    { id: 'ultrasound', title: 'Ultrasound' },
    { id: 'ct', title: 'CT Scan' },
    { id: 'echo', title: '2D Echo' },
    { id: 'endoscopy', title: 'Endoscopy' },
    { id: 'colonoscopy', title: 'Colonoscopy' },
  ];

  const handleFileUpload = (type: string) => {
    // Handle file upload logic here
    // console.log(`Upload for ${type}`);
  };

  const handleAddDocument = (type: string) => {
    // Handle adding document logic here
    // console.log(`Add document for ${type}`);
  };

  return (
    <div className={styles.formContainer}>
      {radiologyTypes.map((type) => (
        <div key={type.id} className={styles.section}>
          <h3 className={styles.sectionTitle}>{type.title}</h3>
          <div className={styles.actionButtons}>
            <button
              className={styles.uploadButton}
              onClick={() => handleFileUpload(type.id)}
            >
              <span className={styles.icon}>⬆️</span>
              Upload
            </button>
            <button
              className={styles.documentButton}
              onClick={() => handleAddDocument(type.id)}
            >
              <span className={styles.icon}>➕</span>
              Add Documents
            </button>
          </div>
        </div>
      ))}

      <div className={styles.previewSection}>
        {/* Preview section will be implemented here */}
        <div className={styles.noFiles}>
          <span className={styles.noFilesIcon}>📄</span>
          <p>No files uploaded yet</p>
          <p className={styles.noFilesSubtext}>
            Upload files to see them here
          </p>
        </div>
      </div>
    </div>
  );
};

export default RadiologyForm; 