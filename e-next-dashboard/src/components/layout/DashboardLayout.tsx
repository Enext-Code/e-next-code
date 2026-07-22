import React, { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import styles from '@/styles/dashboard.module.css';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className={styles.dashboardContainer}>
      <Header />
      <div className={styles.contentWrapper}>
        <Sidebar />
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 