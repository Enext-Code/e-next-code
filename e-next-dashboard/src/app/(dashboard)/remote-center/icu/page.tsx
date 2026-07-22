'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import styles from '@/styles/icu.module.css';
import { remoteCenterService, RemoteCenter } from '@/services/remoteCenterService';
import { icuService, ICU } from '@/services/icuService';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import Breadcrumb from '@/components/common/Breadcrumb';
export default function ICUPage() {
  const router = useRouter();
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [centers, setCenters] = useState<RemoteCenter[]>([]);
  const [icus, setICUs] = useState<ICU[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newICU, setNewICU] = useState({ name: '', beds: '' });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pagination states
  const [centerPage, setCenterPage] = useState(1);
  const [hasMoreCenters, setHasMoreCenters] = useState(false);
  const [loadingMoreCenters, setLoadingMoreCenters] = useState(false);
  
  const [icuPage, setIcuPage] = useState(1);
  const [hasMoreICUs, setHasMoreICUs] = useState(false);
  const [loadingMoreICUs, setLoadingMoreICUs] = useState(false);
  const [totalICUs, setTotalICUs] = useState(0);

  // Delete confirmation modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [icuToDelete, setIcuToDelete] = useState<{ id: string; name: string } | null>(null);

  // Create ICU loading state
  const [isCreatingICU, setIsCreatingICU] = useState(false);

  // Load centers with search and pagination
  const loadCenters = async (page: number, search: string = '', append: boolean = false) => {
    try {
      setLoadingMoreCenters(true);
      const response = await remoteCenterService.list({ 
        page,
        limit: 100,
        search
      });

      if (response.success && response.data) {
        setCenters(prev => append ? [...prev, ...response.data.items] : response.data.items);
        setHasMoreCenters(response.data.has_next);
        setCenterPage(page);
      }
    } catch (err) {
      console.error('Error loading centers:', err);
      setError('Failed to load remote centers');
    } finally {
      setLoadingMoreCenters(false);
      setLoading(false);
    }
  };

  // Load ICUs for selected center with pagination
  const loadICUs = async (centerId: string, page: number, append: boolean = false) => {
    try {
      setLoadingMoreICUs(true);
      const response = await icuService.list({ 
        organisation_id: centerId,
        page,
        limit: 10,
        sort_order: 'desc'
      });

      if (response.success && response.data) {
        setICUs(prev => append ? [...prev, ...response.data.items] : response.data.items);
        setHasMoreICUs(response.data.has_next);
        setTotalICUs(response.data.total);
        setIcuPage(page);
      }
    } catch (err) {
      console.error('Error loading ICUs:', err);
      setError('Failed to load ICUs');
    } finally {
      setLoadingMoreICUs(false);
    }
  };

  useEffect(() => {
    loadCenters(1);

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
      setIcuPage(1);
      loadICUs(selectedCenter, 1);
    }
  }, [selectedCenter]);

  const handleCenterSelect = (center: RemoteCenter) => {
    setSelectedCenter(center.id);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCenterPage(1);
    loadCenters(1, value);
  };

  const loadMoreCenters = () => {
    if (!loadingMoreCenters && hasMoreCenters) {
      loadCenters(centerPage + 1, searchTerm, true);
    }
  };

  const loadMoreICUs = () => {
    if (!loadingMoreICUs && hasMoreICUs && selectedCenter) {
      loadICUs(selectedCenter, icuPage + 1, true);
    }
  };

  const handleCreateICU = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCenter) {
      setError('Please select a remote center');
      return;
    }

    setIsCreatingICU(true);
    setError(null);

    try {
      const response = await icuService.create({
        organisation_id: selectedCenter,
        name: newICU.name,
        total_beds: parseInt(newICU.beds, 10)
      });

      if (response.success) {
        setNewICU({ name: '', beds: '' });
        setIcuPage(1);
        loadICUs(selectedCenter, 1);
      }
    } catch (err) {
      console.error('Error creating ICU:', err);
      setError('Failed to create ICU');
    } finally {
      setIsCreatingICU(false);
    }
  };

  const handleDeleteClick = (icu: { id: string; name: string }) => {
    setIcuToDelete(icu);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!icuToDelete) return;

    try {
      const response = await icuService.delete(icuToDelete.id);
      if (response.success) {
        // Refresh the ICU list
        loadICUs(selectedCenter, 1);
      } else {
        alert('Failed to delete ICU: ' + response.message);
      }
    } catch (error) {
      console.error('Error deleting ICU:', error);
      alert('Failed to delete ICU. Please try again.');
    }
  };

  const selectedCenterName = centers.find(c => c.id === selectedCenter)?.name || '';
  const breadcrumbItems = [
    { label: 'Home', href: '/dashboard' },
    { label: 'Remote Center', href: '/remote-center' },
    { label: 'ICU & Beds' }
  ];
  return (
    <>
      {/* <div className={styles.pageHeader}> */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '500' }}>ICU & Beds</h1>
        <Breadcrumb items={breadcrumbItems} />
        {/* <div>
          <div className={styles.breadcrumb}>
            <Link href="/dashboard">Home</Link>
            <Link href="/remote-center">Remote Center</Link>
            <span>ICU & Beds</span>
          </div>
          <h1>Add ICU & Beds</h1>
        </div> */}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.content}>
        <div className={styles.addForm}>
          <h2>Add ICU & Beds</h2>
          <form onSubmit={handleCreateICU}>
            <div className={styles.formGroup}>
              <label>Select Remote Center</label>
              <div className={styles.searchableSelect} ref={dropdownRef}>
                <div 
                  className={styles.selectTrigger}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  {selectedCenterName || 'Select a center'}
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

            <div className={styles.formGroup}>
              <label>ICU Name</label>
              <input
                type="text"
                value={newICU.name}
                onChange={e => setNewICU(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter ICU name"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Number of Beds</label>
              <input
                type="number"
                value={newICU.beds}
                onChange={e => setNewICU(prev => ({ ...prev, beds: e.target.value }))}
                placeholder="Enter number of beds"
                required
              />
            </div>

            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isCreatingICU}
            >
              {isCreatingICU && <div className={styles.loadingSpinner}></div>}
              {isCreatingICU ? 'Creating...' : 'Create'}
            </button>
          </form>
        </div>

        <div className={styles.icuList}>
          <h2>ICU & Bed List {totalICUs > 0 && `(${totalICUs} total)`}</h2>
          <table>
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Center</th>
                <th>ICU</th>
                <th>Bed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {icus.map((icu, index) => (
                <tr key={icu.id}>
                  <td>{((icuPage - 1) * 10) + index + 1}</td>
                  <td>{centers.find(c => c.id === icu.organisation_id)?.name}</td>
                  <td>{icu.name}</td>
                  <td>{icu.total_beds}</td>
                  <td>
                    <button onClick={() => {/* Handle edit */}}></button>
                    <button 
                      onClick={() => handleDeleteClick(icu)}
                      className={styles.deleteButton}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMoreICUs && (
            <div className={styles.loadMoreICUs}>
              <button 
                onClick={loadMoreICUs}
                disabled={loadingMoreICUs}
              >
                {loadingMoreICUs ? 'Loading more...' : 'Load more ICUs'}
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete ICU"
        message={`Are you sure you want to delete ${icuToDelete?.name || 'this ICU'}? This action cannot be undone.`}
      />
    </>
  );
} 