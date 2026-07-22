'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import styles from '@/styles/dashboard.module.css';
import { useAuth } from '@/contexts/AuthContext';

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const [isRemoteCenterExpanded, setIsRemoteCenterExpanded] = useState(
    pathname.startsWith('/remote-center')
  );
  const [isUserManagementExpanded, setIsUserManagementExpanded] = useState(
    pathname.startsWith('/users')
  );
  const [isPatientExpanded, setIsPatientExpanded] = useState(
    pathname.startsWith('/patients')
  );

  const isActive = (path: string) => {
    // Handle specific submenu routes first
    if (path === '/patients/add' && pathname.startsWith('/patients/add')) {
      return true;
    }
    if (path === '/patients/progress-sheet' && pathname.startsWith('/patients/progress-sheet')) {
      return true;
    }
    if (path === '/remote-center/add' && pathname.startsWith('/remote-center/add')) {
      return true;
    }
    if (path === '/remote-center/icu' && pathname.startsWith('/remote-center/icu')) {
      return true;
    }
    if (path === '/users/add' && pathname.startsWith('/users/add')) {
      return true;
    }

    // Handle main list routes
    if (path === '/patients') {
      return pathname.startsWith('/patients') && 
        !pathname.startsWith('/patients/add') && 
        !pathname.startsWith('/patients/opd_patients') &&
        !pathname.startsWith('/patients/opd-patient-list') &&
        !pathname.startsWith('/patients/progress-sheet');
    }
    if (path === '/remote-center') {
      return pathname.startsWith('/remote-center') && 
        !pathname.startsWith('/remote-center/add') && 
        !pathname.startsWith('/remote-center/icu');
    }
    if (path === '/users') {
      return pathname.startsWith('/users') && 
        !pathname.startsWith('/users/add');
    }

    // For all other routes, exact match
    return pathname === path;
  };

  const isSubActive = (path: string) => {
    return pathname.startsWith(path);
  };

  const handleRemoteCenterClick = () => {
    setIsRemoteCenterExpanded(!isRemoteCenterExpanded);
    router.push('/remote-center');
  };

  const handleUserManagementClick = () => {
    setIsUserManagementExpanded(!isUserManagementExpanded);
    router.push('/users');
  };

  const handlePatientClick = () => {
    setIsPatientExpanded(!isPatientExpanded);
    router.push('/patients');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.navMenu}>
        <ul>
          <li>
            <Link 
              href="/dashboard"
              className={`${styles.navItem} ${isActive('/dashboard') ? styles.active : ''}`}
            >
              <Image src="https://enext-assets.s3.ap-south-1.amazonaws.com/assets/SquaresFour.svg" alt="Dashboard" width={24} height={24} />
              <span className={styles.navLabel}>Dashboard</span>
            </Link>
          </li>

          {/* Remote Center with submenu */}
          <li className={styles.menuItemWithSubmenu}>
            <div 
              className={`${styles.navItem} ${isSubActive('/remote-center') ? styles.active : ''}`}
              onClick={handleRemoteCenterClick}
            >
              <div className={styles.navItemContent}>
                <Image 
                  src={isSubActive('/remote-center') 
                    ? "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/home-01.svg"
                    : "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/home-01(1).svg"} 
                  alt="Remote Center" 
                  width={24} 
                  height={24} 
                />
                <span className={styles.navLabel}>Remote Center</span>
              </div>
              <span className={`${styles.arrow} ${isRemoteCenterExpanded ? styles.expanded : ''}`}>
                ▼
              </span>
            </div>
            
            {isRemoteCenterExpanded && (
              <ul className={styles.submenu}>
                <li>
                  <Link 
                    href="/remote-center"
                    className={`${styles.navItem} ${isActive('/remote-center') ? styles.active : ''}`}
                  >
                    <Image 
                      src={isActive('/remote-center')
                        ? "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/home-01.svg"
                        : "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/home-01(1).svg"}
                      alt="Center List" 
                      width={24} 
                      height={24} 
                    />
                    <span className={styles.navLabel}>Center List</span>
                  </Link>
                </li>
                {/* Add Center - Only visible to superadmin */}
                {user?.type === 'superadmin' && (
                  <li>
                    <Link 
                      href="/remote-center/add"
                      className={`${styles.navItem} ${isActive('/remote-center/add') ? styles.active : ''}`}
                    >
                      <Image 
                        src={isActive('/remote-center/add')
                          ? "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/home-01.svg"
                          : "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/home-01(1).svg"}
                        alt="Add Center" 
                        width={24} 
                        height={24} 
                      />
                      <span className={styles.navLabel}>Add Center</span>
                    </Link>
                  </li>
                )}
                {/* ICU & Beds - Only visible to superadmin */}
                {user?.type === 'superadmin' && (
                  <li>
                    <Link 
                      href="/remote-center/icu"
                      className={`${styles.navItem} ${isActive('/remote-center/icu') ? styles.active : ''}`}
                    >
                      <Image 
                        src={isActive('/remote-center/icu')
                          ? "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/home-01.svg"
                          : "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/home-01(1).svg"}
                        alt="ICU & Beds" 
                        width={24} 
                        height={24} 
                      />
                      <span className={styles.navLabel}>ICU & Beds</span>
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </li>

          {/* User Management with submenu - Only visible to superadmin */}
          {user?.type === 'superadmin' && (
            <li className={styles.menuItemWithSubmenu}>
              <div 
                className={`${styles.navItem} ${isSubActive('/users') ? styles.active : ''}`}
                onClick={handleUserManagementClick}
              >
                <div className={styles.navItemContent}>
                  <Image src={isSubActive('/users')
                          ? "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/color-heart.svg"
                          : "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/heart.svg"} 
                    alt="User Management" 
                    width={24} 
                    height={24} 
                  />
                  <span className={styles.navLabel}>User Management</span>
                </div>
                <span className={`${styles.arrow} ${isUserManagementExpanded ? styles.expanded : ''}`}>
                  ▼
                </span>
              </div>
              
              {isUserManagementExpanded && (
                <ul className={styles.submenu}>
                  <li>
                    <Link 
                      href="/users"
                      className={`${styles.navItem} ${isActive('/users') ? styles.active : ''}`}
                    >
                      <Image src={isActive('/users')
                          ? "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/color-heart.svg"
                          : "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/heart.svg"} 
                        alt="User List" 
                        width={24} 
                        height={24} 
                      />
                      <span className={styles.navLabel}>User List</span>
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/users/add"
                      className={`${styles.navItem} ${isActive('/users/add') ? styles.active : ''}`}
                    >
                      <Image src={isActive('/users/add')
                          ? "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/color-heart.svg"
                          : "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/heart.svg"} 
                        alt="Add New User" 
                        width={24} 
                        height={24} 
                      />
                      <span className={styles.navLabel}>Add New User</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          )}

          {/* Patient Management with submenu */}
          <li className={styles.menuItemWithSubmenu}>
            <div 
              className={`${styles.navItem} ${isSubActive('/patients') ? styles.active : ''}`}
              onClick={handlePatientClick}
            >
              <div className={styles.navItemContent}>
                <Image src={isSubActive('/patients')
                        ? "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/users-01.svg"
                        : "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/users-01.svg"} 
                  alt="Patient" 
                  width={24} 
                  height={24} 
                />
                <span className={styles.navLabel}>Patient</span>
              </div>
              <span className={`${styles.arrow} ${isPatientExpanded ? styles.expanded : ''}`}>
                ▼
              </span>
            </div>
            
            {isPatientExpanded && (
              <ul className={styles.submenu}>
                <li>
                  <Link 
                    href="/patients"
                    className={`${styles.navItem} ${isActive('/patients') ? styles.active : ''}`}
                  >
                    <Image src={isActive('/patients')
                        ? "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/users-01.svg"
                        : "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/users-01.svg"} 
                      alt="Patient List" 
                      width={24} 
                      height={24} 
                    />
                    <span className={styles.navLabel}>Patient List</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/patients/add"
                    className={`${styles.navItem} ${isActive('/patients/add') ? styles.active : ''}`}
                  >
                    <Image src={isActive('/patients/add')
                        ? "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/users-01.svg"
                        : "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/users-01.svg"} 
                      alt="Add New Patient" 
                      width={24} 
                      height={24} 
                    />
                    <span className={styles.navLabel}>Add New Patient</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/patients/opd_patients"
                    className={`${styles.navItem} ${isActive('/patients/opd_patients') ? styles.active : ''}`}
                  >
                    <Image src={isActive('/patients/opd_patients')
                        ? "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/users-01.svg"
                        : "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/users-01.svg"} 
                      alt="OPD Patients" 
                      width={24} 
                      height={24} 
                    />
                    <span className={styles.navLabel}>OPD Patients</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/patients/opd-patient-list"
                    className={`${styles.navItem} ${isActive('/patients/opd-patient-list') ? styles.active : ''}`}
                  >
                    <Image src={isActive('/patients/opd-patient-list')
                        ? "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/users-01.svg"
                        : "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/users-01.svg"} 
                    alt="OPD Patient List" 
                    width={24} 
                    height={24} 
                  />
                  <span className={styles.navLabel}>OPD Patient List</span>
                  </Link>
                </li>
                {/* <li>
                  <Link 
                    href="/patients/progress-sheet"
                    className={`${styles.navItem} ${isActive('/patients/progress-sheet') ? styles.active : ''}`}
                  >
                    <Image src={isActive('/patients/progress-sheet')
                        ? "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/users-01.svg"
                        : "https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/users-01.svg"} 
                      alt="Progress Sheet" 
                      width={24} 
                      height={24} 
                    />
                    <span className={styles.navLabel}>Progress Sheet</span>
                  </Link>
                </li> */}
              </ul>
            )}
          </li>
        </ul>
      </nav>
      
      <div className={styles.logoutSection}>
        <button 
          className={styles.logoutButton}
          onClick={handleLogout}
        >
          <span className={styles.logoutIcon}>⏻</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar; 