'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import styles from '@/styles/remotecenter.module.css';
import { remoteCenterService, RemoteCenter } from '@/services/remoteCenterService';
import Breadcrumb from '@/components/common/Breadcrumb';

export default function EditRemoteCenterPage() {
  const router = useRouter();
  const params = useParams();
  const [formData, setFormData] = useState<Partial<RemoteCenter>>({
    unique_id: '',
    name: '',
    location: '',
    date_of_registration: new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const breadcrumbItems = [
    { label: 'Remote Center', href: '/remote-center' },
    { label: 'Edit Remote Center' },
  ];
  useEffect(() => {
    fetchRemoteCenter();
  }, [params.id]);

  const fetchRemoteCenter = async () => {
    try {
      const response = await remoteCenterService.getById(params.id as string);
      if (response.success && response.data) {
        const centerData = response.data;
        setFormData({
          unique_id: centerData.unique_id,
          name: centerData.name,
          location: centerData.location,
          date_of_registration: centerData.date_of_registration
        });
      } else {
        setError(response.message || 'Failed to fetch remote center details');
      }
    } catch (error) {
      setError('Failed to fetch remote center details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await remoteCenterService.update(params.id as string, formData);
      if (response.success) {
        router.push('/remote-center');
      } else {
        setError(response.message || 'Failed to update remote center');
      }
    } catch (error) {
      console.error('Failed to update remote center:', error);
      setError('Failed to update remote center');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this remote center?')) {
      return;
    }

    setError(null);
    try {
      const response = await remoteCenterService.delete(params.id as string);
      if (response.success) {
        router.push('/remote-center');
      } else {
        setError(response.message || 'Failed to delete remote center');
      }
    } catch (error) {
      console.error('Failed to delete remote center:', error);
      setError('Failed to delete remote center');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1>Edit Remote Center</h1>
          <Breadcrumb items={breadcrumbItems} />

        </div>
        <button 
          className={styles.deleteButton}
          onClick={handleDelete}
        >
          Delete Center
        </button>
      </div>

      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      <div className={styles.formCard}>
        <h2>Remote Center Details</h2>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="unique_id">Center Unique Id no.</label>
              <input
                type="text"
                id="unique_id"
                name="unique_id"
                value={formData.unique_id}
                onChange={handleChange}
                required
                disabled
                // readOnly
                style={{
                  backgroundColor: '#f0f0f0',
                  color: '#888',
                  cursor: 'not-allowed',
                }}
                placeholder="Enter center unique ID"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="name">Remote Center Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled
                // readOnly
                placeholder="Enter center name"
                style={{
                  backgroundColor: '#f0f0f0',
                  color: '#888',
                  cursor: 'not-allowed',
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="date_of_registration">Date Of Registration</label>
              <input
                type="date"
                id="date_of_registration"
                name="date_of_registration"
                value={formData.date_of_registration}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter location"
                className={styles.input}
                required
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
} 