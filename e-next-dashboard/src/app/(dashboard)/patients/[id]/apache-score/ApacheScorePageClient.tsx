'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchApi } from '@/utils/api';
import { API_ENDPOINTS } from '@/constants/api';
import Breadcrumb from '@/components/common/Breadcrumb';
import styles from '@/styles/apache-score.module.css';

type PageParams = {
  id: string;
};

interface ApacheScoreFormData {
  age: number | '';
  glasgow_coma_score: number | '';
  temperature: number | '';
  temperature_unit: 'celsius' | 'fahrenheit';
  mean_arterial_pressure: number | '';
  heart_rate: number | '';
  respiratory_rate: number | '';
  fio2: number | '';
  pao2: number | '';
  pao2_unit: 'mmHg' | 'kPa';
  paco2: number | '';
  paco2_unit: 'mmHg' | 'kPa';
  atmospheric_pressure: number | '';
  atmospheric_pressure_unit: 'mmHg' | 'kPa';
  arterial_ph: number | '';
  sodium: number | '';
  potassium: number | '';
  creatinine: number | '';
  creatinine_unit: 'mg_dl' | 'umol_l';
  acute_renal_failure: boolean;
  hematocrit: number | '';
  wbc: number | '';
  severe_organ_insufficiency_or_immunocompromised: boolean;
  admission_classification: 'medical' | 'emergency_post_operative' | 'elective_post_operative';
  emergency_surgery: boolean;
  icu_admission_reason: 'asthma_allergy' | 'copd' | 'pulmonary_edema_non_cardiogenic' | 'postrespiratory_arrest' | 'aspiration_poisoning_toxic' | 'pulmonary_embolus' | 'infection' | 'neoplasm' | 'hypertension' | 'rhythm_disturbance' | 'congestive_heart_failure' | 'hemorrhagic_shock_hypovolemia' | 'coronary_artery_disease' | 'cabg' | 'sepsis' | 'postcardiac_arrest' | 'cardiogenic_shock' | 'dissecting_thoracic_abdominal_aneurysm' | 'multiple_trauma' | 'head_trauma' | 'seizure_disorder' | 'ich_sdh_sah' | 'drug_overdose' | 'diabetic_ketoacidosis' | 'gi_bleeding' | 'metabolic_renal' | 'respiratory' | 'neurologic' | 'cardiovascular' | 'gastrointestinal' | 'chronic_cardiovascular_disease' | 'peripheral_vascular_surgery' | 'heart_valve_surgery' | 'craniotomy_for_neoplasm' | 'renal_surgery_for_neoplasm' | 'renal_transplant' | 'thoracic_surgery_for_neoplasm' | 'craniotomy_for_ich_sdh_sah' | 'laminectomy_and_other_spinal_surgery' | 'respiratory_insufficiency_after_or' | 'gi_perforation_obstruction' | 'post_op_sepsis' | 'post_op_postarrest';
}

interface ComponentScores {
  age_score: number;
  glasgow_coma_score: number;
  temperature_score: number;
  mean_arterial_pressure_score: number;
  heart_rate_score: number;
  respiratory_rate_score: number;
  oxygenation_score: number;
  arterial_ph_score: number;
  sodium_score: number;
  potassium_score: number;
  creatinine_score: number;
  hematocrit_score: number;
  wbc_score: number;
  chronic_health_score: number;
}

interface ApacheScoreResponse {
  success: boolean;
  message?: string;
  data?: {
    apache_ii_score: number;
    predicted_mortality_percent: number;
    component_scores: ComponentScores;
  };
}

