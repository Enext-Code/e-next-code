'use client';

import React from 'react';
import Image from 'next/image';
import LoginForm from '@/components/auth/LoginForm';
import styles from '@/styles/auth.module.css';

export default function Login() {
  return (
    <div className={`${styles.loginContainer} container`}>
      <div className={styles.loginFormContainer}>
        <div className={styles.logoContainer}>
          <Image
            src="/enext-logo.svg"
            alt="eNext ICU Logo"
            width={180}
            height={50}
            priority
          />
        </div>
        
        <LoginForm />
      </div>
      
      <div className={styles.loginImageContainer}>
        <Image
          src="/doctor-grp.svg"
          alt="Healthcare professionals"
          fill
          sizes="(max-width: 768px) 0vw, 60vw"
          priority
          quality={100}
          style={{ 
            objectFit: "cover",
            objectPosition: "center",
            borderRadius: "24px"
          }}
        />
      </div>
    </div>
  );
} 