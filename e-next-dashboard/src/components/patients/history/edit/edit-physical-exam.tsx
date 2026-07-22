import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/history-page-style/add/edit-physical-exam.module.css';
import { patientService } from '@/services/patientService';

interface PhysicalExamFormProps {
  patientId: string;
}

interface FormData {
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
  rul: string;
  lul: string;
  rll: string;
  lll: string;
  other_medical_findings: string;
}

const pupilSizeOptions = ['1mm', '2mm', '3mm', '4mm'];
const pupilReactionOptions = ['normal', 'sluggish', 'non_reactive'];
const powerOptions = [ '1/5', '2/5', '3/5', '4/5'];
const cvsOptions = ['S1S2 Normal', 'S1S2 Abnormal', 'S3S4 Normal', 'S3S4 Abnormal'];
const rsOptions = ['B/L Rhonchi', 'Wheeze', 'Bronchial Breathing', 'Normal Vesicular Breathing'];
const paOptions = ['Soft', 'Tender', 'Distended', 'Bowel Sound Absent', 'Bowel Sound Present'];

export default function PhysicalExamForm({ patientId }: PhysicalExamFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<FormData | null>(null);

  const [formData, setFormData] = useState<FormData>({
    cvs: 'S1S2 Normal',
    rs: 'Normal Vesicular Breathing',
    p_a: 'Bowel Sound Present',
    right_pupil_size: '1mm',
    right_pupil_reaction: 'normal',
    left_pupil_size: '1mm',
    left_pupil_reaction: 'normal',
    eye_opening: 1,
    verbal_response: 1,
    motor_response: 1,
    rul: '1/5',
    lul: '1/5',
    rll: '1/5',
    lll: '1/5',
    other_medical_findings: ''
  });

  useEffect(() => {
    loadPatientHEENT();
  }, [patientId]);

  const loadPatientHEENT = async () => {
    try {
      const response = await patientService.getPatientInfo(patientId);
      if (response.success && response.data) {
        const heent = response.data.heent;
        const newFormData = {
          cvs: heent.cvs || 'S1S2 Normal',
          rs: heent.rs || 'Normal Vesicular Breathing',
          p_a: heent.p_a || 'Bowel Sound Present',
          right_pupil_size: heent.right_pupil_size || '1mm',
          right_pupil_reaction: heent.right_pupil_reaction || 'normal',
          left_pupil_size: heent.left_pupil_size || '1mm',
          left_pupil_reaction: heent.left_pupil_reaction || 'normal',
          eye_opening: heent.eye_opening || 1,
          verbal_response: heent.verbal_response || 1,
          motor_response: heent.motor_response || 1,
          rul: heent.rul || '1/5',
          lul: heent.lul || '1/5',
          rll: heent.rll || '1/5',
          lll: heent.lll || '1/5',
          other_medical_findings: heent.other_medical_findings || ''
        };
        setFormData(newFormData);
        setOriginalData(newFormData);
      }
    } catch (err) {
      console.error('Error loading patient HEENT:', err);
      setError('Failed to load patient physical examination data');
    } finally {
      setLoading(false);
    }
  };

  // GCS Options based on the image
  const eyeOpeningOptions = [
    { value: 4, label: 'Spontaneous (4)' },
    { value: 3, label: 'To Voice (3)' },
    { value: 2, label: 'To Pain (2)' },
    { value: 1, label: 'None (1)' }
  ];

  const verbalResponseOptions = [
    { value: 5, label: 'Oriented (5)' },
    { value: 4, label: 'Confused (4)' },
    { value: 3, label: 'Inapp. Words (3)' },
    { value: 2, label: 'Incomp. Sound (2)' },
    { value: 1, label: 'Intubated Vt (1)' }
  ];

  const motorResponseOptions = [
    { value: 6, label: 'Obeys Commands (6)' },
    { value: 5, label: 'Localized Pain (5)' },
    { value: 4, label: 'Withdraw to Pain (4)' },
    { value: 3, label: 'Flexion to Pain (3)' },
    { value: 2, label: 'Extension to Pain (2)' },
    { value: 1, label: 'None (1)' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Convert GCS values to numbers
    if (name === 'eye_opening' || name === 'verbal_response' || name === 'motor_response') {
      setFormData({
        ...formData,
        [name]: value ? Number(value) : value
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const calculateTotalScore = () => {
    const { eye_opening, verbal_response, motor_response } = formData;
    // Convert values to numbers and check if they are valid
    const eye = Number(eye_opening);
    const verbal = Number(verbal_response);
    const motor = Number(motor_response);
    
    if (isNaN(eye) || isNaN(verbal) || isNaN(motor)) return "-";
    return eye + verbal + motor;
  };
  
  const getChangedFields = () => {
    if (!originalData) return { ...formData, patient_id: patientId };

    const changes: Partial<FormData & { patient_id: string }> = {
      patient_id: patientId
    };

    // Check each field and only include changed ones
    if (formData.cvs !== originalData.cvs) changes.cvs = formData.cvs;
    if (formData.rs !== originalData.rs) changes.rs = formData.rs;
    if (formData.p_a !== originalData.p_a) changes.p_a = formData.p_a;
    if (formData.right_pupil_size !== originalData.right_pupil_size) changes.right_pupil_size = formData.right_pupil_size;
    if (formData.right_pupil_reaction !== originalData.right_pupil_reaction) changes.right_pupil_reaction = formData.right_pupil_reaction;
    if (formData.left_pupil_size !== originalData.left_pupil_size) changes.left_pupil_size = formData.left_pupil_size;
    if (formData.left_pupil_reaction !== originalData.left_pupil_reaction) changes.left_pupil_reaction = formData.left_pupil_reaction;
    if (formData.eye_opening !== originalData.eye_opening) changes.eye_opening = formData.eye_opening;
    if (formData.verbal_response !== originalData.verbal_response) changes.verbal_response = formData.verbal_response;
    if (formData.motor_response !== originalData.motor_response) changes.motor_response = formData.motor_response;
    if (formData.rul !== originalData.rul) changes.rul = formData.rul;
    if (formData.lul !== originalData.lul) changes.lul = formData.lul;
    if (formData.rll !== originalData.rll) changes.rll = formData.rll;
    if (formData.lll !== originalData.lll) changes.lll = formData.lll;
    if (formData.other_medical_findings !== originalData.other_medical_findings) changes.other_medical_findings = formData.other_medical_findings;

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
        cvs: changedData.cvs || formData.cvs,
        rs: changedData.rs || formData.rs,
        p_a: changedData.p_a || formData.p_a,
        right_pupil_size: changedData.right_pupil_size || formData.right_pupil_size,
        right_pupil_reaction: changedData.right_pupil_reaction || formData.right_pupil_reaction,
        left_pupil_size: changedData.left_pupil_size || formData.left_pupil_size,
        left_pupil_reaction: changedData.left_pupil_reaction || formData.left_pupil_reaction,
        eye_opening: changedData.eye_opening ?? formData.eye_opening,
        verbal_response: changedData.verbal_response ?? formData.verbal_response,
        motor_response: changedData.motor_response ?? formData.motor_response,
        rul: changedData.rul || formData.rul,
        lul: changedData.lul || formData.lul,
        rll: changedData.rll || formData.rll,
        lll: changedData.lll || formData.lll,
        other_medical_findings: changedData.other_medical_findings || formData.other_medical_findings
      };

      const response = await patientService.updateHEENT(patientId, updateData);
      if (response.success) {
        router.push(`/patients/${patientId}/history`);
      } else {
        setError(response.message || 'Failed to update physical examination');
      }
    } catch (err) {
      console.error('Error updating physical examination:', err);
      setError(err instanceof Error ? err.message : 'Failed to update physical examination');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading physical examination data...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formContent}>
        {/* Left Column */}
        <div className={styles.column}>
          {/* CNS, RS, P/A */}
          <h2>System Examination</h2>
          <div className={styles.section}>
            
            <div className={styles.inputGroup}>
              <label>CVS:</label>
              <select
                name="cvs"
                value={formData.cvs}
                onChange={handleInputChange}
                className={styles.select}
              >
                {cvsOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label>RS:</label>
              <select
                name="rs"
                value={formData.rs}
                onChange={handleInputChange}
                className={styles.select}
              >
                {rsOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label>P/A:</label>
              <select
                name="p_a"
                value={formData.p_a}
                onChange={handleInputChange}
                className={styles.select}
              >
                {paOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pupils */}
          <h2 style={{fontSize: '16px', fontWeight: '500'}}>CNS. Pupils :</h2>
          <h2 style={{fontSize: '14px', fontWeight: '500'}}>Right Pupil:</h2>
          <div className={styles.section}>
            {/* <div className={styles.subsection}> */}
              {/* <h2>Right Pupil:</h2> */}
              <div className={styles.inputGroup}>
                <label>Size:</label>
                <select
                  name="right_pupil_size"
                  value={formData.right_pupil_size}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  {pupilSizeOptions.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              
            {/* </div> */}
            <div className={styles.inputGroup}>
                <label>Reaction:</label>
                <select
                  name="right_pupil_reaction"
                  value={formData.right_pupil_reaction}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  {pupilReactionOptions.map(reaction => (
                    <option key={reaction} value={reaction}>{reaction}</option>
                  ))}
                </select>
              </div>
              </div>
              <h2 style={{fontSize: '14px', fontWeight: '500'}}>Left Pupil:</h2>
            <div className={styles.section}>
              {/* <h2>Left Pupil:</h2> */}
              <div className={styles.inputGroup}>
                <label>Size:</label>
                <select
                  name="left_pupil_size"
                  value={formData.left_pupil_size}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  {pupilSizeOptions.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Reaction:</label>
                <select
                  name="left_pupil_reaction"
                  value={formData.left_pupil_reaction}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  {pupilReactionOptions.map(reaction => (
                    <option key={reaction} value={reaction}>{reaction}</option>
                  ))}
                </select>
              </div>
            {/* </div> */}
          </div>
        </div>

        {/* Right Column */}
        <h2>GCS:</h2>
        <div className={styles.column}>
          {/* GCS */}
          <div className={styles.section}>
            <div className={styles.inputGroup}>
              <label>Eye Opening (E):</label>
              <select
                name="eye_opening"
                value={formData.eye_opening}
                onChange={handleInputChange}
                className={styles.select}
              >
                {eyeOpeningOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label>Verbal Response (V):</label>
              <select
                name="verbal_response"
                value={formData.verbal_response}
                onChange={handleInputChange}
                className={styles.select}
              >
                {verbalResponseOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label>Motor Response (M):</label>
              <select
                name="motor_response"
                value={formData.motor_response}
                onChange={handleInputChange}
                className={styles.select}
              >
                {motorResponseOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
            </div>
          <div className={styles.gcsItem}>
              <label>GCS SCORE:</label>
              <span>{calculateTotalScore()}</span>
            </div>
          </div>

          {/* Power */}
        
          <h2>Deficit M / Power:</h2>
          <div className={styles.section}>
            <div className={styles.powerGrid}>
              <div className={styles.inputGroup}>
                <label>RUL:</label>
                <select
                  name="rul"
                  value={formData.rul}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  {powerOptions.map(power => (
                    <option key={power} value={power}>{power}</option>
                  ))}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>RLL:</label>
                <select
                  name="rll"
                  value={formData.rll}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  {powerOptions.map(power => (
                    <option key={power} value={power}>{power}</option>
                  ))}
                </select>
              </div>
              </div>
              <div className={styles.powerGrid}>
              
              <div className={styles.inputGroup}>
                <label>LUL:</label>
                <select
                  name="lul"
                  value={formData.lul}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  {powerOptions.map(power => (
                    <option key={power} value={power}>{power}</option>
                  ))}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>LLL:</label>
                <select
                  name="lll"
                  value={formData.lll}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  {powerOptions.map(power => (
                    <option key={power} value={power}>{power}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Other Medical Findings */}
          <h2>Other Medical Findings</h2>
          <div className={styles.section}>
            <textarea
              name="other_medical_findings"
              value={formData.other_medical_findings}
              onChange={handleInputChange}
              className={styles.textarea}
              rows={4}
              placeholder="Enter other medical findings"
            />
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
  );
} 