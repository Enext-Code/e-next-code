'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import styles from '@/styles/adduser.module.css';
import { userService } from '@/services/userService';
import { remoteCenterService, RemoteCenter } from '@/services/remoteCenterService';
import { fetchApi } from '@/utils/api';
import { API_ENDPOINTS } from '@/constants/api';
import Breadcrumb from '@/components/common/Breadcrumb';
interface FormData {
  email: string;
  name: string;
  mobile_number: string;
  center_type: 'command_center' | 'remote_center';
  role: string;
  designation: string;
  role_type: string;
  password: string;
  confirm_password: string;
  organisation_id?: string;
}

interface UserResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    [key: string]: any;
  };
}

export default function AddUserPage() {
  const router = useRouter();
  const breadcrumbItems = [
    { label: 'User Access Control', href: '/users' },
    { label: 'Add New User' }
  ];
  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    mobile_number: '',
    center_type: 'command_center',
    role: 'superadmin',
    designation: '',
    role_type: '',
    password: '',
    confirm_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [centers, setCenters] = useState<RemoteCenter[]>([]);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  useEffect(() => {
    loadRemoteCenters();
  }, []);

  const loadRemoteCenters = async () => {
    try {
      const response = await remoteCenterService.list();
      if (response.success && response.data) {
        setCenters(response.data.items);
      }
    } catch (err) {
      console.error('Error loading centers:', err);
    }
  };

  const getRoleOptions = () => {
    if (formData.center_type === 'command_center') {
      return [
        { value: 'superadmin', label: 'Super Admin' },
        { value: 'admin', label: 'Admin' }
      ];
    } else {
      return [
        { value: 'doctor', label: 'Doctor' },
        { value: 'nurse', label: 'Nurse' }
      ];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    // Validate signature requirement for doctor role_type or doctor role
    // const isDoctor = (formData.center_type === 'command_center' && formData.role_type === 'doctor') || 
                    //  (formData.center_type === 'remote_center' && formData.role === 'doctor');
    const isDoctor = (formData.center_type === 'command_center' && formData.role_type === 'doctor') 
    if (isDoctor && !signatureFile) {
      setError('Signature is required for doctor role type');
      return;
    }

    try {
      setLoading(true);
      const userData = {
        email: formData.email,
        country_code: '+91',
        mobile_number: formData.mobile_number,
        password: formData.password,
        profile: {
          first_name: formData.name.split(' ')[0],
          last_name: formData.name.split(' ').slice(1).join(' ') || '',
          gender: 'other',
          date_of_birth: new Date().toISOString().split('T')[0],
          user_type: formData.role,
          designation: formData.designation,
          ...(formData.center_type === 'command_center' && formData.role_type && { role_type: formData.role_type }),
          language: 'en',
          theme: 'light'
        }
      };

      let response: UserResponse;
      
      // Use signature endpoint if signature file is provided
      if (signatureFile) {
        response = await userService.createWithSignature(userData, signatureFile) as UserResponse;
      } else {
        response = await userService.create(userData) as UserResponse;
      }
      
      if (response.success) {
        // If the user is a doctor or nurse and a remote center is selected, assign them to the organization
        if (formData.center_type === 'remote_center' && 
            formData.organisation_id && 
            (formData.role === 'doctor' || formData.role === 'nurse')) {
          try {
            const assignResponse = await fetchApi(API_ENDPOINTS.REMOTE_CENTER.MEMBERS.CREATE, {
              method: 'POST',
              body: JSON.stringify({
                organisation_id: formData.organisation_id,
                user_id: response.data.id
              })
            });
            
            if (!assignResponse.success) {
              throw new Error(assignResponse.message || 'Failed to assign user to remote center');
            }
          } catch (assignErr) {
            console.error('Error assigning user to remote center:', assignErr);
            setError('User created but failed to assign to remote center');
            return;
          }
        }
        
        router.push('/users');
      } else {
        setError(response.message || 'Failed to create user');
      }
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Reset role when center type changes
      if (name === 'center_type') {
        newData.role = value === 'command_center' ? 'superadmin' : 'doctor';
      }
      
      return newData;
    });
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      
      // Validate file size (e.g., max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Signature file size should be less than 5MB');
        return;
      }
      
      setSignatureFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSignatureFile(null);
      setSignaturePreview(null);
    }
  };

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1>Add New User</h1>
          <Breadcrumb items={breadcrumbItems} />
        </div>
      </div>

      <div className={styles.formContainer}>
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formmanage}>
          <div className={styles.formGroup}>
            <label htmlFor="email">User Email*</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter Email"
              required
              
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="name">Name*</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter Name"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="mobile_number">Mobile Number*</label>
            <input
              type="tel"
              id="mobile_number"
              name="mobile_number"
              value={formData.mobile_number}
              onChange={handleInputChange}
              placeholder="Enter Mobile Number"
              // required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="center_type">Center Type*</label>
            <div className={styles.dropdown}> 
            <select
              id="center_type"
              name="center_type"
              value={formData.center_type}
              onChange={handleInputChange}
              required
            >
              <option value="command_center" >Command Center</option>
              <option value="remote_center">Remote Center</option>
            </select>
            </div>
          </div>

          {formData.center_type === 'remote_center' && (
            <div className={styles.formGroup}>
              <label htmlFor="organisation_id">Remote Center*</label>
              <div className={styles.dropdown}> 
              <select
                id="organisation_id"
                name="organisation_id"
                value={formData.organisation_id}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Remote Center</option>
                {centers.map(center => (
                  <option key={center.id} value={center.id}>
                    {center.name} ({center.location})
                  </option>
                ))}
              </select>
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="role">Role*</label>
            <div className={styles.dropdown}> 
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              required
            >
              {getRoleOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="designation">Designation*</label>
            <input
              type="text"
              id="designation"
              name="designation"
              value={formData.designation}
              onChange={handleInputChange}
              placeholder="Enter Designation"
              required
            />
          </div>

          {formData.center_type === 'command_center' && (
            <div className={styles.formGroup}>
              <label htmlFor="role_type">Role Type*</label>
              <div className={styles.dropdown}>
                <select
                  id="role_type"
                  name="role_type"
                  value={formData.role_type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Role Type</option>
                  <option value="doctor">Doctor</option>
                  <option value="others">others</option>
                  {/* <option value="manager">Manager</option> */}
                </select>
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="password">Enter Password*</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter Password"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirm_password">Confirm Password*</label>
            <input
              type="password"
              id="confirm_password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleInputChange}
              placeholder="Confirm Password"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="signature">
              Signature
              {((formData.center_type === 'command_center' && formData.role_type === 'doctor')) && (
                <span style={{ color: 'red' }}> *</span>
              )}
            </label>
            <input
              type="file"
              id="signature"
              name="signature"
              accept="image/*"
              onChange={handleSignatureChange}
              required={
                (formData.center_type === 'command_center' && formData.role_type === 'doctor') 
              }
            />
            {signaturePreview && (
              <div style={{ marginTop: '0.5rem' }}>
                <img 
                  src={signaturePreview} 
                  alt="Signature preview" 
                  style={{ 
                    maxWidth: '200px', 
                    maxHeight: '100px', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    padding: '4px'
                  }} 
                />
              </div>
            )}
            <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
              {((formData.center_type === 'command_center' && formData.role_type === 'doctor') || 
                (formData.center_type === 'remote_center' && formData.role === 'doctor'))
                ? 'Upload a signature image (max 5MB). Required for doctors.'
                : 'Upload a signature image (max 5MB). Optional.'}
            </small>
          </div>

          </div>
          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Submit'}
            </button>
          </div>
          
        </form>
      </div>
    </>
  );
} 