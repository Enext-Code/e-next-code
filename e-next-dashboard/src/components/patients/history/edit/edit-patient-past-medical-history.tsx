'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/styles/patient-details/history-sheet/edit-patient-past-medical.module.css';
import { patientService } from '@/services/patientService';
// import PhysicalExamForm from './PhysicalExamForm';
// import InvestigationForm from '../investigation/InvestigationForm';

interface EditPatientPastMedicalHistoryProps {
  patientId: string;
}

interface FormData {
  initial_treatment: string;
  presenting_complaints: Array<{
    serial_number: number;
    complaint: string;
  }>;
  current_medications: Array<{
    serial_number: number;
    medication: string;
  }>;
  food_allergies: string[];
  drug_allergies: string[];
  personal_hz: string[];
  personal_hz_others: string;
  medical_history: string[];
  medical_history_others: string;
  bp: string;
  hr: number;
  rr: number;
  spo2: string;
  temperature: number;
  rbs: number;
}

export default function EditPatientPastMedicalHistory({ patientId }: EditPatientPastMedicalHistoryProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<FormData | null>(null);
  const [formData, setFormData] = useState<FormData>({
    initial_treatment: '',
    presenting_complaints: [{ serial_number: 1, complaint: '' }],
    current_medications: [{ serial_number: 1, medication: '' }],
    food_allergies: [],
    drug_allergies: [],
    personal_hz: [],
    personal_hz_others: '',
    medical_history: [],
    medical_history_others: '',
    bp: '',
    hr: 0,
    rr: 0,
    spo2: '',
    temperature: 0,
    rbs: 0,
  });

  // Backend values (lowercase)
  const personalHzOptions = ['smoking', 'alchohol', 'others'] as const;
  const medicalHistoryOptions = ['dm', 'htn', 'cad', 'copd', 'ba', 'ckd', 'cva', 'others'] as const;

  // UI display mapping (uppercase)
  const displayMapping = {
    'smoking': 'Smoking',
    'alchohol': 'Alcohol',
    'others': 'Others',
    'dm': 'DM',
    'htn': 'HTN',
    'cad': 'CAD',
    'copd': 'COPD',
    'ba': 'BA',
    'ckd': 'CKD',
    'cva': 'CVA'
  };

  const getDisplayText = (text: string) => {
    if (text === 'dm') return 'DM';
    if (text === 'htn') return 'HTN';
    if (text === 'cad') return 'CAD';
    if (text === 'copd') return 'COPD';
    if (text === 'ba') return 'BA';
    if (text === 'ckd') return 'CKD';
    if (text === 'cva') return 'CVA';
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  useEffect(() => {
    loadPatientHistory();
  }, [patientId]);

  const loadPatientHistory = async () => {
    try {
      const response = await patientService.getPatientInfo(patientId);
      if (response.success && response.data) {
        const history = response.data.past_medical_history;
        const newFormData = {
          initial_treatment: history.initial_treatment || '',
          presenting_complaints: history.presenting_complaints,
          current_medications: history.current_medications,
          food_allergies: history.food_allergies,
          drug_allergies: history.drug_allergies,
          personal_hz: history.personal_hz,
          personal_hz_others: history.personal_hz_others,
          medical_history: history.medical_history,
          medical_history_others: history.medical_history_others,
          bp: history.bp,
          hr: history.hr,
          rr: history.rr,
          spo2: history.spo2,
          temperature: history.temperature,
          rbs: history.rbs,
        };
        setFormData(newFormData);
        setOriginalData(newFormData);
      }
    } catch (err) {
      console.error('Error loading patient history:', err);
      setError('Failed to load patient history');
    } finally {
      setLoading(false);
    }
  };

  const handleComplaintChange = (index: number, value: string) => {
    const newComplaints = [...formData.presenting_complaints];
    newComplaints[index] = { serial_number: index + 1, complaint: value };
    setFormData({ ...formData, presenting_complaints: newComplaints });
  };

  const handleMedicationChange = (index: number, value: string) => {
    const newMedications = [...formData.current_medications];
    newMedications[index] = { serial_number: index + 1, medication: value };
    setFormData({ ...formData, current_medications: newMedications });
  };

  const handleCheckboxChange = (field: 'personal_hz' | 'medical_history', value: string) => {
    const currentValues = formData[field];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    setFormData({ ...formData, [field]: newValues });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? (value ? Number(value) : 0) : value,
    });
  };

  const addField = (field: 'presenting_complaints' | 'current_medications') => {
    const currentItems = formData[field];
    setFormData({
      ...formData,
      [field]: [
        ...currentItems,
        {
          serial_number: currentItems.length + 1,
          [field === 'presenting_complaints' ? 'complaint' : 'medication']: ''
        }
      ]
    });
  };

  const handleAllergyAdd = (type: 'food_allergies' | 'drug_allergies', value: string) => {
    if (!value.trim()) return;
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], value.trim()]
    }));
  };

  const handleAllergyRemove = (type: 'food_allergies' | 'drug_allergies', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const deleteComplaint = (index: number) => {
    const newComplaints = formData.presenting_complaints.filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, serial_number: i + 1 }));
    setFormData({ ...formData, presenting_complaints: newComplaints });
  };

  const deleteMedication = (index: number) => {
    const newMedications = formData.current_medications.filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, serial_number: i + 1 }));
    setFormData({ ...formData, current_medications: newMedications });
  };

  const getChangedFields = () => {
    if (!originalData) return { ...formData, patient_id: patientId };

    const changes: Partial<FormData & { patient_id: string }> = {
      patient_id: patientId
    };

    // Helper function to check if arrays are different
    const areArraysDifferent = (arr1: any[], arr2: any[]) => {
      if (arr1.length !== arr2.length) return true;
      return JSON.stringify(arr1) !== JSON.stringify(arr2);
    };

    // Check each field and only include changed ones
    if (formData.initial_treatment !== originalData.initial_treatment) {
      changes.initial_treatment = formData.initial_treatment;
    }
    if (areArraysDifferent(formData.presenting_complaints, originalData.presenting_complaints)) {
      changes.presenting_complaints = formData.presenting_complaints;
    }
    if (areArraysDifferent(formData.current_medications, originalData.current_medications)) {
      changes.current_medications = formData.current_medications;
    }
    if (areArraysDifferent(formData.food_allergies, originalData.food_allergies)) {
      changes.food_allergies = formData.food_allergies;
    }
    if (areArraysDifferent(formData.drug_allergies, originalData.drug_allergies)) {
      changes.drug_allergies = formData.drug_allergies;
    }
    if (areArraysDifferent(formData.personal_hz, originalData.personal_hz)) {
      changes.personal_hz = formData.personal_hz;
    }
    if (formData.personal_hz_others !== originalData.personal_hz_others) {
      changes.personal_hz_others = formData.personal_hz_others;
    }
    if (areArraysDifferent(formData.medical_history, originalData.medical_history)) {
      changes.medical_history = formData.medical_history;
    }
    if (formData.medical_history_others !== originalData.medical_history_others) {
      changes.medical_history_others = formData.medical_history_others;
    }
    if (formData.bp !== originalData.bp) changes.bp = formData.bp;
    if (formData.hr !== originalData.hr) changes.hr = formData.hr;
    if (formData.rr !== originalData.rr) changes.rr = formData.rr;
    if (formData.spo2 !== originalData.spo2) changes.spo2 = formData.spo2;
    if (formData.temperature !== originalData.temperature) changes.temperature = formData.temperature;
    if (formData.rbs !== originalData.rbs) changes.rbs = formData.rbs;

    return changes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const changedData = getChangedFields();
      if (Object.keys(changedData).length <= 1) { // Only has patient_id
        router.push(`/patients/${patientId}/history`);
        return;
      }

      // Ensure all required fields are included
      const updateData = {
        patient_id: patientId,
        initial_treatment: changedData.initial_treatment !== undefined ? changedData.initial_treatment : formData.initial_treatment,
        presenting_complaints: changedData.presenting_complaints || formData.presenting_complaints,
        current_medications: changedData.current_medications || formData.current_medications,
        food_allergies: changedData.food_allergies || formData.food_allergies,
        drug_allergies: changedData.drug_allergies || formData.drug_allergies,
        personal_hz: changedData.personal_hz || formData.personal_hz,
        personal_hz_others: changedData.personal_hz_others || formData.personal_hz_others,
        medical_history: changedData.medical_history || formData.medical_history,
        medical_history_others: changedData.medical_history_others || formData.medical_history_others,
        bp: changedData.bp || formData.bp,
        hr: changedData.hr ?? formData.hr,
        rr: changedData.rr ?? formData.rr,
        spo2: changedData.spo2 || formData.spo2,
        temperature: changedData.temperature ?? formData.temperature,
        rbs: changedData.rbs ?? formData.rbs
      };

      const response = await patientService.updateHistory(patientId, updateData);
      if (response.success) {
        router.push(`/patients/${patientId}/history`);
      } else {
        setError(response.message || 'Failed to update patient history');
      }
    } catch (err) {
      console.error('Error updating patient history:', err);
      setError(err instanceof Error ? err.message : 'Failed to update patient history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading patient history...</div>;
  }

  return (
    <div className={styles.formContainer}>
      <h1>Edit Past Medical History</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Initial Treatment */}
        <div className={styles.section}>
          <h2>Initial Treatment</h2>
          <textarea
            name="initial_treatment"
            value={formData.initial_treatment}
            onChange={handleInputChange}
            placeholder="Enter initial treatment"
            className={styles.input}
            rows={4}
          />
        </div>

        <div className={styles.formContent}>
          {/* Left Column */}
          <div className={styles.row}>

            {/* Presenting Complaints */}
            <div className={styles.section}>
              <h2>Presenting Complaints</h2>
              {formData.presenting_complaints.map((complaint, index) => (
                <div key={index} className={styles.serialInput}>
                  <span className={styles.serialNumber}>{complaint.serial_number}.</span>
                  <input
                    type="text"
                    value={complaint.complaint}
                    onChange={(e) => handleComplaintChange(index, e.target.value)}
                    placeholder="Content"
                    className={styles.input}
                  />
                  <button
                    type="button"
                    onClick={() => deleteComplaint(index)}
                    className={styles.deleteButton}
                    aria-label="Delete complaint"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addField('presenting_complaints')}
                className={styles.addButton}
              >
                + Add Content
              </button>
            </div>

            {/* Current Medications */}
            <div className={styles.section}>
              <h2>Current Medication</h2>
              {formData.current_medications.map((medication, index) => (
                <div key={index} className={styles.serialInput}>
                  <span className={styles.serialNumber}>{medication.serial_number}.</span>
                  <input
                    type="text"
                    value={medication.medication}
                    onChange={(e) => handleMedicationChange(index, e.target.value)}
                    placeholder="Content"
                    className={styles.input}
                  />
                  <button
                    type="button"
                    onClick={() => deleteMedication(index)}
                    className={styles.deleteButton}
                    aria-label="Delete medication"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addField('current_medications')}
                className={styles.addButton}
              >
                + Add Content
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className={styles.row}>
            {/* Food Allergies */}
            <div className={styles.allergySection}>
              <div className={styles.section}>
              <div className={styles.allergyInput}>
              <h2>Food Allergies</h2>
                <input
                  type="text"
                  placeholder="Type allergy and press Enter"
                  className={styles.input}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAllergyAdd('food_allergies', (e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>
              {/* </div> */}
              <div className={styles.allergyTags}>
                {formData.food_allergies.map((allergy, index) => (
                  <span key={index} className={styles.allergyTag}>
                    {allergy}
                    <button
                      type="button"
                      onClick={() => handleAllergyRemove('food_allergies', index)}
                      className={styles.removeTag}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              </div>
              <div className={styles.section}>
              <div className={styles.allergyInput}>
              <h2>Drug Allergies</h2>
                <input
                  type="text"
                  placeholder="Type allergy and press Enter"
                  className={styles.input}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAllergyAdd('drug_allergies', (e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>
              <div className={styles.allergyTags}>
                {formData.drug_allergies.map((allergy, index) => (
                  <span key={index} className={styles.allergyTag}>
                    {allergy}
                    <button
                      type="button"
                      onClick={() => handleAllergyRemove('drug_allergies', index)}
                      className={styles.removeTag}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            </div>
            </div>
            {/* Personal History */}
            <div className={styles.column}>
            <div className={styles.section}>
              <h2>Personal History</h2>
              <div className={styles.checkboxGroup}>
                {personalHzOptions.map((option) => (
                  <label key={option} className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={formData.personal_hz.includes(option)}
                      onChange={() => handleCheckboxChange('personal_hz', option)}
                    />
                    {displayMapping[option]}
                  </label>
                ))}
              </div>
              {formData.personal_hz.includes('others') && (
                <input
                  type="text"
                  name="personal_hz_others"
                  value={formData.personal_hz_others}
                  onChange={handleInputChange}
                  placeholder="Other (Specify)"
                  className={styles.input}
                />
              )}
            </div>

            {/* Medical History */}
            <div className={styles.section}>
              <h2>Medical History</h2>
              <div className={styles.checkboxGroup}>
                {medicalHistoryOptions.map((option) => (
                  <label key={option} className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={formData.medical_history.includes(option)}
                      onChange={() => handleCheckboxChange('medical_history', option)}
                    />
                    {displayMapping[option]}
                  </label>
                ))}
              </div>
              {formData.medical_history.includes('others') && (
                <input
                  type="text"
                  name="medical_history_others"
                  value={formData.medical_history_others}
                  onChange={handleInputChange}
                  placeholder="Other (Specify)"
                  className={styles.input}
                />
              )}
            </div>

            {/* Vitals */}
            <div className={styles.section}>
              <h2>Vitals</h2>
              <div className={styles.vitalsGrid}>
                <div className={styles.inputGroup}>
                  <label>BP:</label>
                  <input
                    type="text"
                    name="bp"
                    value={formData.bp}
                    onChange={handleInputChange}
                    placeholder="120/80"
                    className={styles.input}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>HR:</label>
                  <input
                    type="number"
                    name="hr"
                    value={formData.hr || ''}
                    onChange={handleInputChange}
                    placeholder="72"
                    className={styles.input}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>RR:</label>
                  <input
                    type="number"
                    name="rr"
                    value={formData.rr || ''}
                    onChange={handleInputChange}
                    placeholder="16"
                    className={styles.input}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>SpO2:</label>
                  <input
                    type="text"
                    name="spo2"
                    value={formData.spo2}
                    onChange={handleInputChange}
                    placeholder="98%"
                    className={styles.input}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Temperature:</label>
                  <input
                    type="number"
                    name="temperature"
                    value={formData.temperature || ''}
                    onChange={handleInputChange}
                    placeholder="--"
                    className={styles.input}
                    min="93"
                    max="110"
                    step="0.1"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>RBS:</label>
                  <input
                    type="number"
                    name="rbs"
                    value={formData.rbs || ''}
                    onChange={handleInputChange}
                    placeholder="--"
                    className={styles.input}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
} 