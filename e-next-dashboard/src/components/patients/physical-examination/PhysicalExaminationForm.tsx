'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/physicalExam.module.css';

interface PhysicalExaminationFormProps {
  patientId: string;
}

interface ExamFormData {
  cvs: string;
  rs: string;
  pa: string;
  rightPupilSize: string;
  rightPupilReaction: string;
  leftPupilSize: string;
  leftPupilReaction: string;
  eyeOpening: string;
  verbalResponse: string;
  motorResponse: string;
  gcsScore: string;
  rlu: string;
  llu: string;
  rll: string;
  lll: string;
  otherFindings: string;
}

const PhysicalExaminationForm = ({ patientId }: PhysicalExaminationFormProps) => {
  const router = useRouter();
  const [formData, setFormData] = useState<ExamFormData>({
    cvs: '',
    rs: '',
    pa: '',
    rightPupilSize: '',
    rightPupilReaction: '',
    leftPupilSize: '',
    leftPupilReaction: '',
    eyeOpening: '',
    verbalResponse: '',
    motorResponse: '',
    gcsScore: '',
    rlu: '',
    llu: '',
    rll: '',
    lll: '',
    otherFindings: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save form data logic here
    router.push(`/patients/add/investigation?patientId=${patientId}`);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.section}>
        <div className={styles.formGroup}>
          <label>CVS:</label>
          <textarea
            name="cvs"
            value={formData.cvs}
            onChange={handleInputChange}
            placeholder="Your Free Flow Text"
          />
        </div>

        <div className={styles.formGroup}>
          <label>RS:</label>
          <textarea
            name="rs"
            value={formData.rs}
            onChange={handleInputChange}
            placeholder="Your Free Flow Text"
          />
        </div>

        <div className={styles.formGroup}>
          <label>P/A:</label>
          <textarea
            name="pa"
            value={formData.pa}
            onChange={handleInputChange}
            placeholder="Your Free Flow Text"
          />
        </div>

        <div className={styles.section}>
          <h3>CNS Pupils:</h3>
          <div className={styles.pupilsGrid}>
            <div className={styles.formGroup}>
              <label>Right Pupil Size:</label>
              <select
                name="rightPupilSize"
                value={formData.rightPupilSize}
                onChange={handleInputChange}
              >
                <option value="">Select right pupil size</option>
                <option value="1mm">1mm</option>
                <option value="2mm">2mm</option>
                <option value="3mm">3mm</option>
                {/* Add more options as needed */}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Right Pupil Reaction:</label>
              <select
                name="rightPupilReaction"
                value={formData.rightPupilReaction}
                onChange={handleInputChange}
              >
                <option value="">Select pupil reaction</option>
                <option value="reactive">Reactive</option>
                <option value="non-reactive">Non-reactive</option>
                <option value="sluggish">Sluggish</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Left Pupil Size:</label>
              <select
                name="leftPupilSize"
                value={formData.leftPupilSize}
                onChange={handleInputChange}
              >
                <option value="">Select left pupil size</option>
                <option value="1mm">1mm</option>
                <option value="2mm">2mm</option>
                <option value="3mm">3mm</option>
                {/* Add more options as needed */}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Left Pupil Reaction:</label>
              <select
                name="leftPupilReaction"
                value={formData.leftPupilReaction}
                onChange={handleInputChange}
              >
                <option value="">Select pupil reaction</option>
                <option value="reactive">Reactive</option>
                <option value="non-reactive">Non-reactive</option>
                <option value="sluggish">Sluggish</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3>GCS:</h3>
          <div className={styles.gcsGrid}>
            <div className={styles.formGroup}>
              <label>Eye Opening (E):</label>
              <select
                name="eyeOpening"
                value={formData.eyeOpening}
                onChange={handleInputChange}
              >
                <option value="">Select Eye Opening</option>
                <option value="4">4 - Spontaneous</option>
                <option value="3">3 - To Voice</option>
                <option value="2">2 - To Pain</option>
                <option value="1">1 - None</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Verbal Response (V):</label>
              <select
                name="verbalResponse"
                value={formData.verbalResponse}
                onChange={handleInputChange}
              >
                <option value="">Select Verbal Response</option>
                <option value="5">5 - Oriented</option>
                <option value="4">4 - Confused</option>
                <option value="3">3 - Inappropriate Words</option>
                <option value="2">2 - Incomprehensible Sounds</option>
                <option value="1">1 - None</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Motor Response (M):</label>
              <select
                name="motorResponse"
                value={formData.motorResponse}
                onChange={handleInputChange}
              >
                <option value="">Select Motor Response</option>
                <option value="6">6 - Obeys Commands</option>
                <option value="5">5 - Localizes Pain</option>
                <option value="4">4 - Withdrawal from Pain</option>
                <option value="3">3 - Flexion to Pain</option>
                <option value="2">2 - Extension to Pain</option>
                <option value="1">1 - None</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>GCS SCORE:</label>
              <input
                type="text"
                name="gcsScore"
                value={formData.gcsScore}
                onChange={handleInputChange}
                placeholder="Score"
                readOnly
              />
            </div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Other medical Findings:</label>
          <textarea
            name="otherFindings"
            value={formData.otherFindings}
            onChange={handleInputChange}
            placeholder="Enter other medical findings"
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.submitButton}>
          Save & Next
        </button>
      </div>
    </form>
  );
};

export default PhysicalExaminationForm; 