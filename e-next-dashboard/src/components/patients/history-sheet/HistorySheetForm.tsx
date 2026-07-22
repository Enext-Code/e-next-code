'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from '@/styles/historySheet.module.css';
import { useRouter } from 'next/navigation';

interface TableRow {
  id: string;
  serialNo: string;
  value: string;
}

interface HistorySheetFormProps {
  patientId: string;
}

const HistorySheetForm = ({ patientId }: HistorySheetFormProps) => {
  const router = useRouter();
  
  const [complaints, setComplaints] = useState<TableRow[]>([
    { id: '1', serialNo: '', value: '' }
  ]);
  
  const [medications, setMedications] = useState<TableRow[]>([
    { id: '1', serialNo: '', value: '' }
  ]);

  const addRow = (type: 'complaints' | 'medications') => {
    const newRow = {
      id: Date.now().toString(),
      serialNo: '',
      value: ''
    };
    
    if (type === 'complaints') {
      setComplaints([...complaints, newRow]);
    } else {
      setMedications([...medications, newRow]);
    }
  };

  const removeRow = (type: 'complaints' | 'medications', id: string) => {
    if (type === 'complaints') {
      setComplaints(complaints.filter(row => row.id !== id));
    } else {
      setMedications(medications.filter(row => row.id !== id));
    }
  };

  const handleRowChange = (
    type: 'complaints' | 'medications',
    id: string,
    field: 'serialNo' | 'value',
    value: string
  ) => {
    if (type === 'complaints') {
      setComplaints(complaints.map(row => 
        row.id === id ? { ...row, [field]: value } : row
      ));
    } else {
      setMedications(medications.map(row => 
        row.id === id ? { ...row, [field]: value } : row
      ));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Save form data logic here
      
      // Navigate to physical examination
      router.push('/patients/physical-examination/add');
    } catch (error) {
      console.error('Error saving history sheet:', error);
    }
  };

  return (
    <div className={styles.formCard}>
      {/* <div className={styles.formHeader}>
        <Link href="/patients" className={styles.backButton}>
          <span>←</span> Add History Sheet
        </Link>
      </div> */}

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* <div className={styles.tabs}>
          <button type="button" className={styles.tabActive}>Patient Basic Info</button>
          <button type="button">Past Medical History</button>
          <button type="button">Physical Examination</button>
          <button type="button">Investigation</button>
        </div> */}

        <div className={styles.section}>
          <h3>Presenting Complaints</h3>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Serial No.</th>
                <th>Complaints</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="text"
                      value={row.serialNo}
                      onChange={(e) => handleRowChange('complaints', row.id, 'serialNo', e.target.value)}
                      placeholder="1"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => handleRowChange('complaints', row.id, 'value', e.target.value)}
                      placeholder="Enter complaint"
                    />
                  </td>
                  <td>
                    {complaints.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeRowButton}
                        onClick={() => removeRow('complaints', row.id)}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.tableActions}>
            <button
              type="button"
              className={styles.addRowButton}
              onClick={() => addRow('complaints')}
            >
              + Add Row
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h3>Current Medication</h3>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Serial No.</th>
                <th>Medication</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {medications.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="text"
                      value={row.serialNo}
                      onChange={(e) => handleRowChange('medications', row.id, 'serialNo', e.target.value)}
                      placeholder="1"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => handleRowChange('medications', row.id, 'value', e.target.value)}
                      placeholder="Enter medication"
                    />
                  </td>
                  <td>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeRowButton}
                        onClick={() => removeRow('medications', row.id)}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.tableActions}>
            <button
              type="button"
              className={styles.addRowButton}
              onClick={() => addRow('medications')}
            >
              + Add Row
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h3>Allergies</h3>
          <div className={styles.formGroup}>
            <label>Food Allergies</label>
            <input type="text" placeholder="Dairy" />
          </div>
          <div className={styles.formGroup}>
            <label>Drug Allergies</label>
            <input type="text" placeholder="Paracetamol" />
          </div>
        </div>

        <div className={styles.section}>
          <h3>Personal H/x</h3>
          <div className={styles.checkboxGrid}>
            <label className={styles.checkbox}>
              <input type="checkbox" name="smoking" />
              <span>Smoking</span>
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" name="alcohol" />
              <span>Alcohol</span>
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" name="others" />
              <span>Others</span>
            </label>
          </div>
          <div className={styles.formGroup}>
            <label>Other (Specify)</label>
            <input type="text" placeholder="Specify other personal history" />
          </div>
        </div>

        <div className={styles.section}>
          <h3>Medical History</h3>
          <div className={styles.checkboxGrid}>
            <label className={styles.checkbox}>
              <input type="checkbox" name="dm" />
              <span>DM</span>
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" name="htn" />
              <span>HTN</span>
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" name="cad" />
              <span>CAD</span>
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" name="copd" />
              <span>COPD</span>
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" name="ba" />
              <span>BA</span>
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" name="ckd" />
              <span>CKD</span>
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" name="cld" />
              <span>CLD</span>
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" name="cva" />
              <span>CVA</span>
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" name="others" />
              <span>Others</span>
            </label>
          </div>
          <div className={styles.formGroup}>
            <label>Other (Specify)</label>
            <input type="text" placeholder="Specify other medical history" />
          </div>
        </div>

        <div className={styles.vitalsGrid}>
          <div className={styles.formGroup}>
            <label>BP:</label>
            <input type="text" placeholder="120/80" />
          </div>
          <div className={styles.formGroup}>
            <label>HR:</label>
            <input type="text" placeholder="125" />
          </div>
          <div className={styles.formGroup}>
            <label>RR:</label>
            <input type="text" placeholder="14/m" />
          </div>
        </div>

        <div className={styles.vitalsGrid}>
          <div className={styles.formGroup}>
            <label>SPO2:</label>
            <div className={styles.rangeGroup}>
              <input type="range" min="94" max="100" defaultValue="98" />
              <span>98%</span>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Temp (F) (Oral):</label>
            <div className={styles.rangeGroup}>
              <input type="range" min="94" max="108" defaultValue="106" />
              <span>106° High</span>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>RBS:</label>
            <input type="text" placeholder="45" />
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitButton}>
            Save & Next
          </button>
        </div>
      </form>
    </div>
  );
};

export default HistorySheetForm; 