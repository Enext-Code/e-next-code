'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from '@/styles/history-page-style/patient-history-add.module.css';
import { fetchApi } from '@/utils/api';
import PhysicalExamForm from './PhysicalExamForm';
import InvestigationForm from '../investigation/InvestigationForm';

interface PatientHistoryFormProps {
  patientId: string;
}

interface ComplaintItem {
  serial_number: number;
  complaint: string;
}

interface MedicationItem {
  serial_number: number;
  medication: string;
}

interface FormData {
  initial_treatment: string;
  presenting_complaints: ComplaintItem[];
  current_medications: MedicationItem[];
  food_allergy: 'yes' | 'no';
  food_allergies: string[];
  drug_allergy: 'yes' | 'no';
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

export default function PatientHistoryForm({ patientId }: PatientHistoryFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the tab from URL search params
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'history');

  // Update active tab when URL param changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [formData, setFormData] = useState<FormData>({
    initial_treatment: '',
    presenting_complaints: [{ serial_number: 1, complaint: '' }],
    current_medications: [{ serial_number: 1, medication: '' }],
    food_allergy: 'no',
    food_allergies: [],
    drug_allergy: 'no',
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

  const handleCheckboxChange = (field: 'personal_hz' | 'medical_history', value: string) => {
    const currentValues = formData[field];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    setFormData({ ...formData, [field]: newValues });
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? (value ? Number(value) : 0) : value,
    });
  };

  const addField = (field: 'presenting_complaints' | 'current_medications') => {
    if (field === 'presenting_complaints') {
      setFormData({
        ...formData,
        presenting_complaints: [
          ...formData.presenting_complaints,
          { serial_number: formData.presenting_complaints.length + 1, complaint: '' },
        ],
      });
    } else if (field === 'current_medications') {
      setFormData({
        ...formData,
        current_medications: [
          ...formData.current_medications,
          { serial_number: formData.current_medications.length + 1, medication: '' },
        ],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        personal_hz: formData.personal_hz.map(item => item.toLowerCase()),
        medical_history: formData.medical_history.map(item => item.toLowerCase())
      };

      const response = await fetchApi(
        `/api/v1/patients/patient-past-medical-history?organisation_id=${process.env.NEXT_PUBLIC_ORGANISATION_ID}`,
        {
          method: 'POST',
          body: JSON.stringify({
            patient_id: patientId,
            ...submitData,
          }),
        }
      );

      if (response.success) {
        if (tabParam) {
          // If we came from a search tab, go back to history page
          router.push(`/patients/${patientId}/history`);
        } else {
          // If normal flow, go to next tab
          setActiveTab('physical');
        }
      } else {
        setError(response.message || 'Failed to save patient history');
      }
    } catch (err) {
      console.error('Error saving patient history:', err);
      setError(err instanceof Error ? err.message : 'Failed to save patient history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>


      <h1>Add Patient History</h1>

      {/* Tabs */}
      <div className={styles.tabs}>
        {/* <button 
          className={`${styles.tab} ${activeTab === 'basic' ? styles.active : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          Patient Basic Info
        </button> */}
        <button 
          className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Add History Sheet
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'physical' ? styles.active : ''}`}
          onClick={() => setActiveTab('physical')}
        >
          Physical Examination
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'investigation' ? styles.active : ''}`}
          onClick={() => setActiveTab('investigation')}
        >
          Investigation
        </button>
      </div>

      {/* Only show form content for history tab */}
      {activeTab === 'history' && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formContent}>
            {/* Left Column */}
            <div className={styles.column}>
              {/* Initial Treatment */}
              <div className={styles.sectionadd}>
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

              {/* Presenting Complaints */}
              <div className={styles.sectionadd}>
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
                      aria-label="Delete content"
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
              <div className={styles.sectionadd}>
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
                      aria-label="Delete content"
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
            <div className={styles.column}>
              {/* Food Allergy */}
              <div className={styles.sectionadd}>
                <h2>Food Allergy</h2>
                <div className={styles.radioGroup}>
                  <label>
                    <input
                      type="radio"
                      name="food_allergy"
                      value="yes"
                      checked={formData.food_allergy === 'yes'}
                      onChange={() => setFormData({ ...formData, food_allergy: 'yes' })}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="food_allergy"
                      value="no"
                      checked={formData.food_allergy === 'no'}
                      onChange={() => setFormData({ ...formData, food_allergy: 'no' })}
                    />
                    No
                  </label>
                </div>
                {formData.food_allergy === 'yes' && (
                  <div className={styles.allergyContainer}>
                    <div className={styles.allergyInput}>
                      <input
                        type="text"
                        placeholder="Enter food allergy"
                        className={styles.input}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAllergyAdd('food_allergies', (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        className={styles.addAllergyButton}
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          handleAllergyAdd('food_allergies', input.value);
                          input.value = '';
                        }}
                      >
                        Add
                      </button>
                    </div>
                    <div className={styles.allergyTags}>
                      {formData.food_allergies.map((allergy, index) => (
                        <span key={index} className={styles.allergyTag}>
                          {allergy}
                          <button
                            type="button"
                            onClick={() => handleAllergyRemove('food_allergies', index)}
                            className={styles.removeAllergyButton}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Drug Allergy */}
              <div className={styles.sectionadd}>
                <h2>Drug Allergy</h2>
                <div className={styles.radioGroup}>
                  <label>
                    <input
                      type="radio"
                      name="drug_allergy"
                      value="yes"
                      checked={formData.drug_allergy === 'yes'}
                      onChange={() => setFormData({ ...formData, drug_allergy: 'yes' })}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="drug_allergy"
                      value="no"
                      checked={formData.drug_allergy === 'no'}
                      onChange={() => setFormData({ ...formData, drug_allergy: 'no' })}
                    />
                    No
                  </label>
                </div>
                {formData.drug_allergy === 'yes' && (
                  <div className={styles.allergyContainer}>
                    <div className={styles.allergyInput}>
                      <input
                        type="text"
                        placeholder="Enter drug allergy"
                        className={styles.input}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAllergyAdd('drug_allergies', (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        className={styles.addAllergyButton}
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          handleAllergyAdd('drug_allergies', input.value);
                          input.value = '';
                        }}
                      >
                        Add
                      </button>
                    </div>
                    <div className={styles.allergyTags}>
                      {formData.drug_allergies.map((allergy, index) => (
                        <span key={index} className={styles.allergyTag}>
                          {allergy}
                          <button
                            type="button"
                            onClick={() => handleAllergyRemove('drug_allergies', index)}
                            className={styles.removeAllergyButton}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Personal History */}
              <div className={styles.sectionadd}>
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
              <div className={styles.sectionadd}>
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
              <div className={styles.sectionadd}>
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
                    <label>Temperature (°F):</label>
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
              {loading ? 'Saving...' : tabParam ? 'Save' : 'Save & Next'}
            </button>
          </div>
        </form>
            )}

      {/* Show physical examination form when physical tab is active */}
      {activeTab === 'physical' && (
        <PhysicalExamForm 
          patientId={patientId} 
          isFromSearch={!!tabParam}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Show investigation form when investigation tab is active */}
      {activeTab === 'investigation' && (
        <InvestigationForm 
          patientId={patientId}
          isFromSearch={!!tabParam}
          setActiveTab={setActiveTab}
        />
      )}
    </div>
  );
} 