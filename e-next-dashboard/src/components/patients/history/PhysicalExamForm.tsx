import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/patienthistory.module.css';
import { patientService } from '@/services/patientService';

interface PhysicalExamFormProps {
  patientId: string;
  isFromSearch?: boolean;
  setActiveTab: (tab: string) => void;
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
const pupilReactionOptions = ['normal', 'sluggish', 'non-reactive'];
const powerOptions = [ '1/5', '2/5', '3/5', '4/5'];
const cvsOptions = ['S1S2 Normal', 'S1S2 Abnormal', 'S3S4 Normal', 'S3S4 Abnormal'];
const rsOptions = ['B/L Rhonchi', 'Wheeze', 'Bronchial Breathing', 'Normal Vesicular Breathing'];
const paOptions = ['Soft', 'Tender', 'Distended', 'Bowel Sound Absent', 'Bowel Sound Present'];

const PhysicalExamForm = ({ patientId, isFromSearch = false, setActiveTab }: PhysicalExamFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    cvs: '',
    rs: '',
    p_a: '',
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
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? Number(value) : value,
    });
  };

  const calculateTotalScore = () => {
    const { eye_opening, verbal_response, motor_response } = formData;
    if (eye_opening === null || verbal_response === null || motor_response === null) return "-";
    return eye_opening + verbal_response + motor_response;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // if (isFromSearch) {
    //   router.push(`/patients/${patientId}/history`);
    // } else {
    //   setActiveTab('investigation');
    // }
    try {
      const response = await patientService.addHEENT(
        process.env.NEXT_PUBLIC_ORGANISATION_ID || 'null',
        {
          patient_id: patientId,
          ...formData
        }
      );
      // // console.log('response', response);
      // // console.log('going to success');
      if (response.success) {
        // // console.log('Physical exam saved successfully');
        // // console.log('isFromSearch:', isFromSearch);
        
        if (isFromSearch) {
          // // console.log('Navigating to history page');
          router.push(`/patients/${patientId}/history`);
        } else {
          // // console.log('Setting active tab to investigation');
          setActiveTab('investigation');
        }
      } else {
        setError(response.message || 'Failed to save physical examination');
      }
    } catch (err) {
      // console.error('Error saving physical examination:', err);
      setError(err instanceof Error ? err.message : 'Failed to save physical examination');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formContent}>
        {/* Left Column */}
        <div className={styles.column}>
          {/* CNS, RS, P/A */}
          <div className={styles.section}>
            {/* <h2>System Examination</h2> */}
            <div className={styles.inputGroup}>
              <label>CVS:</label>
              <select
                name="cvs"
                value={formData.cvs}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="">Select CVS</option>
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
                <option value="">Select RS</option>
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
                <option value="">Select P/A</option>
                {paOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pupils */}
          <h2>CNS. Pupils :</h2>
          <h2>Right Pupil:</h2>
          <div className={styles.section}>
            {/* <h2>Pupils</h2> */}
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
              {/* </div> */}
            </div>
            
        
          </div>
          <h2>Left Pupil:</h2>
          <div className={styles.section}>
            {/* <div className={styles.subsection}> */}
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
            {/* <h2>GCS</h2> */}
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
            <div className={styles.inputGroup}>
              <label>GCS SCORE:</label>
              <span>{calculateTotalScore()}</span>
            </div>
          </div>

          {/* Power */}
          <h2>Deficit M / Power:</h2>
          <div className={styles.section}>
            {/* <div className={styles.powerGrid}> */}
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
            {/* <h2>Other Medical Findings</h2> */}
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
          {loading ? 'Saving...' : isFromSearch ? 'Save' : 'Save & Next'}
        </button>
      </div>
    </form>
  );

}



export default PhysicalExamForm; 