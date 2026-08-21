'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/styles/patient-details/history-sheet/edit-patient-basic-info.module.css';
import { remoteCenterService } from '@/services/remoteCenterService';
import { icuService } from '@/services/icuService';
import { patientService, Patient } from '@/services/patientService';
import { userService, User } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import debounce from 'lodash/debounce';

interface RemoteCenter {
  id: string;
  name: string;
}

interface ICU {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  primary_profile: {
    first_name: string;
    last_name: string;
    full_name: string;
  };
}

interface Consultant {
  id: string;
  primary_profile: {
    first_name: string;
    last_name: string;
    full_name: string;
  };
}

interface Bed {
  id: string;
  bed_number: number;
  is_available: boolean;
}

interface ICDCode {
  id: string;
  code: string;
  description: string;
}

interface EditPatientBasicInfoProps {
  patientId?: string;
}

export default function EditPatientBasicInfo({ patientId }: EditPatientBasicInfoProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [centers, setCenters] = useState<RemoteCenter[]>([]);
  const [icus, setICUs] = useState<ICU[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [availableBeds, setAvailableBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [icdSearchTerm, setIcdSearchTerm] = useState('');
  const [icdCodes, setIcdCodes] = useState<ICDCode[]>([]);
  const [selectedIcdCodes, setSelectedIcdCodes] = useState<ICDCode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showIcdDropdown, setShowIcdDropdown] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);
  const icdSearchContainerRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    selectedCenter: '',
    selectedICU: '',
    selectedBed: '',
    admittingConsultant: '',
    criticality: 'red',
    triage: 'emergent',
    patientName: '',
    gender: 'male',
    age: '',
    height: '',
    weight: '',
    uidNo: '',
    ipidNo: '',
    mlcNo: '',
    insurance: '',
    address: '',
    consultantId: '',
    dateOfTeleICU: new Date().toISOString().split('T')[0],
    dateOfAdmission: new Date().toISOString().split('T')[0],
    admissionTime: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
    icdCodeIds: [] as string[],
  });

  useEffect(() => {
    loadRemoteCenters();
    loadConsultants();
    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

  const loadConsultants = async () => {
    try {
      const response = await userService.list({ 
        page: 1, 
        limit: 20, 
        sort_order: 'desc', 
        role_type: 'doctor' 
      });
      if (response.success && response.data) {
        setConsultants(response.data.items);
      }
    } catch (err) {
      console.error('Error loading consultants:', err);
      setError('Failed to load consultants');
    }
  };

  useEffect(() => {
    if (formData.selectedCenter) {
      loadICUs(formData.selectedCenter);
      loadDoctors(formData.selectedCenter);
    }
  }, [formData.selectedCenter]);

  useEffect(() => {
    if (formData.selectedICU) {
      loadAvailableBeds(formData.selectedICU);
    } else {
      setAvailableBeds([]);
    }
  }, [formData.selectedICU]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        icdSearchContainerRef.current &&
        !icdSearchContainerRef.current.contains(event.target as Node)
      ) {
        setShowIcdDropdown(false);
      }
    };

    if (showIcdDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showIcdDropdown]);

  const loadPatientData = async () => {
    if (!patientId) return;
    
    try {
      const response = await patientService.getById(patientId);
      if (response.success && response.data) {
        const patient = response.data;
        
        // Parse admission time from API format (e.g., "10:54:32.218000Z")
        let formattedTime = '00:00';
        try {
          if (patient.admission_time) {
            const timeMatch = patient.admission_time.match(/^(\d{2}):(\d{2})/);
            if (timeMatch) {
              formattedTime = `${timeMatch[1]}:${timeMatch[2]}`;
            }
          }
        } catch (e) {
          console.error('Error parsing admission time:', e);
        }

        // Store original data for comparison
        setOriginalData({
          first_name: patient.first_name,
          last_name: patient.last_name,
          gender: patient.gender,
          age: patient.age,
          height: patient.height,
          weight: patient.weight,
          criticality: patient.criticality,
          triage: patient.triage,
          uid_number: patient.uid_number,
          ipid_number: patient.ipid_number,
          admission_date: patient.admission_date,
          admission_time: patient.admission_time,
          tele_icu_date: patient.tele_icu_date,
          mlc_or_non_mlc_number: patient.mlc_or_non_mlc_number,
          insurance: patient.insurance || '',
          organisation_icu_id: patient.organisation_icu_id,
          organisation_icu_bed_id: patient.organisation_icu_bed_id,
          doctor_id: patient.doctor_id,
          icd_code_ids: patient.icd_codes?.map(code => code.id) || [],
          address: patient.address || '',
          consultant_id: patient.consultant_id || ''
        });

        setFormData(prev => ({
          ...prev,
          selectedCenter: patient.organisation_id || '',
          selectedICU: patient.organisation_icu_id || '',
          selectedBed: patient.organisation_icu_bed_id || '',
          admittingConsultant: patient.doctor_id || '',
          criticality: patient.criticality || 'red',
          triage: patient.triage || 'emergent',
          patientName: `${patient.first_name} ${patient.last_name}`,
          gender: patient.gender || 'male',
          age: patient.age?.toString() || '',
          height: patient.height?.toString() || '',
          weight: patient.weight?.toString() || '',
          uidNo: patient.uid_number || '',
          ipidNo: patient.ipid_number || '',
          mlcNo: patient.mlc_or_non_mlc_number || '',
          insurance: patient.insurance || '',
          address: patient.address || '',
          consultantId: patient.consultant_id || '',
          dateOfTeleICU: patient.tele_icu_date || new Date().toISOString().split('T')[0],
          dateOfAdmission: patient.admission_date || new Date().toISOString().split('T')[0],
          admissionTime: formattedTime,
          icdCodeIds: patient.icd_codes?.map(code => code.id) || []
        }));

        // Load related data
        if (patient.organisation_id) {
          await loadICUs(patient.organisation_id);
          await loadDoctors(patient.organisation_id);
        }
        if (patient.organisation_icu_id) {
          await loadAvailableBeds(patient.organisation_icu_id);
        }
        // Set selected ICD codes
        if (patient.icd_codes && patient.icd_codes.length > 0) {
          setSelectedIcdCodes(patient.icd_codes);
        }
      }
    } catch (err) {
      console.error('Error loading patient data:', err);
      setError('Failed to load patient data');
    }
  };

  const loadRemoteCenters = async () => {
    try {
      const response = await remoteCenterService.list();
      if (response.success && response.data) {
        setCenters(response.data.items);
      }
    } catch (err) {
      console.error('Error loading centers:', err);
      setError('Failed to load remote centers');
    }
  };

  const loadICUs = async (centerId: string) => {
    try {
      const response = await icuService.list({ organisation_id: centerId });
      if (response.success && response.data) {
        setICUs(response.data.items);
      }
    } catch (err) {
      console.error('Error loading ICUs:', err);
      setError('Failed to load ICUs');
    }
  };

  const loadDoctors = async (centerId: string) => {
    try {
      const response = await patientService.getDoctors(centerId);
      if (response.success && response.data) {
        setDoctors(response.data.items);
        // console.log('Loaded doctors:', response.data.items);
      }
    } catch (err) {
      console.error('Error loading doctors:', err);
      setError('Failed to load doctors');
    }
  };

  const loadAvailableBeds = async (icuId: string) => {
    try {
      const response = await patientService.getAvailableBeds(icuId);
      if (response.success && Array.isArray(response.data)) {
        setAvailableBeds(response.data);
      }
    } catch (err) {
      console.error('Error loading available beds:', err);
      setError('Failed to load available beds');
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchTerm: string) => {
      if (!searchTerm) {
        setIcdCodes([]);
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);
        const response = await patientService.searchICDCodes(searchTerm);
        // console.log('ICD Search Response:', response);
        if (response.success && response.data) {
          setIcdCodes(response.data.items);
          // console.log('Setting ICD codes:', response.data.items);
        }
      } catch (err) {
        console.error('Error searching ICD codes:', err);
        setError('Failed to search ICD codes');
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  // Handle ICD search input change
  const handleIcdSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIcdSearchTerm(value);
    setShowIcdDropdown(true);
    debouncedSearch(value);
  };

  // Handle ICD code selection
  const handleIcdCodeSelect = (code: ICDCode) => {
    if (!selectedIcdCodes.find(c => c.id === code.id)) {
      setSelectedIcdCodes(prev => [...prev, code]);
      setFormData(prev => ({
        ...prev,
        icdCodeIds: [...(prev.icdCodeIds || []), code.id]
      }));
    }
    setIcdSearchTerm('');
    setShowIcdDropdown(false);
  };

  const removeIcdCode = (codeId: string) => {
    setSelectedIcdCodes(prev => prev.filter(code => code.id !== codeId));
    setFormData(prev => ({
      ...prev,
      icdCodeIds: prev.icdCodeIds?.filter(id => id !== codeId) || []
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getChangedFields = (currentData: Partial<Patient>, originalData: any): Partial<Patient> => {
    const changes: Partial<Patient> = {};

    // Compare each field and only include changed ones
    if (currentData.first_name !== originalData.first_name) changes.first_name = currentData.first_name;
    if (currentData.last_name !== originalData.last_name) changes.last_name = currentData.last_name;
    if (currentData.gender !== originalData.gender) changes.gender = currentData.gender;
    if (currentData.age !== originalData.age) changes.age = currentData.age;
    if (currentData.height !== originalData.height) changes.height = currentData.height;
    if (currentData.weight !== originalData.weight) changes.weight = currentData.weight;
    if (currentData.criticality !== originalData.criticality) changes.criticality = currentData.criticality;
    if (currentData.triage !== originalData.triage) changes.triage = currentData.triage;
    if (currentData.uid_number !== originalData.uid_number) changes.uid_number = currentData.uid_number;
    if (currentData.ipid_number !== originalData.ipid_number) changes.ipid_number = currentData.ipid_number;
    if (currentData.admission_date !== originalData.admission_date) changes.admission_date = currentData.admission_date;
    if (currentData.admission_time !== originalData.admission_time) changes.admission_time = currentData.admission_time;
    if (currentData.tele_icu_date !== originalData.tele_icu_date) changes.tele_icu_date = currentData.tele_icu_date;
    if (currentData.mlc_or_non_mlc_number !== originalData.mlc_or_non_mlc_number) changes.mlc_or_non_mlc_number = currentData.mlc_or_non_mlc_number;
    if (currentData.insurance !== originalData.insurance) changes.insurance = currentData.insurance;
    if (currentData.organisation_icu_id !== originalData.organisation_icu_id) changes.organisation_icu_id = currentData.organisation_icu_id;
    if (currentData.organisation_icu_bed_id !== originalData.organisation_icu_bed_id) changes.organisation_icu_bed_id = currentData.organisation_icu_bed_id;
    if (currentData.doctor_id !== originalData.doctor_id) changes.doctor_id = currentData.doctor_id;
    if (currentData.address !== originalData.address) changes.address = currentData.address;
    if (currentData.consultant_id !== originalData.consultant_id) changes.consultant_id = currentData.consultant_id;
    
    // Compare ICD code IDs arrays
    if (JSON.stringify(currentData.icd_code_ids) !== JSON.stringify(originalData.icd_code_ids)) {
      changes.icd_code_ids = currentData.icd_code_ids;
    }

    return changes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const [firstName, ...lastNameParts] = formData.patientName.trim().split(' ');
      const lastName = lastNameParts.join(' ');

      // Format time to match API expectation (HH:mm:ss.SSSSSSZ)
      const [hours, minutes] = formData.admissionTime.split(':').map(Number);
      const formattedTime = `${String(hours || 0).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}:00.508000Z`;

      const currentData: Partial<Patient> = {
        first_name: firstName,
        last_name: lastName || '',
        gender: formData.gender as 'male' | 'female' | 'other',
        age: parseInt(formData.age, 10),
        height: formData.height ? parseFloat(formData.height) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        criticality: formData.criticality as 'red' | 'yellow' | 'green' | 'black',
        triage: formData.triage as 'emergent' | 'urgent' | 'non-urgent',
        uid_number: formData.uidNo,
        ipid_number: formData.ipidNo,
        admission_date: formData.dateOfAdmission,
        admission_time: formattedTime,
        tele_icu_date: formData.dateOfTeleICU,
        mlc_or_non_mlc_number: formData.mlcNo,
        insurance: formData.insurance || undefined,
        organisation_icu_id: formData.selectedICU,
        organisation_icu_bed_id: formData.selectedBed,
        doctor_id: formData.admittingConsultant,
        icd_code_ids: formData.icdCodeIds,
        status: 'admission',
        address: formData.address,
        consultant_id: formData.consultantId
      };

      if (patientId) {
        // Get only changed fields for update
        const changedFields = getChangedFields(currentData, originalData);
        // console.log('Changed fields:', changedFields);

        if (Object.keys(changedFields).length === 0) {
          // console.log('No changes detected');
          router.push(`/patients/${patientId}/history`);
          return;
        }

        // Update existing patient with only changed fields
        // console.log('Updating patient with changed fields:', changedFields);
        const response = await patientService.update(patientId, changedFields);
        // console.log('Update response:', response);
        
        if (response.success) {
          // console.log('Update successful');
          router.push(`/patients/${patientId}/history`);
        } else {
          console.error('Update failed:', response.message);
          setError(response.message || 'Failed to update patient');
        }
      } else {
        // For new patient, send all fields
        if (!formData.selectedCenter) {
          throw new Error('Selected center is required');
        }
        const response = await patientService.create(formData.selectedCenter, currentData);
        if (response.success && response.data?.id) {
          router.push(`/patients/${response.data.id}/history`);
        } else {
          setError(response.message || 'Failed to create patient');
        }
      }
    } catch (err) {
      console.error('Error saving patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to save patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Select Center</label>
            <select
              name="selectedCenter"
              value={formData.selectedCenter}
              onChange={handleInputChange}
              className={styles.select}
              disabled={!!patientId}
            >
              <option value="">select center</option>
              {centers.map(center => (
                <option key={center.id} value={center.id}>{center.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Select ICU</label>
            <select
              name="selectedICU"
              value={formData.selectedICU}
              onChange={handleInputChange}
              className={styles.select}
              disabled={!formData.selectedCenter}
            >
              <option value="">Select ICU</option>
              {icus.map(icu => (
                <option key={icu.id} value={icu.id}>{icu.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Alloted Bed</label>
            <select
              name="selectedBed"
              value={formData.selectedBed}
              onChange={handleInputChange}
              className={styles.select}
              disabled={!formData.selectedICU}
            >
              <option value="">Select Bed</option>
              {availableBeds.map(bed => (
                <option key={bed.id} value={bed.id}>
                  Bed {bed.bed_number}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Admitting Consultant</label>
            <select
              name="admittingConsultant"
              value={formData.admittingConsultant}
              onChange={handleInputChange}
              className={styles.select}
              disabled={!formData.selectedCenter}
            >
              <option value="">Select Doctor</option>
              {doctors.map(doctor => {
                const name = doctor.primary_profile?.full_name || 
                           `${doctor.primary_profile?.first_name || ''} ${doctor.primary_profile?.last_name || ''}`.trim() ||
                           'Dr.';
                return (
                  <option key={doctor.id} value={doctor.id}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Date Of Admission</label>
            <input
              type="date"
              name="dateOfAdmission"
              value={formData.dateOfAdmission}
              onChange={handleInputChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Time of Admission</label>
            <input
              type="time"
              name="admissionTime"
              value={formData.admissionTime}
              onChange={handleInputChange}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Criticality</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="criticality"
                  value="red"
                  checked={formData.criticality === 'red'}
                  onChange={handleInputChange}
                />
                <span className={styles.redDot}></span>
                Red
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="criticality"
                  value="yellow"
                  checked={formData.criticality === 'yellow'}
                  onChange={handleInputChange}
                />
                <span className={styles.yellowDot}></span>
                Yellow
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="criticality"
                  value="green"
                  checked={formData.criticality === 'green'}
                  onChange={handleInputChange}
                />
                <span className={styles.greenDot}></span>
                Green
              </label>
            </div>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Triage</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="triage"
                  value="emergent"
                  checked={formData.triage === 'emergent'}
                  onChange={handleInputChange}
                />
                Emergent
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="triage"
                  value="urgent"
                  checked={formData.triage === 'urgent'}
                  onChange={handleInputChange}
                />
                Urgent
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="triage"
                  value="non_urgent"
                  checked={formData.triage === 'non_urgent'}
                  onChange={handleInputChange}
                />
                Non-Urgent
              </label>
            </div>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Patient Name</label>
            <input
              type="text"
              name="patientName"
              value={formData.patientName}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Rahul Ahuja"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Gender</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={formData.gender === 'male'}
                  onChange={handleInputChange}
                />
                Male
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={formData.gender === 'female'}
                  onChange={handleInputChange}
                />
                Female
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="gender"
                  value="other"
                  checked={formData.gender === 'other'}
                  onChange={handleInputChange}
                />
                Others
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Age</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="29"
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Height (cm)</label>
            <input
              type="number"
              name="height"
              value={formData.height}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Please enter height in cm"
              step="0.1"
              min="0"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Weight (kg)</label>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Please enter weight in kg"
              step="0.1"
              min="0"
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>UID No.</label>
            <input
              type="text"
              name="uidNo"
              value={formData.uidNo}
              onChange={handleInputChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>IPID No.</label>
            <input
              type="text"
              name="ipidNo"
              value={formData.ipidNo}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="77544677258AN8"
            />
          </div>

          <div className={styles.formGroup}>
            <label>M.L.C / Non M.L.C No.</label>
            <input
              type="text"
              name="mlcNo"
              value={formData.mlcNo}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="77544677258AN8"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Insurance</label>
            <input
              type="text"
              name="insurance"
              value={formData.insurance}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Please enter insurance"
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Please enter patient address"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Consultant</label>
            <select
              name="consultantId"
              value={formData.consultantId}
              onChange={handleInputChange}
              className={styles.select}
            >
              <option value="">Select Consultant</option>
              {consultants.map(consultant => {
                const name = consultant.primary_profile?.full_name || 
                           `${consultant.primary_profile?.first_name || ''} ${consultant.primary_profile?.last_name || ''}`.trim() ||
                           'Dr.';
                return (
                  <option key={consultant.id} value={consultant.id}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Date of Tele ICU</label>
            <input
              type="date"
              name="dateOfTeleICU"
              value={formData.dateOfTeleICU}
              onChange={handleInputChange}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>ICD Codes</label>
            <div className={styles.icdSearchContainer} ref={icdSearchContainerRef}>
              <input
                type="text"
                value={icdSearchTerm}
                onChange={handleIcdSearchChange}
                onFocus={() => setShowIcdDropdown(true)}
                className={styles.input}
                placeholder="Search by code or description..."
              />
              {showIcdDropdown && (icdCodes.length > 0 || isSearching) && (
                <div className={styles.icdDropdown}>
                  {isSearching ? (
                    <div className={styles.searchingMessage}>Searching...</div>
                  ) : (
                    icdCodes.map(code => (
                      <div
                        key={code.id}
                        className={styles.icdOption}
                        onClick={() => handleIcdCodeSelect(code)}
                      >
                        <span className={styles.icdCode}>{code.code}</span>
                        <span className={styles.icdDescription}>{code.description}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
              <div className={styles.selectedIcdCodes}>
                {selectedIcdCodes.map(code => (
                  <div key={code.id} className={styles.selectedIcdCode}>
                    <span>{code.code} - {code.description}</span>
                    <button
                      type="button"
                      onClick={() => removeIcdCode(code.id)}
                      className={styles.removeIcdCode}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Saving...' : patientId ? 'Save Changes' : 'Add Patient'}
          </button>
        </div>
      </form>
    </div>
  );
} 