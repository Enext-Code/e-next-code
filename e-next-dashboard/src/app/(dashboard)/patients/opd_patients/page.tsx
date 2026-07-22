'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/opd-patient.module.css';
import { fetchApi } from '@/utils/api';
import { API_ENDPOINTS } from '@/constants/api';
import { userService, User } from '@/services/userService';
import { remoteCenterService, RemoteCenter } from '@/services/remoteCenterService';
import Breadcrumb from '@/components/common/Breadcrumb';


interface FormData {
  visit_date: string;
  doc_number: string;
  patient_name: string;
  age: number | '';
  gender: 'male' | 'female' | 'other';
  uhid: string;
  organisation_id: string;
  consultant_user_id: string;
  speciality: string;
  episode_no: string;
  allergy: string;
  vitals: string;
  patient_history: {
    tobacco_use: string;
    alcohol_use: string;
    substance_use: string;
    past_illness: string;
    past_procedures: string;
  };
  general_examination: string;
  systemic_examination: string;
  procedures: string[];
  treatment_note: string;
  followup_note: string;
}

export default function OPDPatientPage() {
  const router = useRouter();
  const breadcrumbItems = [
    { label: 'Patients', href: '/patients' },
    { label: 'OPD Patient Registration' }
  ];

  const [formData, setFormData] = useState<FormData>({
    visit_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    doc_number: '',
    patient_name: '',
    age: '',
    gender: 'male',
    uhid: '',
    organisation_id: '',
    consultant_user_id: '',
    speciality: '',
    episode_no: '',
    allergy: '',
    vitals: '',
    patient_history: {
      tobacco_use: '',
      alcohol_use: '',
      substance_use: '',
      past_illness: '',
      past_procedures: ''
    },
    general_examination: '',
    systemic_examination: '',
    procedures: [''],
    treatment_note: '',
    followup_note: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Remote Center dropdown states
  const [allCenters, setAllCenters] = useState<RemoteCenter[]>([]); // All loaded centers
  const [centers, setCenters] = useState<RemoteCenter[]>([]); // Filtered centers to display
  const [isCenterDropdownOpen, setIsCenterDropdownOpen] = useState(false);
  const [centerSearchTerm, setCenterSearchTerm] = useState('');
  const [centerPage, setCenterPage] = useState(1);
  const [hasMoreCenters, setHasMoreCenters] = useState(false);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingMoreCenters, setLoadingMoreCenters] = useState(false);
  const centerDropdownRef = useRef<HTMLDivElement>(null);
  const centerOptionsRef = useRef<HTMLDivElement>(null);
  const centerSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Consultant dropdown states
  const [allDoctors, setAllDoctors] = useState<User[]>([]); // All loaded doctors
  const [doctors, setDoctors] = useState<User[]>([]); // Filtered doctors to display
  const [isConsultantDropdownOpen, setIsConsultantDropdownOpen] = useState(false);
  const [consultantSearchTerm, setConsultantSearchTerm] = useState('');
  const [consultantPage, setConsultantPage] = useState(1);
  const [hasMoreDoctors, setHasMoreDoctors] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingMoreDoctors, setLoadingMoreDoctors] = useState(false);
  const consultantDropdownRef = useRef<HTMLDivElement>(null);
  const consultantOptionsRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter centers locally based on search term
  const filterCenters = useCallback((search: string) => {
    setAllCenters(currentAllCenters => {
      if (!search.trim()) {
        setCenters(currentAllCenters);
        return currentAllCenters;
      }

      const searchLower = search.toLowerCase().trim();
      const filtered = currentAllCenters.filter(center => 
        center.name.toLowerCase().includes(searchLower) ||
        center.location.toLowerCase().includes(searchLower)
      );
      setCenters(filtered);
      return currentAllCenters;
    });
  }, []);

  const loadCenters = useCallback(async (page: number = 1, search: string = '', append: boolean = false) => {
    try {
      if (append) {
        setLoadingMoreCenters(true);
      } else {
        setLoadingCenters(true);
      }

      const response = await remoteCenterService.list({ 
        page,
        limit: 100
      });

      if (response.success && response.data) {
        setAllCenters(prev => {
          return append ? [...prev, ...response.data.items] : response.data.items;
        });
        setHasMoreCenters(response.data.has_next || false);
        setCenterPage(page);
      }
    } catch (err) {
      console.error('Error loading centers:', err);
    } finally {
      setLoadingCenters(false);
      setLoadingMoreCenters(false);
    }
  }, []);

  // Apply local filter whenever allCenters or centerSearchTerm changes
  useEffect(() => {
    filterCenters(centerSearchTerm);
  }, [allCenters, centerSearchTerm, filterCenters]);

  // Filter doctors locally based on search term
  const filterDoctors = useCallback((search: string) => {
    setAllDoctors(currentAllDoctors => {
      if (!search.trim()) {
        setDoctors(currentAllDoctors);
        return currentAllDoctors;
      }

      const searchLower = search.toLowerCase().trim();
      const filtered = currentAllDoctors.filter(doctor => {
        const firstName = (doctor.primary_profile?.first_name || '').toLowerCase();
        const lastName = (doctor.primary_profile?.last_name || '').toLowerCase();
        const fullName = (doctor.primary_profile?.full_name || '').toLowerCase();
        const combinedName = `${firstName} ${lastName}`.trim();
        
        // Search by first name, last name, full name, or combined name
        return firstName.includes(searchLower) ||
               lastName.includes(searchLower) ||
               fullName.includes(searchLower) ||
               combinedName.includes(searchLower);
      });
      setDoctors(filtered);
      return currentAllDoctors;
    });
  }, []);

  const loadDoctors = useCallback(async (page: number = 1, search: string = '', append: boolean = false) => {
    try {
      if (append) {
        setLoadingMoreDoctors(true);
      } else {
        setLoadingDoctors(true);
      }

      const response = await userService.list({ 
        role_type: 'doctor',
        page,
        limit: 100
      });

      if (response.success && response.data) {
        setAllDoctors(prev => {
          return append ? [...prev, ...response.data.items] : response.data.items;
        });
        setHasMoreDoctors(response.data.has_next || false);
        setConsultantPage(page);
      }
    } catch (err) {
      console.error('Error loading doctors:', err);
    } finally {
      setLoadingDoctors(false);
      setLoadingMoreDoctors(false);
    }
  }, []);

  // Apply local filter whenever allDoctors or consultantSearchTerm changes
  useEffect(() => {
    filterDoctors(consultantSearchTerm);
  }, [allDoctors, consultantSearchTerm, filterDoctors]);

  useEffect(() => {
    loadCenters(1, '', false);
    loadDoctors(1, '', false);
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (centerDropdownRef.current && !centerDropdownRef.current.contains(event.target as Node)) {
        setIsCenterDropdownOpen(false);
      }
      if (consultantDropdownRef.current && !consultantDropdownRef.current.contains(event.target as Node)) {
        setIsConsultantDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Cleanup search timeouts
      if (centerSearchTimeoutRef.current) {
        clearTimeout(centerSearchTimeoutRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [loadCenters, loadDoctors]);


  const handleCenterSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCenterSearchTerm(value);
    
    // Filter centers locally instead of making API call
    filterCenters(value);
  };

  const handleCenterSelect = (center: RemoteCenter) => {
    setFormData(prev => ({
      ...prev,
      organisation_id: center.id
    }));
    setIsCenterDropdownOpen(false);
    setCenterSearchTerm('');
  };

  const loadMoreCenters = () => {
    if (!loadingMoreCenters && hasMoreCenters && !loadingCenters) {
      loadCenters(centerPage + 1, '', true);
    }
  };

  // Infinite scroll handler for centers
  useEffect(() => {
    const optionsContainer = centerOptionsRef.current;
    if (!optionsContainer || !isCenterDropdownOpen) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = optionsContainer;
      // Load more when user scrolls to within 50px of bottom
      if (scrollHeight - scrollTop - clientHeight < 50) {
        if (!loadingMoreCenters && hasMoreCenters && !loadingCenters) {
          loadCenters(centerPage + 1, '', true);
        }
      }
    };

    optionsContainer.addEventListener('scroll', handleScroll);
    return () => optionsContainer.removeEventListener('scroll', handleScroll);
  }, [isCenterDropdownOpen, hasMoreCenters, loadingMoreCenters, loadingCenters, centerPage, loadCenters]);

  const handleConsultantSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConsultantSearchTerm(value);
    
    // Filter doctors locally instead of making API call
    filterDoctors(value);
  };

  const handleConsultantSelect = (doctor: User) => {
    setFormData(prev => ({
      ...prev,
      consultant_user_id: doctor.id,
      speciality: doctor.primary_profile?.designation || ''
    }));
    setIsConsultantDropdownOpen(false);
    setConsultantSearchTerm('');
  };

  const loadMoreDoctors = () => {
    if (!loadingMoreDoctors && hasMoreDoctors && !loadingDoctors) {
      loadDoctors(consultantPage + 1, '', true);
    }
  };

  // Infinite scroll handler
  useEffect(() => {
    const optionsContainer = consultantOptionsRef.current;
    if (!optionsContainer || !isConsultantDropdownOpen) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = optionsContainer;
      // Load more when user scrolls to within 50px of bottom
      if (scrollHeight - scrollTop - clientHeight < 50) {
        if (!loadingMoreDoctors && hasMoreDoctors && !loadingDoctors) {
          loadDoctors(consultantPage + 1, '', true);
        }
      }
    };

    optionsContainer.addEventListener('scroll', handleScroll);
    return () => optionsContainer.removeEventListener('scroll', handleScroll);
  }, [isConsultantDropdownOpen, hasMoreDoctors, loadingMoreDoctors, loadingDoctors, consultantPage, loadDoctors]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name.startsWith('patient_history.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        patient_history: {
          ...prev.patient_history,
          [field]: value
        }
      }));
    } else if (name === 'age') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? '' : parseInt(value, 10)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleProcedureChange = (index: number, value: string) => {
    setFormData(prev => {
      const newProcedures = [...prev.procedures];
      newProcedures[index] = value;
      return { ...prev, procedures: newProcedures };
    });
  };

  const addProcedure = () => {
    setFormData(prev => ({
      ...prev,
      procedures: [...prev.procedures, '']
    }));
  };

  const removeProcedure = (index: number) => {
    setFormData(prev => ({
      ...prev,
      procedures: prev.procedures.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.patient_name.trim()) {
      setError('Patient name is required');
      return;
    }
    if (!formData.age || formData.age <= 0) {
      setError('Valid age is required');
      return;
    }
    if (!formData.organisation_id) {
      setError('Please select a remote center');
      return;
    }
    if (!formData.consultant_user_id) {
      setError('Please select a consultant');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        visit_date: formData.visit_date,
        doc_number: formData.doc_number,
        patient_name: formData.patient_name,
        age: Number(formData.age),
        gender: formData.gender,
        uhid: formData.uhid,
        consultant_user_id: formData.consultant_user_id,
        episode_no: formData.episode_no,
        allergy: formData.allergy,
        vitals: formData.vitals,
        patient_history: {
          tobacco_use: formData.patient_history.tobacco_use,
          alcohol_use: formData.patient_history.alcohol_use,
          substance_use: formData.patient_history.substance_use,
          past_illness: formData.patient_history.past_illness,
          past_procedures: formData.patient_history.past_procedures
        },
        general_examination: formData.general_examination,
        systemic_examination: formData.systemic_examination,
        procedures: formData.procedures.filter(p => p.trim() !== ''),
        treatment_note: formData.treatment_note,
        followup_note: formData.followup_note
      };

      const response = await fetchApi(
        `${API_ENDPOINTS.OPD_PATIENT.CREATE.replace('organisation_id=null', `organisation_id=${formData.organisation_id}`)}`,
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );

      if (response.success) {
        setSuccess('OPD Patient registered successfully!');
        // Reset form after successful submission
        setFormData({
          visit_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
          doc_number: '',
          patient_name: '',
          age: '',
          gender: 'male',
          uhid: '',
          organisation_id: '',
          consultant_user_id: '',
          speciality: '',
          episode_no: '',
          allergy: '',
          vitals: '',
          patient_history: {
            tobacco_use: '',
            alcohol_use: '',
            substance_use: '',
            past_illness: '',
            past_procedures: ''
          },
          general_examination: '',
          systemic_examination: '',
          procedures: [''],
          treatment_note: '',
          followup_note: ''
        });
      } else {
        setError(response.message || 'Failed to register OPD patient');
      }
    } catch (err) {
      console.error('Error creating OPD patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to register OPD patient');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/patients');
  };

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>OPD Patient Registration</h1>
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <div className={styles.formContainer}>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Basic Information Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Basic Information</h3>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="organisation_id">
                  Remote Center <span className={styles.required}>*</span>
                </label>
                <div className={styles.consultantDropdown} ref={centerDropdownRef}>
                  <div
                    className={styles.consultantSelectTrigger}
                    onClick={() => setIsCenterDropdownOpen(!isCenterDropdownOpen)}
                  >
                    {formData.organisation_id
                      ? (() => {
                          const selectedCenter = allCenters.find(c => c.id === formData.organisation_id);
                          return selectedCenter
                            ? `${selectedCenter.name} (${selectedCenter.location})`
                            : 'Select Remote Center';
                        })()
                      : 'Select Remote Center'}
                    <span className={styles.dropdownArrow}>
                      {isCenterDropdownOpen ? '▼' : '▶'}
                    </span>
                  </div>
                  {isCenterDropdownOpen && (
                    <div className={styles.consultantDropdownMenu}>
                      <div className={styles.consultantSearchBox}>
                        <input
                          type="text"
                          value={centerSearchTerm}
                          onChange={handleCenterSearchChange}
                          placeholder="Search remote centers..."
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className={styles.consultantOptions} ref={centerOptionsRef}>
                        {loadingCenters ? (
                          <div className={styles.consultantLoading}>Loading...</div>
                        ) : centers.length === 0 ? (
                          <div className={styles.consultantNoResults}>No remote centers found</div>
                        ) : (
                          <>
                            {centers.map(center => (
                              <div
                                key={center.id}
                                className={`${styles.consultantOption} ${formData.organisation_id === center.id ? styles.consultantOptionSelected : ''}`}
                                onClick={() => handleCenterSelect(center)}
                              >
                                {center.name} ({center.location})
                              </div>
                            ))}
                            {loadingMoreCenters && (
                              <div className={styles.consultantLoading}>Loading more...</div>
                            )}
                            {hasMoreCenters && !loadingMoreCenters && (
                              <div className={styles.consultantLoadMore} onClick={loadMoreCenters}>
                                Load more...
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="visit_date">
                  Date <span className={styles.required}>*</span>
                </label>
                <input
                  type="datetime-local"
                  id="visit_date"
                  name="visit_date"
                  value={formData.visit_date}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                />
              </div>

              {/* <div className={styles.formGroup}>
                <label htmlFor="doc_number">Doc Number</label>
                <input
                  type="text"
                  id="doc_number"
                  name="doc_number"
                  value={formData.doc_number}
                  onChange={handleInputChange}
                  placeholder="Enter doc number"
                  className={styles.input}
                />
              </div> */}

              <div className={styles.formGroup}>
                <label htmlFor="patient_name">
                  Patient Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="patient_name"
                  name="patient_name"
                  value={formData.patient_name}
                  onChange={handleInputChange}
                  placeholder="Enter patient name"
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="uhid">UHID</label>
                <input
                  type="text"
                  id="uhid"
                  name="uhid"
                  value={formData.uhid}
                  onChange={handleInputChange}
                  placeholder="Enter UHID"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="age">
                  Age <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="Enter age"
                  min="0"
                  max="150"
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>
                  Gender <span className={styles.required}>*</span>
                </label>
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
                    Other
                  </label>
                </div>
              </div>

              {/* <div className={styles.formGroup}>
                <label htmlFor="uhid">UHID</label>
                <input
                  type="text"
                  id="uhid"
                  name="uhid"
                  value={formData.uhid}
                  onChange={handleInputChange}
                  placeholder="Enter UHID"
                  className={styles.input}
                />
              </div> */}

              <div className={styles.formGroup}>
                <label htmlFor="consultant_user_id">
                  Consultant <span className={styles.required}>*</span>
                </label>
                <div className={styles.consultantDropdown} ref={consultantDropdownRef}>
                  <div
                    className={styles.consultantSelectTrigger}
                    onClick={() => setIsConsultantDropdownOpen(!isConsultantDropdownOpen)}
                  >
                    {formData.consultant_user_id
                      ? (() => {
                          const selectedDoctor = doctors.find(d => d.id === formData.consultant_user_id);
                          return selectedDoctor
                            ? (selectedDoctor.primary_profile?.full_name || 
                               `${selectedDoctor.primary_profile?.first_name || ''} ${selectedDoctor.primary_profile?.last_name || ''}`.trim() ||
                               selectedDoctor.email)
                            : 'Select Consultant';
                        })()
                      : 'Select Consultant'}
                    <span className={styles.dropdownArrow}>
                      {isConsultantDropdownOpen ? '▼' : '▶'}
                    </span>
                  </div>
                  {isConsultantDropdownOpen && (
                    <div className={styles.consultantDropdownMenu}>
                      <div className={styles.consultantSearchBox}>
                        <input
                          type="text"
                          value={consultantSearchTerm}
                          onChange={handleConsultantSearchChange}
                          placeholder="Search consultants..."
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className={styles.consultantOptions} ref={consultantOptionsRef}>
                        {loadingDoctors ? (
                          <div className={styles.consultantLoading}>Loading...</div>
                        ) : doctors.length === 0 ? (
                          <div className={styles.consultantNoResults}>No consultants found</div>
                        ) : (
                          <>
                            {doctors.map(doctor => (
                              <div
                                key={doctor.id}
                                className={`${styles.consultantOption} ${formData.consultant_user_id === doctor.id ? styles.consultantOptionSelected : ''}`}
                                onClick={() => handleConsultantSelect(doctor)}
                              >
                                {doctor.primary_profile?.full_name || 
                                 `${doctor.primary_profile?.first_name || ''} ${doctor.primary_profile?.last_name || ''}`.trim() ||
                                 doctor.email}
                              </div>
                            ))}
                            {loadingMoreDoctors && (
                              <div className={styles.consultantLoading}>Loading more...</div>
                            )}
                            {hasMoreDoctors && !loadingMoreDoctors && (
                              <div className={styles.consultantLoadMore} onClick={loadMoreDoctors}>
                                Load more...
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="speciality">Speciality</label>
                <input
                  type="text"
                  id="speciality"
                  name="speciality"
                  value={formData.speciality}
                  readOnly
                  placeholder="Auto-filled from consultant"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="allergy">Allergy</label>
                <textarea
                  id="allergy"
                  name="allergy"
                  value={formData.allergy}
                  onChange={handleInputChange}
                  placeholder="Enter allergies (if any)"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              {/* <div className={styles.formGroup}>
                <label htmlFor="episode_no">Episode No</label>
                <input
                  type="text"
                  id="episode_no"
                  name="episode_no"
                  value={formData.episode_no}
                  onChange={handleInputChange}
                  placeholder="Enter episode number"
                  className={styles.input}
                />
              </div> */}

              {/* <div className={styles.formGroup}>
                <label htmlFor="allergy">Allergy</label>
                <textarea
                  id="allergy"
                  name="allergy"
                  value={formData.allergy}
                  onChange={handleInputChange}
                  placeholder="Enter allergies (if any)"
                  className={styles.input}
                />
              </div> */}
{/* 
              <div className={styles.formGroup}>
                <label htmlFor="vitals">Vitals</label>
                <input
                  type="text"
                  id="vitals"
                  name="vitals"
                  value={formData.vitals}
                  onChange={handleInputChange}
                  placeholder="Enter vitals"
                  className={styles.input}
                />
              </div> */}
            </div>
          </div>

          {/* Patient History Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Patient History</h3>
            
            <div className={styles.formRowThree}>
              <div className={styles.formGroup}>
                <label htmlFor="tobacco_use">Tobacco Use</label>
                <textarea
                  id="tobacco_use"
                  name="patient_history.tobacco_use"
                  value={formData.patient_history.tobacco_use}
                  onChange={handleInputChange}
                  placeholder="Describe tobacco use history"
                  className={`${styles.textarea} ${styles.textareaSmall}`}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="alcohol_use">Alcohol Use</label>
                <textarea
                  id="alcohol_use"
                  name="patient_history.alcohol_use"
                  value={formData.patient_history.alcohol_use}
                  onChange={handleInputChange}
                  placeholder="Describe alcohol use history"
                  className={`${styles.textarea} ${styles.textareaSmall}`}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="substance_use">Substance Use</label>
                <textarea
                  id="substance_use"
                  name="patient_history.substance_use"
                  value={formData.patient_history.substance_use}
                  onChange={handleInputChange}
                  placeholder="Describe substance use history"
                  className={`${styles.textarea} ${styles.textareaSmall}`}
                />
              </div>
            </div>

            <div className={styles.formRowTwo}>
              <div className={styles.formGroup}>
                <label htmlFor="past_illness">Past Illness/Procedures</label>
                <textarea
                  id="past_illness"
                  name="patient_history.past_illness"
                  value={formData.patient_history.past_illness}
                  onChange={handleInputChange}
                  placeholder="Describe past illnesses"
                  className={styles.textarea}
                />
              </div>

              {/* <div className={styles.formGroup}>
                <label htmlFor="past_procedures">Past Procedures</label>
                <textarea
                  id="past_procedures"
                  name="patient_history.past_procedures"
                  value={formData.patient_history.past_procedures}
                  onChange={handleInputChange}
                  placeholder="Describe past procedures"
                  className={styles.textarea}
                />
              </div> */}
            </div>
          </div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Vitals</h3>
            
            {/* <div className={styles.formRowTwo}> */}
            <div className={styles.formGroup}>
                {/* <label htmlFor="vitals">Vitals</label> */}
                <textarea
                  id="vitals"
                  name="vitals"
                  value={formData.vitals}
                  onChange={handleInputChange}
                  placeholder="Enter vitals"
                  className={styles.input}
                />
              </div>
            {/* </div> */}
          </div>
          {/* Examination Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Examination</h3>
            
            <div className={styles.formRowTwo}>
              <div className={styles.formGroup}>
                <label htmlFor="general_examination">General Examination</label>
                <textarea
                  id="general_examination"
                  name="general_examination"
                  value={formData.general_examination}
                  onChange={handleInputChange}
                  placeholder="Enter general examination findings"
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="systemic_examination">Systemic Examination</label>
                <textarea
                  id="systemic_examination"
                  name="systemic_examination"
                  value={formData.systemic_examination}
                  onChange={handleInputChange}
                  placeholder="Enter systemic examination findings"
                  className={styles.textarea}
                />
              </div>
            </div>
          </div>

          {/* Procedures Section */}
          {/* <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Procedures</h3>
            
            <div className={styles.proceduresContainer}>
              {formData.procedures.map((procedure, index) => (
                <div key={index} className={styles.procedureRow}>
                  <input
                    type="text"
                    value={procedure}
                    onChange={(e) => handleProcedureChange(index, e.target.value)}
                    placeholder={`Procedure ${index + 1}`}
                    className={`${styles.input} ${styles.procedureInput}`}
                  />
                  {formData.procedures.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProcedure(index)}
                      className={styles.removeButton}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addProcedure}
                className={styles.addButton}
              >
                + Add Procedure
              </button>
            </div>
          </div> */}

          {/* Notes Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Notes</h3>
            
            <div className={styles.formRowTwo}>
              <div className={styles.formGroup}>
                <label htmlFor="treatment_note">Treatment Note</label>
                <textarea
                  id="treatment_note"
                  name="treatment_note"
                  value={formData.treatment_note}
                  onChange={handleInputChange}
                  placeholder="Enter treatment notes"
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="followup_note">Follow-up Note</label>
                <textarea
                  id="followup_note"
                  name="followup_note"
                  value={formData.followup_note}
                  onChange={handleInputChange}
                  placeholder="Enter follow-up notes"
                  className={styles.textarea}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={handleCancel}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

