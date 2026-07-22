'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import styles from '@/styles/remotecenter.module.css';
import { remoteCenterService } from '@/services/remoteCenterService';
import Breadcrumb from '@/components/common/Breadcrumb';

interface FormData {
  unique_id: string;
  name: string;
  location: string;
  date_of_registration?: string;
}

export default function AddRemoteCenterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    unique_id: '',
    name: '',
    location: '',
    date_of_registration: new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(false);
  const breadcrumbItems = [
    { label: 'Remote Center', href: '/remote-center' },
    { label: 'Add Remote Center' },
    // { label: 'Add Remote Center', href: '/remote-center/add' },
  ];
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await remoteCenterService.create(formData);
      if (response.success) {
        router.push('/remote-center');
      }
    } catch (error) {
      console.error('Failed to create remote center:', error);
      // You might want to show an error message to the user
    } finally {
      setIsLoading(false);
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
          <h1>Add Remote Center</h1>
          <Breadcrumb items={breadcrumbItems} />
        </div>
      </div>

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
                placeholder="Enter center name"
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
                required
                placeholder="Enter location"
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? 'Registering...' : 'Register Center'}
            </button>
          </div>
        </form>
      </div>
      </>
  );
}