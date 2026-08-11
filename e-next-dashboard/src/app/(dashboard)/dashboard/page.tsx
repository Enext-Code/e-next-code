'use client';

import React, { useState, useEffect } from 'react';
import StatCard from '@/components/dashboard/StatCard';
import PatientChart from '@/components/dashboard/PatientChart';
import PatientList from '@/components/dashboard/PatientList';
import { dashboardService } from '@/services/dashboardService';
import { DashboardCounts, Organisation } from '@/types/dashboard';
import styles from '@/styles/dashboard.module.css';

// Mock data for patients list - this would come from a separate API
const patients = [
  {
    id: '#8578033',
    name: 'Oliva Shaw',
    role: 'Patient',
    avatar: '/avatars/patient1.png',
    age: 70,
    gender: 'Male',
    status: 'active' as 'active',
    price: '$644.00'
  },
  // Add more mock patients here
];

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedOrganisationId, setSelectedOrganisationId] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [isDateChanged, setIsDateChanged] = useState(false);

  // Helper function to validate if a date string is complete
  const isValidDate = (dateString: string): boolean => {
    if (!dateString || dateString.length !== 10) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };

  // Helper function to truncate long organization names
  const truncateOrgName = (name: string, location: string, maxLength: number = 40): string => {
    const fullText = `${name} (${location})`;
    if (fullText.length <= maxLength) return fullText;
    return `${fullText.substring(0, maxLength - 3)}...`;
  };

  const fetchOrganisations = async () => {
    try {
      const response = await dashboardService.organisations.list();
      if (response.success) {
        setOrganisations(response.data.items);
      }
    } catch (err) {
      console.error('Failed to fetch organisations:', err);
    }
  };

  const fetchDashboardData = async () => {
    // Don't fetch if dates are not valid
    if (!isValidDate(dateRange.start) || !isValidDate(dateRange.end)) {
      return;
    }

    return fetchDashboardDataWithDates(dateRange.start, dateRange.end);
  };

  const fetchDashboardDataWithDates = async (startDate: string, endDate: string) => {
    // Don't fetch if dates are not valid
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        start_date: startDate,
        end_date: endDate,
        ...(selectedOrganisationId ? { organisation_id: selectedOrganisationId } : {})
      };
      
      const response = await dashboardService.getCounts(filters);
      
      if (response.success) {
        setDashboardData(response.data.counts);
        setIsDateChanged(false); // Reset the flag after successful fetch
      } else {
        setError(response.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganisations();
  }, []);

  // Only fetch data when organization changes, not when dates change
  useEffect(() => {
    fetchDashboardData();
  }, [selectedOrganisationId]);

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDateChanged(true); // Mark that dates have been changed
  };

  const handleQuickDateSelect = (range: 'today' | 'week' | 'month') => {
    const now = new Date();
    let start: string, end: string;

    switch (range) {
      case 'today':
        start = end = now.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        start = weekStart.toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        start = monthStart.toISOString().split('T')[0];
        end = monthEnd.toISOString().split('T')[0];
        break;
    }

    // Update the date range
    setDateRange({ start, end });
    setIsDateChanged(false); // Quick select doesn't need manual refresh
    
    // Fetch data with the new date range directly
    fetchDashboardDataWithDates(start, end);
  };

  if (loading) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3>Error Loading Dashboard</h3>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.dashboardHeader}>
        <h1>Dashboard Overview</h1>
        <div className={styles.dashboardActions}>
          <div className={styles.filtersContainer}>
            <div className={styles.organisationSelector}>
              <label htmlFor="organisation-select">Organization:</label>
              <select
                id="organisation-select"
                value={selectedOrganisationId}
                onChange={(e) => setSelectedOrganisationId(e.target.value)}
                className={styles.organisationSelect}
              >
                <option value="">All Organizations</option>
                {organisations.map((org) => (
                  <option key={org.id} value={org.id} title={`${org.name} (${org.location})`}>
                    {truncateOrgName(org.name, org.location)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className={styles.dateRangeSelector}>
              <div className={styles.quickDateButtons}>
                <button 
                  onClick={() => handleQuickDateSelect('today')}
                  className={styles.quickDateBtn}
                >
                  Today
                </button>
                <button 
                  onClick={() => handleQuickDateSelect('week')}
                  className={styles.quickDateBtn}
                >
                  This Week
                </button>
                <button 
                  onClick={() => handleQuickDateSelect('month')}
                  className={styles.quickDateBtn}
                >
                  This Month
                </button>
              </div>
              <div className={styles.dateInputs}>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className={styles.dateInput}
                />
                <span>to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className={styles.dateInput}
                />
                {isDateChanged && (
                  <button
                    onClick={fetchDashboardData}
                    className={styles.refreshButton}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className={styles.smallSpinner}></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        🔄 Refresh
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* <button className={styles.addPatientBtn}>+ Admit New Patient</button> */}
        </div>
      </div>

      {dashboardData && (
        <>
          <div className={styles.statsCards}>
            <StatCard
              title="Total Patients"
              value={dashboardData.total_patients}
              icon="👥"
              iconBgColor="#e6efff"
            />
            <StatCard
              title="Active Patients"
              value={dashboardData.active_patients}
              icon="🏥"
              iconBgColor="#e6f7ef"
            />
            <StatCard
              title="Discharged Patients"
              value={dashboardData.discharged_patients}
              icon="📋"
              iconBgColor="#fff6e0"
            />
            <StatCard
              title="New Admissions"
              value={dashboardData.new_admissions}
              icon="➕"
              iconBgColor="#ffefef"
            />

            <StatCard
              title="Lama Patients"
              value={dashboardData.lama_patients}
              icon="⏸️"
              iconBgColor="#f0f0f0"
            />
            <StatCard
              title="Step Down Patients"
              value={dashboardData.step_down_patients}
              icon="⬇️"
              iconBgColor="#e8f4fd"
            />
            <StatCard
              title="Referred Patients"
              value={dashboardData.referred_patients}
              icon="↗️"
              iconBgColor="#fff0f5"
            />
            <StatCard
              title="Deceased Patients"
              value={dashboardData.deceased_patients}
              icon="👶"
              iconBgColor="#ffeaa7"
            />

            <StatCard
              title="ICU's Count"
              value={dashboardData.remote_centers_count}
              icon="🏢"
              iconBgColor="#f0fff0"
            />
            <StatCard
              title="Total Staff"
              value={dashboardData.total_staff}
              icon="👨‍⚕️"
              iconBgColor="#f0f8ff"
            />
            <StatCard
              title="Doctors"
              value={dashboardData.total_doctors}
              icon="🩺"
              iconBgColor="#f5f0ff"
            />
            <StatCard
              title="Nurses"
              value={dashboardData.total_nurses}
              icon="💉"
              iconBgColor="#fff0f5"
            />

            <StatCard
              title="Occupied Beds"
              value={dashboardData.occupied_beds}
              icon="🛏️"
              iconBgColor="#fff8dc"
            />
            <StatCard
              title="Total Beds"
              value={dashboardData.total_beds}
              icon="🏥"
              iconBgColor="#f0f8ff"
            />
          </div>

          {/* <div className={styles.statsCards}>
            
            
            <StatCard
              title="Bed Occupancy Rate"
              value={`${dashboardData.bed_occupancy_rate}%`}
              icon="📊"
              iconBgColor="#e6f3ff"
            />
             */}
            {/* <StatCard
              title="Date Range"
              value={dashboardData.date_range}
              icon="📅"
              iconBgColor="#f5f5f5"
            /> */}
          {/* </div> */}
        </>
      )}

      {/* <div className={styles.chartSection}>
        <div className={styles.sectionHeader}>
          <h2>Patient Trends</h2>
          <div className={styles.monthFilter}>
            <select>
              <option>Current Month</option>
            </select>
          </div>
        </div>
        <PatientChart />
      </div> */}

      {/* <PatientList patients={patients} /> */}
    </>
  );
} 