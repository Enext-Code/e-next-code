'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Breadcrumb from '@/components/common/Breadcrumb';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import styles from '@/styles/remotecenter.module.css';
import { remoteCenterService, RemoteCenter } from '@/services/remoteCenterService';

export default function RemoteCenterPage() {
  const router = useRouter();
  const [centers, setCenters] = useState<RemoteCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const breadcrumbItems = [
    { label: 'Remote Center', href: '/remote-center' },
  ];
  useEffect(() => {
    fetchRemoteCenters();
  }, []);

  const fetchRemoteCenters = async () => {
    try {
      const response = await remoteCenterService.list();
      // console.log('API Response:', response);
      if (response.success && response.data) {
        // console.log('Setting centers with:', response.data);
        setCenters(response.data.items);
      } else {
        setError(response.message || 'Failed to fetch remote centers');
      }
    } catch (err) {
      console.error('Error fetching centers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch remote centers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewCenter = () => {
    router.push('/remote-center/add');
  };

  const handleEditCenter = (id: string) => {
    router.push(`/remote-center/${id}`);
  };

  if (loading) {
    return (
      <>
        <div className={styles.loadingState}>Loading remote centers...</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className={styles.errorState}>{error}</div>
      </>
    );
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          
          <h1>Remote Center</h1>
          <Breadcrumb items={breadcrumbItems} />
        </div>
        <button 
          className={styles.addButton}
          onClick={handleAddNewCenter}
        >
          + Add New Remote Center
        </button>
      </div>

      <div className={styles.centerGrid}>
        {centers.map((center, index) => (
          <div key={center.id} className={styles.centerCard}>
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.centerNumber}>{index + 1}</div>
                <h3 className={styles.centerName}>{center.name}</h3>
                <button 
                  className={styles.editButton}
                  onClick={() => handleEditCenter(center.id)}
                >
                  <img src="https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/Group+1597881133.svg" alt="Edit" className={styles.editIcon} />
                </button>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Location</span>
                <span className={styles.value}>{center.location}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Active Patient</span>
                <span className={styles.activeValue}>{center.active_patients_count}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Beds</span>
                <span className={styles.value}>{center.total_beds_count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
} 