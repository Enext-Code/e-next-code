'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/styles/addpatient.module.css';
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


export default function AddPatientForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [centers, setCenters] = useState<RemoteCenter[]>([]);
  const [icus, setICUs] = useState<ICU[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [availableBeds, setAvailableBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingICUs, setLoadingICUs] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIcdCodes, setSelectedIcdCodes] = useState<ICDCode[]>([]);
  const [icdSearchTerm, setIcdSearchTerm] = useState('');
  const [icdCodes, setIcdCodes] = useState<ICDCode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showIcdDropdown, setShowIcdDropdown] = useState(false);
  const icdSearchContainerRef = useRef<HTMLDivElement>(null);
  
  // Consultant pagination state
  const [showConsultantDropdown, setShowConsultantDropdown] = useState(false);
  const [consultantPage, setConsultantPage] = useState(1);
  const [hasMoreConsultants, setHasMoreConsultants] = useState(false);
  const [isLoadingMoreConsultants, setIsLoadingMoreConsultants] = useState(false);
  const consultantSearchContainerRef = useRef<HTMLDivElement>(null);
  const consultantDropdownRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    selectedCenter: '',
    selectedICU: '',
    selectedBed: '',
    admittingConsultant: '',
    criticality: 'red', // Default to red
    triage: 'emergent', // Default to emergent
    patientName: '',
    gender: 'male', // Default to male
    age: '',
    height: '',
    weight: '',
    uidNo: '',
    ipidNo: '',
    mlcNo: '',
    insurance: '',
    address: '',
    consultantId: '',
    dateOfTeleICU: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    dateOfAdmission: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    admissionTime: new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Kolkata' }).slice(0, 5), // Default to current IST time in HH:mm format
    icdCodeId: '', // New field
  });

  useEffect(() => {
    loadRemoteCenters();
    loadConsultants(1, false); // Load initial consultants
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        icdSearchContainerRef.current &&
        !icdSearchContainerRef.current.contains(event.target as Node)
      ) {
        setShowIcdDropdown(false);
      }
      if (
        consultantSearchContainerRef.current &&
        !consultantSearchContainerRef.current.contains(event.target as Node)
      ) {
        setShowConsultantDropdown(false);
      }
    };

    if (showIcdDropdown || showConsultantDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showIcdDropdown, showConsultantDropdown]);

  const loadConsultants = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setIsLoadingMoreConsultants(true);
      }
      
      const response = await userService.list({ 
        page: page, 
        limit: 50, // Consistent limit for pagination
        sort_order: 'desc', 
        role_type: 'doctor'
      });
      
      if (response.success && response.data) {
        const newConsultants = response.data.items;
        
        if (append) {
          setConsultants(prev => [...prev, ...newConsultants]);
        } else {
          setConsultants(newConsultants);
        }
        
        // Update pagination state
        setHasMoreConsultants(response.data.has_next);
        setConsultantPage(page);
      }
    } catch (err) {
      console.error('Error loading consultants:', err);
      setError('Failed to load consultants');
    } finally {
      if (page === 1) {
        setLoading(false);
      }
      setIsLoadingMoreConsultants(false);
    }
  };

  // Load more consultants (for infinite scroll)
  const loadMoreConsultants = async () => {
    if (isLoadingMoreConsultants || !hasMoreConsultants) return;
    
    const nextPage = consultantPage + 1;
    await loadConsultants(nextPage, true);
  };

  // Handle scroll event for infinite scroll
  const handleConsultantDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    
    // Load more when scrolled near bottom (within 100px)
    // This ensures we load before user reaches the absolute bottom
    if (scrollBottom < 100 && hasMoreConsultants && !isLoadingMoreConsultants && consultants.length > 0) {
      loadMoreConsultants();
    }
  };

  // Handle consultant selection
  const handleConsultantSelect = (consultant: Consultant) => {
    setFormData(prev => ({ ...prev, consultantId: consultant.id }));
    setShowConsultantDropdown(false);
  };

  // Get selected consultant name for display
  const getSelectedConsultantName = () => {
    if (!formData.consultantId) return '';
    const selectedConsultant = consultants.find(c => c.id === formData.consultantId);
    if (selectedConsultant) {
      return selectedConsultant.primary_profile?.full_name || 
             `${selectedConsultant.primary_profile?.first_name || ''} ${selectedConsultant.primary_profile?.last_name || ''}`.trim() ||
             'Dr.';
    }
    return '';
  };


  useEffect(() => {
    if (formData.selectedCenter) {
      // Reset dependent fields when center changes
      setFormData(prev => ({
        ...prev,
        selectedICU: '',
        selectedBed: '',
        admittingConsultant: ''
      }));
      setICUs([]);
      setAvailableBeds([]);
      loadICUs(formData.selectedCenter);
      loadDoctors(formData.selectedCenter);
    } else {
      // Reset when center is deselected
      setICUs([]);
      setDoctors([]);
      setAvailableBeds([]);
      setLoadingICUs(false);
      setLoadingDoctors(false);
      setLoadingBeds(false);
    }
  }, [formData.selectedCenter]);

  useEffect(() => {
    if (formData.selectedICU) {
      // Reset bed selection when ICU changes
      setFormData(prev => ({
        ...prev,
        selectedBed: ''
      }));
      loadAvailableBeds(formData.selectedICU);
    } else {
      setAvailableBeds([]);
      setLoadingBeds(false);
    }
  }, [formData.selectedICU]);

  const loadRemoteCenters = async () => {
    try {
      setLoadingCenters(true);
      const response = await remoteCenterService.list();
      if (response.success && response.data) {
        setCenters(response.data.items);
      }
    } catch (err) {
      console.error('Error loading centers:', err);
      setError('Failed to load remote centers');
    } finally {
      setLoadingCenters(false);
    }
  };

  const loadICUs = async (centerId: string) => {
    try {
      setLoadingICUs(true);
      setError(null);
      const response = await icuService.list({ organisation_id: centerId });
      if (response.success && response.data) {
        setICUs(response.data.items);
      } else {
        setError('Failed to load ICUs');
        setICUs([]);
      }
    } catch (err) {
      console.error('Error loading ICUs:', err);
      setError('Failed to load ICUs');
      setICUs([]);
    } finally {
      setLoadingICUs(false);
    }
  };

  const loadDoctors = async (centerId: string) => {
    try {
      setLoadingDoctors(true);
      setError(null);
      const response = await patientService.getDoctors(centerId);
      if (response.success && response.data) {
        setDoctors(response.data.items);
        // console.log('Loaded doctors:', response.data.items);
      } else {
        setError('Failed to load doctors');
        setDoctors([]);
      }
    } catch (err) {
      console.error('Error loading doctors:', err);
      setError('Failed to load doctors');
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const loadAvailableBeds = async (icuId: string) => {
    try {
      setLoadingBeds(true);
      setError(null);
      const response = await patientService.getAvailableBeds(icuId);
      if (response.success && Array.isArray(response.data)) {
        setAvailableBeds(response.data);
      } else {
        setError('Failed to load available beds');
        setAvailableBeds([]);
      }
    } catch (err) {
      console.error('Error loading available beds:', err);
      setError('Failed to load available beds');
      setAvailableBeds([]);
    } finally {
      setLoadingBeds(false);
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
    }
    setIcdSearchTerm('');
    setShowIcdDropdown(false);
  };

  const removeIcdCode = (codeId: string) => {
    setSelectedIcdCodes(prev => prev.filter(code => code.id !== codeId));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Split patient name into first and last name
      const [firstName, ...lastNameParts] = formData.patientName.trim().split(' ');
      const lastName = lastNameParts.join(' ');

      // Format admission time to HH:mm:ss format (backend expects IST)
      const formattedTime = `${formData.admissionTime}:00`;

      const patientData: Partial<Patient> = {
        first_name: firstName,
        last_name: lastName || '', // If no last name provided, use empty string
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
        icd_code_ids: selectedIcdCodes.map(code => code.id),
        status: 'admission',
        address: formData.address,
        consultant_id: formData.consultantId
      };

      if (!formData.selectedCenter) {
        throw new Error('Selected center is required');
      }

      const response = await patientService.create(formData.selectedCenter, patientData);

      if (response.success && response.data?.id) {
        router.push(`/patients/${response.data.id}/history/add`);
      } else {
        setError(response.message || 'Failed to create patient');
      }
    } catch (err) {
      console.error('Error creating patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to create patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h1>Add Patient</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Select Center</label>
            <select
              name="selectedCenter"
              value={formData.selectedCenter}
              onChange={handleInputChange}
              className={styles.select}
              disabled={loadingCenters}
            >
              <option value="">{loadingCenters ? 'Loading centers...' : 'select center'}</option>
              {centers.map(center => (
                <option key={center.id} value={center.id}>{center.name}</option>
              ))}
            </select>
            {loadingCenters && (
              <div className={styles.loadingMessage} style={{ marginTop: '0.25rem' }}>
                <div className={styles.smallSpinner}></div>
                <span>Loading centers...</span>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Select ICU</label>
            <select
              name="selectedICU"
              value={formData.selectedICU}
              onChange={handleInputChange}
              className={styles.select}
              disabled={!formData.selectedCenter || loadingICUs}
            >
              <option value="">
                {loadingICUs ? 'Loading ICUs...' : icus.length === 0 && formData.selectedCenter ? 'No ICUs found' : 'Select ICU'}
              </option>
              {loadingICUs ? (
                <option value="" disabled>Loading ICUs...</option>
              ) : (
                icus.map(icu => (
                  <option key={icu.id} value={icu.id}>{icu.name}</option>
                ))
              )}
            </select>
            {loadingICUs && (
              <div className={styles.loadingMessage} style={{ marginTop: '0.25rem' }}>
                <div className={styles.smallSpinner}></div>
                <span>Loading ICUs...</span>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Alloted Bed</label>
            <select
              name="selectedBed"
              value={formData.selectedBed}
              onChange={handleInputChange}
              className={styles.select}
              disabled={!formData.selectedICU || loadingBeds}
            >
              <option value="">
                {loadingBeds ? 'Loading beds...' : availableBeds.length === 0 && formData.selectedICU ? 'No beds available' : 'Select Bed'}
              </option>
              {loadingBeds ? (
                <option value="" disabled>Loading beds...</option>
              ) : (
                availableBeds.map(bed => (
                  <option key={bed.id} value={bed.id}>
                    Bed {bed.bed_number}
                  </option>
                ))
              )}
            </select>
            {loadingBeds && (
              <div className={styles.loadingMessage} style={{ marginTop: '0.25rem' }}>
                <div className={styles.smallSpinner}></div>
                <span>Loading beds...</span>
              </div>
            )}
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
              disabled={!formData.selectedCenter || loadingDoctors}
            >
              <option value="">
                {loadingDoctors ? 'Loading doctors...' : doctors.length === 0 && formData.selectedCenter ? 'No doctors found' : 'Select Doctor'}
              </option>
              {loadingDoctors ? (
                <option value="" disabled>Loading doctors...</option>
              ) : (
                doctors.map(doctor => {
                  const name = doctor.primary_profile?.full_name || 
                             `${doctor.primary_profile?.first_name || ''} ${doctor.primary_profile?.last_name || ''}`.trim() ||
                             'Dr.';
                  return (
                    <option key={doctor.id} value={doctor.id}>
                      {name}
                    </option>
                  );
                })
              )}
            </select>
            {loadingDoctors && (
              <div className={styles.loadingMessage} style={{ marginTop: '0.25rem' }}>
                <div className={styles.smallSpinner}></div>
                <span>Loading doctors...</span>
              </div>
            )}
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
            <div className={styles.icdSearchContainer} ref={consultantSearchContainerRef}>
              <div
                className={styles.input}
                onClick={() => {
                  setShowConsultantDropdown(!showConsultantDropdown);
                  if (consultants.length === 0) {
                    loadConsultants(1, false);
                  }
                }}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>{getSelectedConsultantName() || 'Select Consultant'}</span>
                <span>▼</span>
              </div>
              {showConsultantDropdown && (
                <div 
                  className={styles.icdDropdown}
                  ref={consultantDropdownRef}
                  onScroll={handleConsultantDropdownScroll}
                  style={{ maxHeight: '300px', overflowY: 'auto' }}
                >
                  {loading && consultants.length === 0 ? (
                    <div className={styles.searchingMessage}>Loading...</div>
                  ) : (
                    <>
                      {consultants.map(consultant => {
                        const name = consultant.primary_profile?.full_name || 
                                   `${consultant.primary_profile?.first_name || ''} ${consultant.primary_profile?.last_name || ''}`.trim() ||
                                   'Dr.';
                        return (
                          <div
                            key={consultant.id}
                            className={styles.icdOption}
                            onClick={() => handleConsultantSelect(consultant)}
                          >
                            <span className={styles.icdDescription}>{name}</span>
                          </div>
                        );
                      })}
                      {isLoadingMoreConsultants && (
                        <div className={styles.searchingMessage}>Loading more...</div>
                      )}
                      {hasMoreConsultants && !isLoadingMoreConsultants && (
                        <div className={styles.searchingMessage} style={{ fontSize: '12px', color: '#666' }}>
                          Scroll for more...
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              <input
                type="hidden"
                name="consultantId"
                value={formData.consultantId}
              />
            </div>
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
              placeholder="Please enter patient name"
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
              placeholder="Please enter patient age"
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
              placeholder="Please enter patient IPID No."
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
              placeholder="Please enter patient M.L.C / Non M.L.C No."
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
            {loading && <div className={styles.loadingSpinner}></div>}
            {loading ? 'Adding Patient...' : 'Add Patient'}
          </button>
        </div>
      </form>
    </div>
  );
} 