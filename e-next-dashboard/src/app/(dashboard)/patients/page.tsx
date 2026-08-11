'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import styles from '@/styles/patients.module.css';
import { remoteCenterService, RemoteCenter } from '@/services/remoteCenterService';
import { patientService, Patient, PatientStatus } from '@/services/patientService';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/common/Breadcrumb';
export default function PatientsPage() {
  const breadcrumbItems = [
    { label: 'Patients', href: '/patients' },
  ];
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [allCenters, setAllCenters] = useState<RemoteCenter[]>([]); // All loaded centers
  const [centers, setCenters] = useState<RemoteCenter[]>([]); // Filtered centers to display
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pagination states
  const [centerPage, setCenterPage] = useState(1);
  const [hasMoreCenters, setHasMoreCenters] = useState(false);
  const [loadingMoreCenters, setLoadingMoreCenters] = useState(false);
  
  const [patientPage, setPatientPage] = useState(1);
  const [hasMorePatients, setHasMorePatients] = useState(false);
  const [loadingMorePatients, setLoadingMorePatients] = useState(false);
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<PatientStatus[]>([]);
  const itemsPerPage = 10;

  const AVAILABLE_STATUSES: { value: PatientStatus; label: string }[] = [
    { value: 'admission', label: 'Admission' },
    { value: 'discharge', label: 'Discharge' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'lama', label: 'Lama' },
    { value: 'deceased', label: 'Deceased' },
    { value: 'referred', label: 'Referred' },
  ];

  const router = useRouter();

  // Load centers with pagination (no search parameter - we'll filter locally)
  const loadCenters = async (page: number, append: boolean = false) => {
    try {
      setLoadingMoreCenters(true);
      const response = await remoteCenterService.list({ 
        page,
        limit: 100
      });

      if (response.success && response.data) {
        const updatedCenters = append ? [...allCenters, ...response.data.items] : response.data.items;
        setAllCenters(updatedCenters);
        setHasMoreCenters(response.data.has_next);
        setCenterPage(page);
        // Apply local search filter if search term exists
        if (searchTerm.trim()) {
          filterCenters(searchTerm, updatedCenters);
        } else {
          setCenters(updatedCenters);
        }
      }
    } catch (err) {
      console.error('Error loading centers:', err);
      setError('Failed to load remote centers');
    } finally {
      setLoadingMoreCenters(false);
      setLoading(false);
    }
  };

  // Filter centers locally based on search term
  const filterCenters = (search: string, centersToFilter?: RemoteCenter[]) => {
    const centersToSearch = centersToFilter || allCenters;
    
    if (!search.trim()) {
      setCenters(centersToSearch);
      return;
    }

    const searchLower = search.toLowerCase().trim();
    const filtered = centersToSearch.filter(center => 
      center.name.toLowerCase().includes(searchLower) ||
      center.location.toLowerCase().includes(searchLower)
    );
    setCenters(filtered);
  };

  // Load patients for selected center with pagination
  const loadPatients = async (centerId: string, page: number, append: boolean = false, search?: string, statuses?: PatientStatus[]) => {
    try {
      setLoadingMorePatients(true);
      
      const response = await patientService.list({ 
        organisation_id: centerId,
        page,
        limit: itemsPerPage,
        sort_order: 'desc',
        ...(search && search.trim() ? { search: search.trim() } : {}),
        ...(statuses && statuses.length > 0 ? { statuses } : {})
      });

      // // console.log('Patient API response:', response);

      if (response.success && response.data) {
        setPatients(response.data.items);
        setHasMorePatients(response.data.has_next);
        setTotalPatients(response.data.total);
        const calculatedTotalPages = Math.ceil(response.data.total / itemsPerPage);
        // // console.log('Total patients:', response.data.total);
        // // console.log('Calculated total pages:', calculatedTotalPages);
        setTotalPages(calculatedTotalPages);
        setPatientPage(page);
      } else {
        setError(response.message || 'Failed to load patients');
      }
    } catch (err) {
      console.error('Error loading patients:', err);
      setError(err instanceof Error ? err.message : 'Failed to load patients');
    } finally {
      setLoadingMorePatients(false);
    }
  };

  // Load saved center from sessionStorage on mount
  useEffect(() => {
    const loadInitialData = async () => {
      await loadCenters(1, false);
      
      // After centers are loaded, check for saved center in sessionStorage
      // Restore saved statuses from sessionStorage
      const savedStatuses = sessionStorage.getItem('selectedPatientStatuses');
      if (savedStatuses) {
        try {
          const parsed = JSON.parse(savedStatuses) as PatientStatus[];
          setSelectedStatuses(parsed);
        } catch {
          // ignore invalid JSON
        }
      }

      const savedCenterId = sessionStorage.getItem('selectedPatientCenter');
      if (savedCenterId) {
        setSelectedCenter(savedCenterId);
      }
    };
    
    loadInitialData();

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedCenter) {
      setPatientPage(1);
      setPatients([]); // Clear existing patients
      setPatientSearchTerm(''); // Clear search when center changes
      // Read statuses from sessionStorage to avoid stale state on initial load
      let statuses = selectedStatuses;
      const savedStatuses = sessionStorage.getItem('selectedPatientStatuses');
      if (savedStatuses) {
        try {
          statuses = JSON.parse(savedStatuses) as PatientStatus[];
        } catch {
          // ignore
        }
      }
      loadPatients(selectedCenter, 1, false, '', statuses);
    }
  }, [selectedCenter]);

  const handleDropdownToggle = () => {
    const newOpenState = !isDropdownOpen;
    setIsDropdownOpen(newOpenState);
    
    // When opening the dropdown, reset search and show all centers
    if (newOpenState) {
      setSearchTerm('');
      setCenters(allCenters);
    }
  };

  const handleCenterSelect = (center: RemoteCenter) => {
    // // console.log('Selecting center:', center);
    setSelectedCenter(center.id);
    // Save selected center to sessionStorage
    sessionStorage.setItem('selectedPatientCenter', center.id);
    setIsDropdownOpen(false);
    setSearchTerm('');
    // Reset to show all centers after selection
    if (allCenters.length > 0) {
      setCenters(allCenters);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Filter centers locally instead of making API call
    filterCenters(value);
  };

  const loadMoreCenters = () => {
    if (!loadingMoreCenters && hasMoreCenters) {
      loadCenters(centerPage + 1, true);
    }
  };

  const loadMorePatients = () => {
    if (!loadingMorePatients && hasMorePatients && selectedCenter) {
      loadPatients(selectedCenter, patientPage + 1, true, patientSearchTerm, selectedStatuses);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (selectedCenter && newPage >= 1 && newPage <= totalPages) {
      loadPatients(selectedCenter, newPage, false, patientSearchTerm, selectedStatuses);
    }
  };

  const handlePatientSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCenter) {
      setPatientPage(1);
      setPatients([]);
      loadPatients(selectedCenter, 1, false, patientSearchTerm, selectedStatuses);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPatientSearchTerm(e.target.value);
  };

  const handleClearSearch = () => {
    setPatientSearchTerm('');
    if (selectedCenter) {
      setPatientPage(1);
      setPatients([]);
      loadPatients(selectedCenter, 1, false, '', selectedStatuses);
    }
  };

  const handleStatusToggle = (status: PatientStatus) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];
    
    setSelectedStatuses(newStatuses);
    sessionStorage.setItem('selectedPatientStatuses', JSON.stringify(newStatuses));
    if (selectedCenter) {
      setPatientPage(1);
      setPatients([]);
      loadPatients(selectedCenter, 1, false, patientSearchTerm, newStatuses);
    }
  };

  const handleClearStatusFilter = () => {
    setSelectedStatuses([]);
    sessionStorage.removeItem('selectedPatientStatuses');
    if (selectedCenter) {
      setPatientPage(1);
      setPatients([]);
      loadPatients(selectedCenter, 1, false, patientSearchTerm, []);
    }
  };

  const renderPaginationNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, patientPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`${styles.pageButton} ${patientPage === i ? styles.activePage : ''}`}
        >
          {i}
        </button>
      );
    }

    return pages;
  };

  const selectedCenterName = allCenters.find(c => c.id === selectedCenter)?.name || '';

  const handleAddNewPatient = () => {
    // // console.log('Adding new patient');
    router.push('/patients/add');
  };

  const handleViewPatient = (patientId: string) => {
    router.push(`/patients/${patientId}`);
  };

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
        <h1>All Patient Lists</h1>
          <Breadcrumb items={breadcrumbItems} />
        </div>
        <div className={styles.centerSelector}>
          <label>Remote Center</label>
          <div className={styles.searchableSelect} ref={dropdownRef}>
            <div 
              className={styles.selectTrigger}
              onClick={handleDropdownToggle}
            >
              {selectedCenterName || 'Select remote center'}
            </div>
            {isDropdownOpen && (
              <div className={styles.dropdown}>
                <div className={styles.searchBox}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="Search centers..."
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className={styles.options}>
                  {loading ? (
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

      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.content}>
        
        {selectedCenter ? (
          <div className={styles.patientList}>
            <div className={styles.listHeader}>
              <h2>Patients {totalPatients > 0 && `(${totalPatients} total)`}</h2>
              <button 
                className={styles.addButton}
                onClick={handleAddNewPatient}
              >
                + Add New Patient
              </button>
            </div>
            <div className={styles.searchSection}>
              <form onSubmit={handlePatientSearch} className={styles.searchForm}>
                <input
                  type="text"
                  value={patientSearchTerm}
                  onChange={handleSearchInputChange}
                  placeholder="Search patients by name, UID..."
                  className={styles.searchInput}
                />
                <button 
                  type="submit"
                  className={styles.searchButton}
                  disabled={loadingMorePatients}
                >
                  Search
                </button>
                {patientSearchTerm && (
                  <button 
                    type="button"
                    onClick={handleClearSearch}
                    className={styles.clearButton}
                    disabled={loadingMorePatients}
                  >
                    Clear
                  </button>
                )}
              </form>
            </div>
            <div className={styles.statusFilterSection}>
              <span className={styles.statusFilterLabel}>Filter by Status:</span>
              <div className={styles.statusChips}>
                {AVAILABLE_STATUSES.map(status => (
                  <button
                    key={status.value}
                    type="button"
                    className={`${styles.statusChip} ${selectedStatuses.includes(status.value) ? styles.statusChipActive : ''}`}
                    onClick={() => handleStatusToggle(status.value)}
                  >
                    {status.label}
                  </button>
                ))}
                {selectedStatuses.length > 0 && (
                  <button
                    type="button"
                    className={styles.statusChipClear}
                    onClick={handleClearStatusFilter}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
            {loadingMorePatients && patients.length === 0 ? (
              <div className={styles.loading}>Loading patients...</div>
            ) : (
              <>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Sr. No.</th>
                        <th>Patient Name</th>
                        <th>Age</th>
                        <th>Gender</th>
                        <th>ICU</th>
                        <th>Bed No.</th>
                        <th>Doctor</th>
                        <th>Criticality</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.map((patient, index) => (
                        <tr key={patient.id}>
                          <td>{((patientPage - 1) * itemsPerPage) + index + 1}</td>
                          <td>{`${patient.first_name} ${patient.last_name}`}</td>
                          <td>{patient.age}</td>
                          <td>{patient.gender}</td>
                          <td>{patient.organisation_icu_name}</td>
                          <td>{patient.organisation_icu_bed_number}</td>
                          <td>{patient.doctor_full_name}</td>
                          <td>
                            <span className={`${styles.criticality} ${styles[patient.criticality]}`}>
                              {patient.criticality}
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.status} ${styles[patient.status]}`}>
                              {patient.status}
                            </span>
                          </td>
                          <td className={styles.actionCell}>
                            <button 
                              className={styles.actionButton}
                              onClick={() => handleViewPatient(patient.id)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {patients.length > 0 && totalPages > 0 && (
                  <div className={styles.pagination}>
                    <button
                      className={styles.pageButton}
                      onClick={() => handlePageChange(patientPage - 1)}
                      disabled={patientPage === 1}
                    >
                      Previous
                    </button>
                    <div className={styles.pageNumbers}>
                      {renderPaginationNumbers()}
                    </div>
                    <button
                      className={styles.pageButton}
                      onClick={() => handlePageChange(patientPage + 1)}
                      disabled={patientPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className={styles.noSelection}>
            Please select a remote center to view patients
          </div>
        )}
      </div>
    </>
  );
} 