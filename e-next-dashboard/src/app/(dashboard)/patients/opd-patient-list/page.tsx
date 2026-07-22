'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import styles from '@/styles/opd-patient-list.module.css';
import { fetchApi, downloadApi } from '@/utils/api';
import { API_ENDPOINTS } from '@/constants/api';
import { userService, User } from '@/services/userService';
import { remoteCenterService, RemoteCenter } from '@/services/remoteCenterService';
import Breadcrumb from '@/components/common/Breadcrumb';

interface OPDPatient {
  id: string;
  visit_date: string;
  doc_number: string;
  patient_name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  uhid: string;
  consultant_user_id: string;
  consultant_name?: string;
  episode_no: string;
  allergy: string;
  vitals: string;
  // signature: string;
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
  created_at?: string;
  updated_at?: string;
}

interface OPDPatientListResponse {
  items: OPDPatient[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export default function OPDPatientListPage() {
  const breadcrumbItems = [
    { label: 'Patients', href: '/patients' },
    { label: 'OPD Patient List' }
  ];

  const [patients, setPatients] = useState<OPDPatient[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientNameFilter, setPatientNameFilter] = useState('');
  const [uhidFilter, setUhidFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  // Remote Center states
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [allCenters, setAllCenters] = useState<RemoteCenter[]>([]); // All loaded centers
  const [centers, setCenters] = useState<RemoteCenter[]>([]); // Filtered centers to display
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [centerSearchTerm, setCenterSearchTerm] = useState('');
  const [centerPage, setCenterPage] = useState(1);
  const [hasMoreCenters, setHasMoreCenters] = useState(false);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingMoreCenters, setLoadingMoreCenters] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<OPDPatient | null>(null);
  const [editFormData, setEditFormData] = useState<OPDPatient | null>(null);
  const [saving, setSaving] = useState(false);

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

  const loadDoctors = useCallback(async () => {
    try {
      const response = await userService.list({ role_type: 'doctor' });
      if (response.success && response.data) {
        setDoctors(response.data.items);
      }
    } catch (err) {
      console.error('Error loading doctors:', err);
    }
  }, []);

  const loadPatients = useCallback(async (pageNum: number, patientNameOverride?: string, uhidOverride?: string) => {
    if (!selectedCenter) {
      setPatients([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const patientNameValue = patientNameOverride !== undefined ? patientNameOverride : patientNameFilter;
      const uhidValue = uhidOverride !== undefined ? uhidOverride : uhidFilter;
      
      const queryParams = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
        organisation_id: selectedCenter,
        ...(patientNameValue && { patient_name: patientNameValue }),
        ...(uhidValue && { uhid: uhidValue })
      });

      const response = await fetchApi<OPDPatientListResponse>(
        `${API_ENDPOINTS.OPD_PATIENT.LIST}?${queryParams.toString()}`
      );

      if (response.success && response.data) {
        setPatients(response.data.items);
        setTotalPages(response.data.pages);
        setTotalItems(response.data.total);
        setCurrentPage(pageNum);
      } else {
        setError(response.message || 'Failed to load patients');
      }
    } catch (err) {
      console.error('Error loading patients:', err);
      setError(err instanceof Error ? err.message : 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [patientNameFilter, uhidFilter, selectedCenter]);

  useEffect(() => {
    loadCenters(1);
    loadDoctors();

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [loadCenters, loadDoctors]);

  useEffect(() => {
    if (selectedCenter) {
      setCurrentPage(1);
      setPatientNameFilter(''); // Clear filters when center changes
      setUhidFilter(''); // Clear filters when center changes
      setPatients([]);
      // Load without filters when center changes
      const loadInitialPatients = async () => {
        if (!selectedCenter) return;
        
        try {
          setLoading(true);
          setError(null);
          
          const queryParams = new URLSearchParams({
            page: '1',
            limit: limit.toString(),
            organisation_id: selectedCenter
          });

          const response = await fetchApi<OPDPatientListResponse>(
            `${API_ENDPOINTS.OPD_PATIENT.LIST}?${queryParams.toString()}`
          );

          if (response.success && response.data) {
            setPatients(response.data.items);
            setTotalPages(response.data.pages);
            setTotalItems(response.data.total);
            setCurrentPage(1);
          } else {
            setError(response.message || 'Failed to load patients');
          }
        } catch (err) {
          console.error('Error loading patients:', err);
          setError(err instanceof Error ? err.message : 'Failed to load patients');
        } finally {
          setLoading(false);
        }
      };
      
      loadInitialPatients();
    } else {
      setPatients([]);
      setLoading(false);
      setPatientNameFilter(''); // Clear filters when no center is selected
      setUhidFilter(''); // Clear filters when no center is selected
    }
  }, [selectedCenter]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadPatients(newPage);
    }
  };

  const getDoctorName = (consultantId: string) => {
    const doctor = doctors.find(d => d.id === consultantId);
    if (doctor) {
      return doctor.primary_profile?.full_name || 
             `${doctor.primary_profile?.first_name || ''} ${doctor.primary_profile?.last_name || ''}`.trim() ||
             doctor.email;
    }
    return 'N/A';
  };

  const handleCenterSelect = (center: RemoteCenter) => {
    setSelectedCenter(center.id);
    setIsDropdownOpen(false);
    setCenterSearchTerm('');
  };

  const handleCenterSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCenterSearchTerm(value);
    
    // Filter centers locally instead of making API call
    filterCenters(value);
  };

  const loadMoreCenters = () => {
    if (!loadingMoreCenters && hasMoreCenters) {
      loadCenters(centerPage + 1, '', true);
    }
  };

  const handleSearch = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    setCurrentPage(1);
    loadPatients(1);
  };

  const handleClearFilters = () => {
    setPatientNameFilter('');
    setUhidFilter('');
    setCurrentPage(1);
    loadPatients(1, '', '');
  };

  const handleView = (patient: OPDPatient) => {
    setSelectedPatient(patient);
    setViewModalOpen(true);
  };

  const handleEdit = (patient: OPDPatient) => {
    setSelectedPatient(patient);
    setEditFormData({ ...patient });
    setEditModalOpen(true);
  };

  const handleDelete = (patient: OPDPatient) => {
    setSelectedPatient(patient);
    setDeleteModalOpen(true);
  };

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (!editFormData) return;

    const { name, value } = e.target;

    if (name.startsWith('patient_history.')) {
      const field = name.split('.')[1];
      setEditFormData(prev => prev ? {
        ...prev,
        patient_history: {
          ...prev.patient_history,
          [field]: value
        }
      } : null);
    } else if (name === 'age') {
      setEditFormData(prev => prev ? {
        ...prev,
        [name]: value === '' ? 0 : parseInt(value, 10)
      } : null);
    } else {
      setEditFormData(prev => prev ? {
        ...prev,
        [name]: value
      } : null);
    }
  };

  const handleUpdateSubmit = async () => {
    if (!editFormData || !selectedPatient) return;

    try {
      setSaving(true);
      setError(null);

      const payload = {
        visit_date: editFormData.visit_date,
        doc_number: editFormData.doc_number,
        patient_name: editFormData.patient_name,
        age: Number(editFormData.age),
        gender: editFormData.gender,
        uhid: editFormData.uhid,
        consultant_user_id: editFormData.consultant_user_id,
        episode_no: editFormData.episode_no,
        allergy: editFormData.allergy,
        vitals: editFormData.vitals,
        patient_history: editFormData.patient_history,
        general_examination: editFormData.general_examination,
        systemic_examination: editFormData.systemic_examination,
        procedures: editFormData.procedures,
        treatment_note: editFormData.treatment_note,
        followup_note: editFormData.followup_note
      };

      const updateUrl = selectedCenter 
        ? API_ENDPOINTS.OPD_PATIENT.UPDATE(selectedPatient.id).replace('organisation_id=null', `organisation_id=${selectedCenter}`)
        : API_ENDPOINTS.OPD_PATIENT.UPDATE(selectedPatient.id);

      const response = await fetchApi(updateUrl, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (response.success) {
        setEditModalOpen(false);
        setSelectedPatient(null);
        setEditFormData(null);
        loadPatients(currentPage);
      } else {
        setError(response.message || 'Failed to update patient');
      }
    } catch (err) {
      console.error('Error updating patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to update patient');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPatient) return;

    try {
      setSaving(true);
      setError(null);

      const deleteUrl = selectedCenter 
        ? API_ENDPOINTS.OPD_PATIENT.DELETE(selectedPatient.id).replace('organisation_id=null', `organisation_id=${selectedCenter}`)
        : API_ENDPOINTS.OPD_PATIENT.DELETE(selectedPatient.id);

      const response = await fetchApi(deleteUrl, {
        method: 'DELETE'
      });

      if (response.success) {
        setDeleteModalOpen(false);
        setSelectedPatient(null);
        loadPatients(currentPage);
      } else {
        setError(response.message || 'Failed to delete patient');
      }
    } catch (err) {
      console.error('Error deleting patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete patient');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (patient: OPDPatient) => {
    try {
      const filename = `OPD_Report_${patient.patient_name}_${patient.visit_date}.pdf`;
      const reportUrl = selectedCenter 
        ? API_ENDPOINTS.OPD_PATIENT.REPORT(patient.id).replace('organisation_id=null', `organisation_id=${selectedCenter}`)
        : API_ENDPOINTS.OPD_PATIENT.REPORT(patient.id);
      await downloadApi(reportUrl, filename);
    } catch (err) {
      console.error('Error downloading report:', err);
      setError(err instanceof Error ? err.message : 'Failed to download report');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
  };

  const getGenderBadgeClass = (gender: string) => {
    switch (gender) {
      case 'male': return styles.badgeMale;
      case 'female': return styles.badgeFemale;
      default: return styles.badgeOther;
    }
  };

  const renderPaginationNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`${styles.pageNumber} ${currentPage === i ? styles.active : ''}`}
        >
          {i}
        </button>
      );
    }

    return pages;
  };

  const selectedCenterName = allCenters.find(c => c.id === selectedCenter)?.name || '';

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1>OPD Patient List</h1>
          <Breadcrumb items={breadcrumbItems} />
        </div>
        <div className={styles.headerRight}>
          <div className={styles.centerSelector}>
            <label>Remote Center</label>
            <div className={styles.searchableSelect} ref={dropdownRef}>
              <div 
                className={styles.selectTrigger}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {selectedCenterName || 'Select remote center'}
              </div>
              {isDropdownOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.centerSearchBox}>
                    <input
                      type="text"
                      value={centerSearchTerm}
                      onChange={handleCenterSearchChange}
                      placeholder="Search centers..."
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className={styles.options}>
                    {loadingCenters ? (
                      <div className={styles.loading}>Loading...</div>
                    ) : centers.length === 0 ? (
                      <div className={styles.noResults}>No centers found</div>
                    ) : (
                      <>
                        {centers.map(center => (
                          <div
                            key={center.id}
                            className={`${styles.option} ${selectedCenter === center.id ? styles.selected : ''}`}
                            onClick={() => handleCenterSelect(center)}
                          >
                            {center.name} ({center.location})
                          </div>
                        ))}
                        {hasMoreCenters && (
                          <div 
                            className={styles.loadMore}
                            onClick={(e) => {
                              e.stopPropagation();
                              loadMoreCenters();
                            }}
                          >
                            {loadingMoreCenters ? 'Loading more...' : 'Load more centers'}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <Link href="/patients/opd_patients" className={styles.addButton}>
            + Add New Patient
          </Link>
        </div>
      </div>

      <div className={styles.container}>
        {error && <div className={styles.error}>{error}</div>}

        {selectedCenter && (
          <div className={styles.toolbar}>
            <div className={styles.filtersContainer}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Patient Name</label>
                <div className={styles.searchBox}>
                  <span className={styles.searchIcon}>🔍</span>
                  <input
                    type="text"
                    placeholder="Filter by patient name..."
                    value={patientNameFilter}
                    onChange={(e) => setPatientNameFilter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch(e as any);
                      }
                    }}
                  />
                </div>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>UHID</label>
                <div className={styles.searchBox}>
                  <span className={styles.searchIcon}>🔍</span>
                  <input
                    type="text"
                    placeholder="Filter by UHID..."
                    value={uhidFilter}
                    onChange={(e) => setUhidFilter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch(e as any);
                      }
                    }}
                  />
                </div>
              </div>
              <div className={styles.searchActions}>
                <button
                  type="button"
                  className={styles.searchButton}
                  onClick={handleSearch}
                >
                  Search
                </button>
                {(patientNameFilter || uhidFilter) && (
                  <button
                    type="button"
                    className={styles.clearButton}
                    onClick={handleClearFilters}
                    title="Clear filters"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {!selectedCenter ? (
          <div className={styles.emptyState}>
            <p>Please select a remote center to view OPD patients</p>
          </div>
        ) : loading ? (
          <div className={styles.loading}>Loading patients...</div>
        ) : patients.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No OPD patients found</p>
            <Link href="/patients/opd_patients" className={styles.addButton}>
              + Add New Patient
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Visit Date</th>
                    {/* <th>Doc No</th> */}
                    <th>Patient Name</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>UHID</th>
                    <th>Consultant</th>
                    {/* <th>Episode No</th> */}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      <td>{formatDate(patient.visit_date)}</td>
                      {/* <td>{patient.doc_number || '-'}</td> */}
                      <td className={styles.patientName}>{patient.patient_name}</td>
                      <td>{patient.age}</td>
                      <td>
                        <span className={`${styles.badge} ${getGenderBadgeClass(patient.gender)}`}>
                          {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}
                        </span>
                      </td>
                      <td>{patient.uhid || '-'}</td>
                      <td>{getDoctorName(patient.consultant_user_id)}</td>
                      {/* <td>{patient.episode_no || '-'}</td> */}
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={`${styles.actionBtn} ${styles.viewBtn}`}
                            onClick={() => handleView(patient)}
                          >
                            View
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.editBtn}`}
                            onClick={() => handleEdit(patient)}
                          >
                            Edit
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            onClick={() => handleDelete(patient)}
                          >
                            Delete
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.downloadBtn}`}
                            onClick={() => handleDownload(patient)}
                          >
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {patients.length > 0 && totalPages > 0 && (
              <div className={styles.pagination}>
                <button
                  className={styles.paginationButton}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <div className={styles.pageNumbers}>
                  {renderPaginationNumbers()}
                </div>
                <button
                  className={styles.paginationButton}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Modal */}
      {viewModalOpen && selectedPatient && (
        <div className={styles.modalOverlay} onClick={() => setViewModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Patient Details</h2>
              <button className={styles.closeBtn} onClick={() => setViewModalOpen(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>Basic Information</h4>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Visit Date & Time</span>
                    <span className={styles.detailValue}>{formatDate(selectedPatient.visit_date)}</span>
                  </div>
                  {/* <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Doc Number</span>
                    <span className={styles.detailValue}>{selectedPatient.doc_number || '-'}</span>
                  </div> */}
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Patient Name</span>
                    <span className={styles.detailValue}>{selectedPatient.patient_name}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Age</span>
                    <span className={styles.detailValue}>{selectedPatient.age}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Gender</span>
                    <span className={styles.detailValue}>{selectedPatient.gender}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>UHID</span>
                    <span className={styles.detailValue}>{selectedPatient.uhid || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Consultant</span>
                    <span className={styles.detailValue}>{getDoctorName(selectedPatient.consultant_user_id)}</span>
                  </div>
                  {/* <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Episode No</span>
                    <span className={styles.detailValue}>{selectedPatient.episode_no || '-'}</span>
                  </div> */}
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Allergy</span>
                    <span className={styles.detailValue}>{selectedPatient.allergy || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Vitals</span>
                    <span className={styles.detailValue}>{selectedPatient.vitals || '-'}</span>
                  </div>
                </div>
              </div>

              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>Patient History</h4>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Tobacco Use</span>
                    <span className={styles.detailValue}>{selectedPatient.patient_history?.tobacco_use || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Alcohol Use</span>
                    <span className={styles.detailValue}>{selectedPatient.patient_history?.alcohol_use || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Substance Use</span>
                    <span className={styles.detailValue}>{selectedPatient.patient_history?.substance_use || '-'}</span>
                  </div>
                  <div className={`${styles.detailItem} ${styles.detailValueFull}`}>
                    <span className={styles.detailLabel}>Past Illness/Procedures</span>
                    <span className={styles.detailValue}>{selectedPatient.patient_history?.past_illness || '-'}</span>
                  </div>
                  {/* <div className={`${styles.detailItem} ${styles.detailValueFull}`}>
                    <span className={styles.detailLabel}>Past Procedures</span>
                    <span className={styles.detailValue}>{selectedPatient.patient_history?.past_procedures || '-'}</span>
                  </div> */}
                </div>
              </div>
              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>Vitals</h4>
                <div className={styles.detailGrid}>
                  <div className={`${styles.detailItem} ${styles.detailValueFull}`}>
                    {/* <span className={styles.detailLabel}>Vitals</span> */}
                    <span className={styles.detailValue}>{selectedPatient.vitals || '-'}</span>
                  </div>
                </div>
              </div>

              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>Examination</h4>
                <div className={styles.detailGrid}>
                  <div className={`${styles.detailItem} ${styles.detailValueFull}`}>
                    <span className={styles.detailLabel}>General Examination</span>
                    <span className={styles.detailValue}>{selectedPatient.general_examination || '-'}</span>
                  </div>
                  <div className={`${styles.detailItem} ${styles.detailValueFull}`}>
                    <span className={styles.detailLabel}>Systemic Examination</span>
                    <span className={styles.detailValue}>{selectedPatient.systemic_examination || '-'}</span>
                  </div>
                </div>
              </div>

              {/* <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>Procedures</h4>
                <div className={styles.detailGrid}>
                  <div className={`${styles.detailItem} ${styles.detailValueFull}`}>
                    <span className={styles.detailValue}>
                      {selectedPatient.procedures?.length > 0 
                        ? selectedPatient.procedures.join(', ') 
                        : '-'}
                    </span>
                  </div>
                </div>
              </div> */}

              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>Notes</h4>
                <div className={styles.detailGrid}>
                  <div className={`${styles.detailItem} ${styles.detailValueFull}`}>
                    <span className={styles.detailLabel}>Treatment Note</span>
                    <span className={styles.detailValue}>{selectedPatient.treatment_note || '-'}</span>
                  </div>
                  <div className={`${styles.detailItem} ${styles.detailValueFull}`}>
                    <span className={styles.detailLabel}>Follow-up Note</span>
                    <span className={styles.detailValue}>{selectedPatient.followup_note || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && editFormData && (
        <div className={styles.modalOverlay} onClick={() => setEditModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Edit Patient</h2>
              <button className={styles.closeBtn} onClick={() => setEditModalOpen(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.editForm}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Visit Date & Time</label>
                    <input
                      type="datetime-local"
                      name="visit_date"
                      value={editFormData.visit_date}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  {/* <div className={styles.formGroup}>
                    <label>Doc Number</label>
                    <input
                      type="text"
                      name="doc_number"
                      value={editFormData.doc_number}
                      onChange={handleEditInputChange}
                    />
                  </div> */}
                  <div className={styles.formGroup}>
                    <label>Patient Name</label>
                    <input
                      type="text"
                      name="patient_name"
                      value={editFormData.patient_name}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>UHID</label>
                    <input
                      type="text"
                      name="uhid"
                      value={editFormData.uhid}
                      onChange={handleEditInputChange}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Age</label>
                    <input
                      type="number"
                      name="age"
                      value={editFormData.age}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Gender</label>
                    <select
                      name="gender"
                      value={editFormData.gender}
                      onChange={handleEditInputChange}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Consultant</label>
                    <select
                      name="consultant_user_id"
                      value={editFormData.consultant_user_id}
                      onChange={handleEditInputChange}
                    >
                      <option value="">Select Consultant</option>
                      {doctors.map(doctor => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.primary_profile?.full_name || 
                           `${doctor.primary_profile?.first_name || ''} ${doctor.primary_profile?.last_name || ''}`.trim() ||
                           doctor.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* <div className={styles.formGroup}>
                    <label>UHID</label>
                    <input
                      type="text"
                      name="uhid"
                      value={editFormData.uhid}
                      onChange={handleEditInputChange}
                    />
                  </div> */}
                </div>

                <div className={styles.formRow}>
                  {/* <div className={styles.formGroup}>
                    <label>Consultant</label>
                    <select
                      name="consultant_user_id"
                      value={editFormData.consultant_user_id}
                      onChange={handleEditInputChange}
                    >
                      <option value="">Select Consultant</option>
                      {doctors.map(doctor => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.primary_profile?.full_name || 
                           `${doctor.primary_profile?.first_name || ''} ${doctor.primary_profile?.last_name || ''}`.trim() ||
                           doctor.email}
                        </option>
                      ))}
                    </select>
                  </div> */}
                  {/* <div className={styles.formGroup}>
                    <label>Vitals</label>
                    <input
                      type="text"
                      name="vitals"
                      value={editFormData.vitals}
                      onChange={handleEditInputChange}
                    />
                  </div> */}
                  {/* <div className={styles.formGroup}>
                    <label>Episode No</label>
                    <input
                      type="text"
                      name="episode_no"
                      value={editFormData.episode_no}
                      onChange={handleEditInputChange}
                    />
                  </div> */}
                  <div className={styles.formGroup}>
                    <label>Allergy</label>
                    <textarea
                      name="allergy"
                      value={editFormData.allergy}
                      onChange={handleEditInputChange}
                    />  
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Tobacco Use</label>
                    <textarea
                      name="patient_history.tobacco_use"
                      value={editFormData.patient_history?.tobacco_use || ''}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Alcohol Use</label>
                    <textarea
                      name="patient_history.alcohol_use"
                      value={editFormData.patient_history?.alcohol_use || ''}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Substance Use</label>
                    <textarea
                      name="patient_history.substance_use"
                      value={editFormData.patient_history?.substance_use || ''}
                      onChange={handleEditInputChange}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Past Illness</label>
                    <textarea
                      name="patient_history.past_illness"
                      value={editFormData.patient_history?.past_illness || ''}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  {/* <div className={styles.formGroup}>
                    <label>Past Procedures</label>
                    <textarea
                      name="patient_history.past_procedures"
                      value={editFormData.patient_history?.past_procedures || ''}
                      onChange={handleEditInputChange}
                    />
                  </div> */}
                  <div className={styles.formGroup}>
                    <label>General Examination</label>
                    <textarea
                      name="general_examination"
                      value={editFormData.general_examination}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Vitals</label>
                    <textarea
                      // type="text"
                      name="vitals"
                      value={editFormData.vitals}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  {/* <div className={styles.formGroup}>
                    <label>Vitals</label>
                    <input
                      type="text"
                      name="vitals"
                      value={editFormData.vitals}
                      onChange={handleEditInputChange}
                    />
                  </div> */}
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Systemic Examination</label>
                    <textarea
                      name="systemic_examination"
                      value={editFormData.systemic_examination}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Treatment Note</label>
                    <textarea
                      name="treatment_note"
                      value={editFormData.treatment_note}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Follow-up Note</label>
                    <textarea
                      name="followup_note"
                      value={editFormData.followup_note}
                      onChange={handleEditInputChange}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setEditModalOpen(false)}>
                Cancel
              </button>
              <button 
                className={styles.saveBtn} 
                onClick={handleUpdateSubmit}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && selectedPatient && (
        <div className={styles.modalOverlay} onClick={() => setDeleteModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className={styles.modalHeader}>
              <h2>Confirm Delete</h2>
              <button className={styles.closeBtn} onClick={() => setDeleteModalOpen(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.deleteConfirmation}>
                <p>Are you sure you want to delete this patient?</p>
                <p className={styles.patientNameHighlight}>{selectedPatient.patient_name}</p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>This action cannot be undone.</p>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </button>
              <button 
                className={styles.confirmDeleteBtn} 
                onClick={handleDeleteConfirm}
                disabled={saving}
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

