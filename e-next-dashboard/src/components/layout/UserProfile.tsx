'use client';

import React from 'react';
import Image from 'next/image';
import styles from '@/styles/dashboard.module.css';
import { User } from '@/types/auth';

interface UserProfileProps {
  user: User | null;
}

export default function UserProfile({ user }: UserProfileProps) {
  if (!user) {
    return (
      <div className={styles.userProfile}>
        <div className={styles.avatar}>
          <Image
            src="/avatar.png"
            alt="Default Avatar"
            width={40}
            height={40}
          />
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>Guest User</span>
          <span className={styles.userRole}>Not logged in</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.userProfile}>
      {/* <div className={styles.avatar}>
        <Image
          src={user.profile?.avatar || "/avatar.png"}
          alt={`${user.profile?.full_name || 'User'}'s Avatar`}
          width={40}
          height={40}
        />
      </div> */}
      <div className={styles.userInfo}>
        <span className={styles.userName}>
          {user.profile?.full_name || user.username}
        </span>
        <span className={styles.userRole}>{user.type}</span>
      </div>
    </div>
  );
} 