export default function ApacheScorePageClient() {
  const params = useParams<PageParams>();
  const router = useRouter();
  const patientId = params.id;

  const breadcrumbItems = [
    { label: 'Patients', href: '/patients' },
    { label: 'Patient Details', href: `/patients/${patientId}` },
    { label: 'Apache Score' }
  ];

  const [formData, setFormData] = useState<ApacheScoreFormData>({
    age: '',
    glasgow_coma_score: '',
    temperature: '',
    temperature_unit: 'celsius',
    mean_arterial_pressure: '',
    heart_rate: '',
    respiratory_rate: '',
    fio2: '',
    pao2: '',
    pao2_unit: 'mmHg',
    paco2: '',
    paco2_unit: 'mmHg',
    atmospheric_pressure: '',
    atmospheric_pressure_unit: 'mmHg',
    arterial_ph: '',
    sodium: '',
    potassium: '',
    creatinine: '',
    creatinine_unit: 'mg_dl',
    acute_renal_failure: false,
    hematocrit: '',
    wbc: '',
    severe_organ_insufficiency_or_immunocompromised: false,
    admission_classification: 'medical',
    emergency_surgery: false,
    icu_admission_reason: 'asthma_allergy'
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApacheScoreResponse['data'] | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch last Apache Score on component mount
  useEffect(() => {
    const fetchLastApacheScore = async () => {
      try {
        setInitialLoading(true);
        const response = await fetchApi<ApacheScoreResponse>(
          API_ENDPOINTS.PATIENT.APACHE_II.LAST(patientId),
          {
            method: 'GET'
          }
        );

        if (response.success && response.data) {
          setResult(response.data as unknown as ApacheScoreResponse['data']);
          setShowForm(false);
        } else {
          // No previous data, show form
          setShowForm(true);
        }
      } catch (err) {
        // If error (e.g., 404 or no data), show form
        setShowForm(true);
      } finally {
        setInitialLoading(false);
      }
    };

    if (patientId) {
      fetchLastApacheScore();
    }
  }, [patientId]);

  const validateForm = (data: ApacheScoreFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    // Age
    if (data.age === '') {
      errors.age = 'Age is required';
    } else if (Number(data.age) < 0 || Number(data.age) > 130) {
      errors.age = 'Age must be between 0 and 130 years';
    }

    // Glasgow Coma Score
    if (data.glasgow_coma_score === '') {
      errors.glasgow_coma_score = 'Glasgow Coma Score is required';
    } else if (Number(data.glasgow_coma_score) < 3 || Number(data.glasgow_coma_score) > 15) {
      errors.glasgow_coma_score = 'Glasgow Coma Score must be between 3 and 15';
    }

    // Temperature
    if (data.temperature === '') {
      errors.temperature = 'Temperature is required';
    } else if (data.temperature_unit === 'celsius') {
      if (Number(data.temperature) < 25 || Number(data.temperature) > 45) {
        errors.temperature = 'Temperature must be between 25°C and 45°C';
      }
    } else {
      if (Number(data.temperature) < 77 || Number(data.temperature) > 113) {
        errors.temperature = 'Temperature must be between 77°F and 113°F';
      }
    }

    // Mean Arterial Pressure
    if (data.mean_arterial_pressure === '') {
      errors.mean_arterial_pressure = 'Mean Arterial Pressure is required';
    } else if (Number(data.mean_arterial_pressure) < 20 || Number(data.mean_arterial_pressure) > 300) {
      errors.mean_arterial_pressure = 'MAP must be between 20 and 300 mmHg';
    }

    // Heart Rate
    if (data.heart_rate === '') {
      errors.heart_rate = 'Heart Rate is required';
    } else if (Number(data.heart_rate) < 0 || Number(data.heart_rate) > 300) {
      errors.heart_rate = 'Heart Rate must be between 0 and 300 bpm';
    }

    // Respiratory Rate
    if (data.respiratory_rate === '') {
      errors.respiratory_rate = 'Respiratory Rate is required';
    } else if (Number(data.respiratory_rate) < 0 || Number(data.respiratory_rate) > 80) {
      errors.respiratory_rate = 'Respiratory Rate must be between 0 and 80 breaths/min';
    }

    // FiO2
    if (data.fio2 === '') {
      errors.fio2 = 'FiO2 is required';
    } else if (Number(data.fio2) < 21 || Number(data.fio2) > 100) {
      errors.fio2 = 'FiO2 must be between 21% and 100%';
    }

    // PaO2
    if (data.pao2 === '') {
      errors.pao2 = 'PaO2 is required';
    } else if (data.pao2_unit === 'mmHg') {
      if (Number(data.pao2) < 10 || Number(data.pao2) > 700) {
        errors.pao2 = 'PaO2 must be between 10 and 700 mmHg';
      }
    } else {
      if (Number(data.pao2) < 1.3 || Number(data.pao2) > 93.3) {
        errors.pao2 = 'PaO2 must be between 1.3 and 93.3 kPa';
      }
    }

    // PaCO2
    if (data.paco2 === '') {
      errors.paco2 = 'PaCO2 is required';
    } else if (data.paco2_unit === 'mmHg') {
      if (Number(data.paco2) < 5 || Number(data.paco2) > 150) {
        errors.paco2 = 'PaCO2 must be between 5 and 150 mmHg';
      }
    } else {
      if (Number(data.paco2) < 0.7 || Number(data.paco2) > 20) {
        errors.paco2 = 'PaCO2 must be between 0.7 and 20 kPa';
      }
    }

    // Atmospheric Pressure
    if (data.atmospheric_pressure === '') {
      errors.atmospheric_pressure = 'Atmospheric Pressure is required';
    } else if (data.atmospheric_pressure_unit === 'mmHg') {
      if (Number(data.atmospheric_pressure) < 500 || Number(data.atmospheric_pressure) > 810) {
        errors.atmospheric_pressure = 'Atmospheric Pressure must be between 500 and 810 mmHg';
      }
    } else {
      if (Number(data.atmospheric_pressure) < 66.7 || Number(data.atmospheric_pressure) > 108) {
        errors.atmospheric_pressure = 'Atmospheric Pressure must be between 66.7 and 108 kPa';
      }
    }

    // Arterial pH
    if (data.arterial_ph === '') {
      errors.arterial_ph = 'Arterial pH is required';
    } else if (Number(data.arterial_ph) < 6.5 || Number(data.arterial_ph) > 8.0) {
      errors.arterial_ph = 'Arterial pH must be between 6.5 and 8.0';
    }

    // Sodium
    if (data.sodium === '') {
      errors.sodium = 'Sodium is required';
    } else if (Number(data.sodium) < 100 || Number(data.sodium) > 200) {
      errors.sodium = 'Sodium must be between 100 and 200 mEq/L';
    }

    // Potassium
    if (data.potassium === '') {
      errors.potassium = 'Potassium is required';
    } else if (Number(data.potassium) < 1.0 || Number(data.potassium) > 10.0) {
      errors.potassium = 'Potassium must be between 1.0 and 10.0 mEq/L';
    }

    // Creatinine
    if (data.creatinine === '') {
      errors.creatinine = 'Creatinine is required';
    } else if (data.creatinine_unit === 'mg_dl') {
      if (Number(data.creatinine) < 0.1 || Number(data.creatinine) > 30) {
        errors.creatinine = 'Creatinine must be between 0.1 and 30 mg/dL';
      }
    } else {
      if (Number(data.creatinine) < 9 || Number(data.creatinine) > 2650) {
        errors.creatinine = 'Creatinine must be between 9 and 2650 μmol/L';
      }
    }

    // Hematocrit
    if (data.hematocrit === '') {
      errors.hematocrit = 'Hematocrit is required';
    } else if (Number(data.hematocrit) < 0 || Number(data.hematocrit) > 75) {
      errors.hematocrit = 'Hematocrit must be between 0% and 75%';
    }

    // WBC
    if (data.wbc === '') {
      errors.wbc = 'WBC is required';
    } else if (Number(data.wbc) < 0 || Number(data.wbc) > 200) {
      errors.wbc = 'WBC must be between 0 and 200 ×10³/μL';
    }

    return errors;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    // Clear validation error for this field on change
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? '' : parseFloat(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Run validation
    const errors = validateForm(formData);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please fix the validation errors below before submitting.');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        patient_id: patientId,
        age: Number(formData.age),
        glasgow_coma_score: Number(formData.glasgow_coma_score),
        temperature: Number(formData.temperature),
        temperature_unit: formData.temperature_unit,
        mean_arterial_pressure: Number(formData.mean_arterial_pressure),
        heart_rate: Number(formData.heart_rate),
        respiratory_rate: Number(formData.respiratory_rate),
        fio2: Number(formData.fio2),
        pao2: Number(formData.pao2),
        pao2_unit: formData.pao2_unit,
        paco2: Number(formData.paco2),
        paco2_unit: formData.paco2_unit,
        atmospheric_pressure: Number(formData.atmospheric_pressure),
        atmospheric_pressure_unit: formData.atmospheric_pressure_unit,
        arterial_ph: Number(formData.arterial_ph),
        sodium: Number(formData.sodium),
        potassium: Number(formData.potassium),
        creatinine: Number(formData.creatinine),
        creatinine_unit: formData.creatinine_unit,
        acute_renal_failure: formData.acute_renal_failure,
        hematocrit: Number(formData.hematocrit),
        wbc: Number(formData.wbc),
        severe_organ_insufficiency_or_immunocompromised: formData.severe_organ_insufficiency_or_immunocompromised,
        admission_classification: formData.admission_classification,
        emergency_surgery: formData.emergency_surgery,
        icu_admission_reason: formData.icu_admission_reason
      };

      const response = await fetchApi<ApacheScoreResponse>(
        API_ENDPOINTS.PATIENT.APACHE_II.CALCULATE,
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );

      if (response.success && response.data) {
        setResult(response.data as unknown as ApacheScoreResponse['data']);
        setShowForm(false);
      } else {
        setError(response.message || 'Failed to calculate Apache Score');
      }
    } catch (err) {
      console.error('Error calculating Apache Score:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate Apache Score');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      age: '',
      glasgow_coma_score: '',
      temperature: '',
      temperature_unit: 'celsius',
      mean_arterial_pressure: '',
      heart_rate: '',
      respiratory_rate: '',
      fio2: '',
      pao2: '',
      pao2_unit: 'mmHg',
      paco2: '',
      paco2_unit: 'mmHg',
      atmospheric_pressure: '',
      atmospheric_pressure_unit: 'mmHg',
      arterial_ph: '',
      sodium: '',
      potassium: '',
      creatinine: '',
      creatinine_unit: 'mg_dl',
      acute_renal_failure: false,
      hematocrit: '',
      wbc: '',
      severe_organ_insufficiency_or_immunocompromised: false,
      admission_classification: 'medical',
      emergency_surgery: false,
      icu_admission_reason: 'asthma_allergy'
    });
    setResult(null);
    setError(null);
    setValidationErrors({});
    setShowForm(true);
  };

  const handleCalculateNew = () => {
    setResult(null);
    setError(null);
    setShowForm(true);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Apache II Score Calculator</h1>
          <Breadcrumb items={breadcrumbItems} />
        </div>
      </div>

      <div className={styles.container}>
        {initialLoading && (
          <div className={styles.error} style={{ background: '#f3f4f6', border: 'none', color: '#374151' }}>Loading...</div>
        )}

        {!initialLoading && (
          <>
            {error && <div className={styles.error}>{error}</div>}

            {result && !showForm && (
              <>
                <div className={styles.resultCard}>
                  <h2>Apache II Score Result</h2>
                  <div className={styles.resultContent}>
                    <div className={styles.scoreDisplay}>
                      <span className={styles.scoreLabel}>Apache II Score:</span>
                      <span className={styles.scoreValue}>{result.apache_ii_score}</span>
                    </div>
                    {result.predicted_mortality_percent !== undefined && (
                      <div className={styles.mortalityDisplay}>
                        <span className={styles.mortalityLabel}>Predicted Mortality Rate:</span>
                        <span className={styles.mortalityValue}>
                          {result.predicted_mortality_percent.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    {/* <button
                      type="button"
                      onClick={handleCalculateNew}
                      className={styles.submitButton}
                    >
                      Calculate New Score
                    </button> */}
                  </div>
                </div>

            {result.component_scores && (
              <div className={styles.componentScoresCard}>
                <h3 className={styles.componentScoresTitle}>Component Scores Breakdown</h3>
                <div className={styles.componentScoresGrid}>
                  <div className={styles.componentScoreItem}>
                    <span className={styles.componentScoreLabel}>Age Score:</span>
                    <span className={styles.componentScoreValue}>{result.component_scores.age_score}</span>
                  </div>
                  <div className={styles.componentScoreItem}>
                    <span className={styles.componentScoreLabel}>Glasgow Coma Score:</span>
                    <span className={styles.componentScoreValue}>{result.component_scores.glasgow_coma_score}</span>
                  </div>
                  <div className={styles.componentScoreItem}>
                    <span className={styles.componentScoreLabel}>Temperature Score:</span>
                    <span className={styles.componentScoreValue}>{result.component_scores.temperature_score}</span>
                  </div>
                  <div className={styles.componentScoreItem}>
                    <span className={styles.componentScoreLabel}>Mean Arterial Pressure Score:</span>
                    <span className={styles.componentScoreValue}>{result.component_scores.mean_arterial_pressure_score}</span>
                  </div>
                  <div className={styles.componentScoreItem}>
                    <span className={styles.componentScoreLabel}>Heart Rate Score:</span>
                    <span className={styles.componentScoreValue}>{result.component_scores.heart_rate_score}</span>
                  </div>
                  <div className={styles.componentScoreItem}>
                    <span className={styles.componentScoreLabel}>Respiratory Rate Score:</span>
                    <span className={styles.componentScoreValue}>{result.component_scores.respiratory_rate_score}</span>
                  </div>
                  <div className={styles.componentScoreItem}>
                    <span className={styles.componentScoreLabel}>Oxygenation Score:</span>
                    <span className={styles.componentScoreValue}>{result.component_scores.oxygenation_score}</span>
                  </div>
                  <div className={styles.componentScoreItem}>
                    <span className={styles.componentScoreLabel}>Arterial pH Score:</span>
                    <span className={styles.componentScoreValue}>{result.component_scores.arterial_ph_score}</span>
                  </div>
                  <div className={styles.componentScoreItem}>
                    <span className={styles.componentScoreLabel}>Sodium Score:</span>
                    <span className={styles.componentScoreValue}>{result.component_scores.sodium_score}</span>
                  </div>
                  <div className={styles.componentScoreItem}>
                    <span className={styles.componentScoreLabel}>Potassium Score:</span>
                    <span className={styles.componentScoreValue}>{result.component_scores.potassium_score}</span>
                  </div>
                  <div className={styles.componentScoreItem}>
                    <span className={styles.componentScoreLabel}>Creatinine Score:</span>
                    <span className={styles.componentScoreValue}>{result.component_scores.creatinine_score}</span>
                  </div>
                  <div className={styles.componentScoreItem}>
                    <span className={styles.componentScoreLabel}>Hematocrit Score:</span>
                    <span className={styles.componentScoreValue}>{result.component_scores.hematocrit_score}</span>
                  </div>
                  <div className={styles.componentScoreItem}>
                    <span className={styles.componentScoreLabel}>WBC Score:</span>
                    <span className={styles.componentScoreValue}>{result.component_scores.wbc_score}</span>
                  </div>
                  <div className={styles.componentScoreItem}>
                    <span className={styles.componentScoreLabel}>Chronic Health Score:</span>
                    <span className={styles.componentScoreValue}>{result.component_scores.chronic_health_score}</span>
                  </div>
                </div>
              </div>
            )}
              </>
            )}

            {showForm && (
              <form onSubmit={handleSubmit} className={styles.form}>
          {/* Vital Signs Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Vital Signs</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="age">Age (years) <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  className={`${styles.input} ${validationErrors.age ? styles.inputError : ''}`}
                  required
                  min="0"
                  max="130"
                />
                {validationErrors.age && <span className={styles.fieldError}>{validationErrors.age}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="glasgow_coma_score">Glasgow Coma Score <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  id="glasgow_coma_score"
                  name="glasgow_coma_score"
                  value={formData.glasgow_coma_score}
                  onChange={handleInputChange}
                  className={`${styles.input} ${validationErrors.glasgow_coma_score ? styles.inputError : ''}`}
                  required
                  min="3"
                  max="15"
                />
                {validationErrors.glasgow_coma_score && <span className={styles.fieldError}>{validationErrors.glasgow_coma_score}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="temperature">Temperature <span className={styles.required}>*</span></label>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    id="temperature"
                    name="temperature"
                    value={formData.temperature}
                    onChange={handleInputChange}
                    className={`${styles.input} ${validationErrors.temperature ? styles.inputError : ''}`}
                    required
                    step="0.1"
                  />
                  <select
                    name="temperature_unit"
                    value={formData.temperature_unit}
                    onChange={handleInputChange}
                    className={styles.unitSelect}
                  >
                    <option value="celsius">°C</option>
                    <option value="fahrenheit">°F</option>
                  </select>
                </div>
                {validationErrors.temperature && <span className={styles.fieldError}>{validationErrors.temperature}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="mean_arterial_pressure">Mean Arterial Pressure (mmHg) <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  id="mean_arterial_pressure"
                  name="mean_arterial_pressure"
                  value={formData.mean_arterial_pressure}
                  onChange={handleInputChange}
                  className={`${styles.input} ${validationErrors.mean_arterial_pressure ? styles.inputError : ''}`}
                  required
                  min="20"
                  max="300"
                />
                {validationErrors.mean_arterial_pressure && <span className={styles.fieldError}>{validationErrors.mean_arterial_pressure}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="heart_rate">Heart Rate (bpm) <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  id="heart_rate"
                  name="heart_rate"
                  value={formData.heart_rate}
                  onChange={handleInputChange}
                  className={`${styles.input} ${validationErrors.heart_rate ? styles.inputError : ''}`}
                  required
                  min="0"
                  max="300"
                />
                {validationErrors.heart_rate && <span className={styles.fieldError}>{validationErrors.heart_rate}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="respiratory_rate">Respiratory Rate (breaths/min) <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  id="respiratory_rate"
                  name="respiratory_rate"
                  value={formData.respiratory_rate}
                  onChange={handleInputChange}
                  className={`${styles.input} ${validationErrors.respiratory_rate ? styles.inputError : ''}`}
                  required
                  min="0"
                  max="80"
                />
                {validationErrors.respiratory_rate && <span className={styles.fieldError}>{validationErrors.respiratory_rate}</span>}
              </div>
            </div>
          </div>

          {/* Respiratory Parameters Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Respiratory Parameters</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="fio2">FiO2 (%) <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  id="fio2"
                  name="fio2"
                  value={formData.fio2}
                  onChange={handleInputChange}
                  className={`${styles.input} ${validationErrors.fio2 ? styles.inputError : ''}`}
                  required
                  min="21"
                  max="100"
                  step="0.1"
                />
                {validationErrors.fio2 && <span className={styles.fieldError}>{validationErrors.fio2}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="pao2">PaO2 <span className={styles.required}>*</span></label>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    id="pao2"
                    name="pao2"
                    value={formData.pao2}
                    onChange={handleInputChange}
                    className={`${styles.input} ${validationErrors.pao2 ? styles.inputError : ''}`}
                    required
                    min="0"
                  />
                  <select
                    name="pao2_unit"
                    value={formData.pao2_unit}
                    onChange={handleInputChange}
                    className={styles.unitSelect}
                  >
                    <option value="mmHg">mmHg</option>
                    <option value="kPa">kPa</option>
                  </select>
                </div>
                {validationErrors.pao2 && <span className={styles.fieldError}>{validationErrors.pao2}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="paco2">PaCO2 <span className={styles.required}>*</span></label>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    id="paco2"
                    name="paco2"
                    value={formData.paco2}
                    onChange={handleInputChange}
                    className={`${styles.input} ${validationErrors.paco2 ? styles.inputError : ''}`}
                    required
                    min="0"
                  />
                  <select
                    name="paco2_unit"
                    value={formData.paco2_unit}
                    onChange={handleInputChange}
                    className={styles.unitSelect}
                  >
                    <option value="mmHg">mmHg</option>
                    <option value="kPa">kPa</option>
                  </select>
                </div>
                {validationErrors.paco2 && <span className={styles.fieldError}>{validationErrors.paco2}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="atmospheric_pressure">Atmospheric Pressure <span className={styles.required}>*</span></label>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    id="atmospheric_pressure"
                    name="atmospheric_pressure"
                    value={formData.atmospheric_pressure}
                    onChange={handleInputChange}
                    className={`${styles.input} ${validationErrors.atmospheric_pressure ? styles.inputError : ''}`}
                    required
                    min="0"
                  />
                  <select
                    name="atmospheric_pressure_unit"
                    value={formData.atmospheric_pressure_unit}
                    onChange={handleInputChange}
                    className={styles.unitSelect}
                  >
                    <option value="mmHg">mmHg</option>
                    <option value="kPa">kPa</option>
                  </select>
                </div>
                {validationErrors.atmospheric_pressure && <span className={styles.fieldError}>{validationErrors.atmospheric_pressure}</span>}
              </div>
            </div>
          </div>

          {/* Laboratory Values Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Laboratory Values</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="arterial_ph">Arterial pH <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  id="arterial_ph"
                  name="arterial_ph"
                  value={formData.arterial_ph}
                  onChange={handleInputChange}
                  className={`${styles.input} ${validationErrors.arterial_ph ? styles.inputError : ''}`}
                  required
                  min="6.5"
                  max="8"
                  step="0.01"
                />
                {validationErrors.arterial_ph && <span className={styles.fieldError}>{validationErrors.arterial_ph}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="sodium">Sodium (mEq/L) <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  id="sodium"
                  name="sodium"
                  value={formData.sodium}
                  onChange={handleInputChange}
                  className={`${styles.input} ${validationErrors.sodium ? styles.inputError : ''}`}
                  required
                  min="100"
                  max="200"
                />
                {validationErrors.sodium && <span className={styles.fieldError}>{validationErrors.sodium}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="potassium">Potassium (mEq/L) <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  id="potassium"
                  name="potassium"
                  value={formData.potassium}
                  onChange={handleInputChange}
                  className={`${styles.input} ${validationErrors.potassium ? styles.inputError : ''}`}
                  required
                  min="1"
                  max="10"
                  step="0.1"
                />
                {validationErrors.potassium && <span className={styles.fieldError}>{validationErrors.potassium}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="creatinine">Creatinine <span className={styles.required}>*</span></label>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    id="creatinine"
                    name="creatinine"
                    value={formData.creatinine}
                    onChange={handleInputChange}
                    className={`${styles.input} ${validationErrors.creatinine ? styles.inputError : ''}`}
                    required
                    min="0"
                    step="0.01"
                  />
                  <select
                    name="creatinine_unit"
                    value={formData.creatinine_unit}
                    onChange={handleInputChange}
                    className={styles.unitSelect}
                  >
                    <option value="mg_dl">mg/dL</option>
                    <option value="umol_l">μmol/L</option>
                  </select>
                </div>
                {validationErrors.creatinine && <span className={styles.fieldError}>{validationErrors.creatinine}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="hematocrit">Hematocrit (%) <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  id="hematocrit"
                  name="hematocrit"
                  value={formData.hematocrit}
                  onChange={handleInputChange}
                  className={`${styles.input} ${validationErrors.hematocrit ? styles.inputError : ''}`}
                  required
                  min="0"
                  max="75"
                  step="0.1"
                />
                {validationErrors.hematocrit && <span className={styles.fieldError}>{validationErrors.hematocrit}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="wbc">WBC (×10³/μL) <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  id="wbc"
                  name="wbc"
                  value={formData.wbc}
                  onChange={handleInputChange}
                  className={`${styles.input} ${validationErrors.wbc ? styles.inputError : ''}`}
                  required
                  min="0"
                  max="200"
                  step="0.1"
                />
                {validationErrors.wbc && <span className={styles.fieldError}>{validationErrors.wbc}</span>}
              </div>
            </div>
          </div>

          {/* Clinical Conditions Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Clinical Conditions</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="admission_classification">Admission Classification <span className={styles.required}>*</span></label>
                <select
                  id="admission_classification"
                  name="admission_classification"
                  value={formData.admission_classification}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                >
                  <option value="medical">Medical</option>
                  <option value="elective_post_operative">Elective Post-Operative</option>
                  <option value="emergency_post_operative">Emergency Post-Operative</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="icu_admission_reason">ICU Admission Reason <span className={styles.required}>*</span></label>
                <select
                  id="icu_admission_reason"
                  name="icu_admission_reason"
                  value={formData.icu_admission_reason}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                >
                  <option value="asthma_allergy">Asthma/Allergy</option>
                  <option value="copd">COPD</option>
                  <option value="pulmonary_edema_non_cardiogenic">Pulmonary Edema (Non-Cardiogenic)</option>
                  <option value="postrespiratory_arrest">Post-Respiratory Arrest</option>
                  <option value="aspiration_poisoning_toxic">Aspiration/Poisoning/Toxic</option>
                  <option value="pulmonary_embolus">Pulmonary Embolus</option>
                  <option value="infection">Infection</option>
                  <option value="neoplasm">Neoplasm</option>
                  <option value="hypertension">Hypertension</option>
                  <option value="rhythm_disturbance">Rhythm Disturbance</option>
                  <option value="congestive_heart_failure">Congestive Heart Failure</option>
                  <option value="hemorrhagic_shock_hypovolemia">Hemorrhagic Shock/Hypovolemia</option>
                  <option value="coronary_artery_disease">Coronary Artery Disease</option>
                  <option value="cabg">CABG</option>
                  <option value="sepsis">Sepsis</option>
                  <option value="postcardiac_arrest">Post-Cardiac Arrest</option>
                  <option value="cardiogenic_shock">Cardiogenic Shock</option>
                  <option value="dissecting_thoracic_abdominal_aneurysm">Dissecting Thoracic/Abdominal Aneurysm</option>
                  <option value="multiple_trauma">Multiple Trauma</option>
                  <option value="head_trauma">Head Trauma</option>
                  <option value="seizure_disorder">Seizure Disorder</option>
                  <option value="ich_sdh_sah">ICH/SDH/SAH</option>
                  <option value="drug_overdose">Drug Overdose</option>
                  <option value="diabetic_ketoacidosis">Diabetic Ketoacidosis</option>
                  <option value="gi_bleeding">GI Bleeding</option>
                  <option value="metabolic_renal">Metabolic/Renal</option>
                  <option value="respiratory">Respiratory</option>
                  <option value="neurologic">Neurologic</option>
                  <option value="cardiovascular">Cardiovascular</option>
                  <option value="gastrointestinal">Gastrointestinal</option>
                  <option value="chronic_cardiovascular_disease">Chronic Cardiovascular Disease</option>
                  <option value="peripheral_vascular_surgery">Peripheral Vascular Surgery</option>
                  <option value="heart_valve_surgery">Heart Valve Surgery</option>
                  <option value="craniotomy_for_neoplasm">Craniotomy for Neoplasm</option>
                  <option value="renal_surgery_for_neoplasm">Renal Surgery for Neoplasm</option>
                  <option value="renal_transplant">Renal Transplant</option>
                  <option value="thoracic_surgery_for_neoplasm">Thoracic Surgery for Neoplasm</option>
                  <option value="craniotomy_for_ich_sdh_sah">Craniotomy for ICH/SDH/SAH</option>
                  <option value="laminectomy_and_other_spinal_surgery">Laminectomy and Other Spinal Surgery</option>
                  <option value="respiratory_insufficiency_after_or">Respiratory Insufficiency After OR</option>
                  <option value="gi_perforation_obstruction">GI Perforation/Obstruction</option>
                  <option value="post_op_sepsis">Post-Op Sepsis</option>
                  <option value="post_op_postarrest">Post-Op Post-Arrest</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="acute_renal_failure"
                    checked={formData.acute_renal_failure}
                    onChange={handleInputChange}
                    className={styles.checkbox}
                  />
                  Acute Renal Failure
                </label>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="severe_organ_insufficiency_or_immunocompromised"
                    checked={formData.severe_organ_insufficiency_or_immunocompromised}
                    onChange={handleInputChange}
                    className={styles.checkbox}
                  />
                  Severe Organ Insufficiency or Immunocompromised
                </label>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="emergency_surgery"
                    checked={formData.emergency_surgery}
                    onChange={handleInputChange}
                    className={styles.checkbox}
                  />
                  Emergency Surgery
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={() => router.back()}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReset}
              className={styles.resetButton}
            >
              Reset
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Calculating...' : 'Calculate Apache Score'}
            </button>
          </div>
        </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

