'use client';

import React from 'react';
import Image from 'next/image';
import styles from '@/styles/dashboard.module.css';
import UserProfile from './UserProfile';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const { user } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.logo}>
          <Image
            src="/enext-logo.svg"
            alt="eNext ICU Logo"
            width={240}
            height={30}
            priority
          />
        </div>
        {/* <button className={styles.menuToggle}>
          <span>≡</span>
        </button> */}
      </div>
      
      <div className={styles.headerRight}>
        {/* <div className={styles.searchBar}>
          <span className={styles.searchIcon}>🔍</span>
          <input type="text" placeholder="Search" />
        </div> */}
        
        {/* <div className={styles.notification}>
          <Image src="https://enext-assets.s3.ap-south-1.amazonaws.com/assets/Notification.svg" alt="Notification" width={24} height={24} />
          <span className={styles.notificationBadge}>1</span>
        </div> */}
        
        <UserProfile user={user} />
      </div>
    </header>
  );
};

export default Header;
