'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import styles from '@/styles/users.module.css';
import { userService, User } from '@/services/userService';
import { remoteCenterService, RemoteCenter } from '@/services/remoteCenterService';
import Breadcrumb from '@/components/common/Breadcrumb';
import { useRouter } from 'next/navigation';

// Helper function to capitalize first letter of a string
const capitalizeFirstLetter = (str: string | undefined | null): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export default function UsersPage() {
  const router = useRouter();
  const breadcrumbItems = [
    { label: 'User Access Control', href: '/users' },
  ];
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [deactivatedUsers, setDeactivatedUsers] = useState(0);
  const itemsPerPage = 10  ;

  // Remote center states
  const [allCenters, setAllCenters] = useState<RemoteCenter[]>([]); // All loaded centers
  const [centers, setCenters] = useState<RemoteCenter[]>([]); // Filtered centers to display
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingCenters, setLoadingCenters] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Add useEffect to watch selectedCenter changes
  useEffect(() => {
    if (selectedCenter !== undefined) {
      setPage(1);
      loadUsers(1);
    }
  }, [selectedCenter]);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    mobile_number: '',
    designation: '',
    role: '',
    password: '',
    email: '',
    country_code: '',
  });
  const [currentSignatureUrl, setCurrentSignatureUrl] = useState<string | null>(null);
  const [newSignatureFile, setNewSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [loadingSignature, setLoadingSignature] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      setInitialLoading(true);
      try {
        // Load both APIs in parallel
        await Promise.all([
          loadUsers(1),
          loadCenters()
        ]);
      } catch (err) {
        console.error('Error initializing data:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    initializeData();

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCenters = async () => {
    try {
      setLoadingCenters(true);
      const response = await remoteCenterService.list({ 
        limit: 100
      });

      if (response.success && response.data) {
        setAllCenters(response.data.items);
        // Apply local search filter if search term exists
        if (searchTerm.trim()) {
          filterCenters(searchTerm, response.data.items);
        } else {
          setCenters(response.data.items);
        }
      }
    } catch (err) {
      console.error('Error loading centers:', err);
      setError('Failed to load remote centers');
    } finally {
      setLoadingCenters(false);
    }
  };

  // Filter centers locally based on search term
  const filterCenters = (search: string, centersToFilter?: RemoteCenter[]) => {
    const centersToSearch = centersToFilter || allCenters;
    
    if (!search.trim()) {
      setCenters(centersToSearch);
      return;
    }

    const searchLower = search.toLowerCase().trim();
    const filtered = centersToSearch.filter(center => 
      center.name.toLowerCase().includes(searchLower) ||
      center.location.toLowerCase().includes(searchLower)
    );
    setCenters(filtered);
  };

  const handleCenterSelect = (center: RemoteCenter) => {
    setSelectedCenter(center.id === '' ? '' : center.id);
    setIsDropdownOpen(false);
    setSearchTerm('');
    // Reset to show all centers after selection
    if (allCenters.length > 0) {
      setCenters(allCenters);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Filter centers locally instead of making API call
    filterCenters(value);
  };

  const loadUsers = async (pageNum: number) => {
    try {
      setLoading(true);
      const response = await userService.list({
        page: pageNum,
        limit: itemsPerPage,
        sort_order: 'desc',
        organisation_id: selectedCenter || undefined
      });

      if (response.success && response.data) {
        setUsers(response.data.items);
        setHasMore(response.data.has_next);
        setTotalUsers(response.data.total);
        const calculatedTotalPages = Math.ceil(response.data.total / itemsPerPage);
        setTotalPages(calculatedTotalPages);
        setPage(pageNum);
        
        // Calculate active and deactivated users from the data
        const active = response.data.items.filter(user => user.is_active).length;
        const inactive = response.data.items.filter(user => !user.is_active).length;
        setActiveUsers(active);
        setDeactivatedUsers(inactive);
      } else {
        setError(response.message || 'Failed to load users');
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadUsers(newPage);
    }
  };

  const renderPaginationNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`${styles.pageNumber} ${page === i ? styles.active : ''}`}
        >
          {i}
        </button>
      );
    }

    return pages;
  };

  const handleEditClick = async (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: `${user.primary_profile?.first_name || ''} ${user.primary_profile?.last_name || ''}`.trim(),
      mobile_number: user.mobile_number || '',
      designation: user.primary_profile?.designation || '',
      role: user.current_profile?.user_type || '',
      password: '',
      email: user.email || '',
      country_code: user.country_code || '+91',
    });
    
    // Reset signature states
    setCurrentSignatureUrl(null);
    setNewSignatureFile(null);
    setSignaturePreview(null);
    
    // Fetch signature for all users
    await loadUserSignature(user.id);
    
    setShowEditModal(true);
  };

  const loadUserSignature = async (userId: string) => {
    try {
      setLoadingSignature(true);
      const response = await userService.getSignatureUrl(userId);
      if (response.success && response.data?.signature_url) {
        setCurrentSignatureUrl(response.data.signature_url);
      }
    } catch (err) {
      console.error('Error loading signature:', err);
      // Signature might not exist, which is okay
    } finally {
      setLoadingSignature(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || isSubmitting) return;

    // Validate signature requirement for doctor role_type
    if (editingUser.primary_profile?.role_type === 'doctor' && !newSignatureFile && !currentSignatureUrl) {
      alert('Signature is required for doctor role type');
      return;
    }

    try {
      setIsSubmitting(true);

      // Split name into first_name and last_name
      const nameParts = editFormData.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Prepare update data with correct structure
      const updateData: any = {
        email: editFormData.email,
        country_code: editFormData.country_code,
        mobile_number: editFormData.mobile_number,
        profile: {
          first_name: firstName,
          last_name: lastName,
          user_type: editFormData.role,
        }
      };

      // Only include password if user entered a new one
      if (editFormData.password && editFormData.password.trim() !== '') {
        updateData.password = editFormData.password;
      }

      // console.log('Updating user with data:', updateData);

      const response = await userService.update(editingUser.id, updateData);

      if (response.success) {
        // Update signature if a new one was uploaded
        if (newSignatureFile) {
          try {
            const signatureResponse = await userService.updateSignature(editingUser.id, newSignatureFile);
            if (!signatureResponse.success) {
              alert('User updated but failed to update signature: ' + (signatureResponse.message || 'Unknown error'));
              return;
            }
          } catch (sigErr) {
            console.error('Error updating signature:', sigErr);
            alert('User updated but failed to update signature: ' + (sigErr instanceof Error ? sigErr.message : 'Unknown error'));
            return;
          }
        }

        alert('User updated successfully!');
        setShowEditModal(false);
        setEditFormData({
          name: '',
          mobile_number: '',
          designation: '',
          role: '',
          password: '',
          email: '',
          country_code: '',
        });
        setCurrentSignatureUrl(null);
        setNewSignatureFile(null);
        setSignaturePreview(null);
        // Refresh the users list
        loadUsers(page);
      } else {
        alert('Failed to update user: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error updating user:', err);
      alert('Failed to update user: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      
      // Validate file size (e.g., max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Signature file size should be less than 5MB');
        return;
      }
      
      setNewSignatureFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setNewSignatureFile(null);
      setSignaturePreview(null);
    }
  };

  const handleAddNewUser = () => {
    router.push('/users/add');
  };

  const handleActivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to activate this user?')) {
      return;
    }

    try {
      const response = await userService.activate(userId);
      
      if (response.success) {
        alert('User activated successfully!');
        // Refresh the users list
        loadUsers(page);
      } else {
        alert('Failed to activate user: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error activating user:', err);
      alert('Failed to activate user: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      const response = await userService.deactivate(userId);
      
      if (response.success) {
        alert('User deactivated successfully!');
        // Refresh the users list
        loadUsers(page);
      } else {
        alert('Failed to deactivate user: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error deactivating user:', err);
      alert('Failed to deactivate user: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Show loader while initial data is loading
  if (initialLoading) {
    return (
      <>
        <div className={styles.pageHeader}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '600' }}>User Access Control</h1>
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <button className={styles.addButton} onClick={handleAddNewUser}>+ Add New User</button>
        </div>
        <div className={styles.loaderContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loaderText}>Loading users and centers...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '600' }}>User Access Control</h1>
          <Breadcrumb items={breadcrumbItems} />
        </div>
        <button className={styles.addButton} onClick={handleAddNewUser}>+ Add New User</button>
      </div>

      <div className={styles.filterSection}>
        <div className={styles.centerSelector} ref={dropdownRef}>
          <label>Filter by Remote Center</label>
          <div 
            className={styles.selectTrigger}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {allCenters.find(c => c.id === selectedCenter)?.name || 'All Remote Centers'}
          </div>
          {isDropdownOpen && (
            <div className={styles.dropdown}>
              <div className={styles.searchBox}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search centers..."
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className={styles.options}>
                <div
                  className={`${styles.option} ${!selectedCenter ? styles.selected : ''}`}
                  onClick={() => handleCenterSelect({ id: '', name: '', location: '' } as RemoteCenter)}
                >
                  All Remote Centers
                </div>
                {loadingCenters ? (
                  <div className={styles.loading}>Loading...</div>
                ) : centers.length === 0 ? (
                  <div className={styles.noResults}>No centers found</div>
                ) : (
                  centers.map(center => (
                    <div
                      key={center.id}
                      className={`${styles.option} ${selectedCenter === center.id ? styles.selected : ''}`}
                      onClick={() => handleCenterSelect(center)}
                    >
                      {center.name} ({center.location})
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div>
            <h3>Total Users</h3>
            <div className={styles.statValue}>{totalUsers}</div>
          </div>
        </div>
        {/* <div className={styles.statCard}>
          <div className={styles.statIcon}>✅</div>
          <div>
            <h3>Total Active Users</h3>
            <div className={styles.statValue}>{activeUsers}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>❌</div>
          <div>
            <h3>Deactivated Users</h3>
            <div className={styles.statValue}>{deactivatedUsers}</div>
          </div>
        </div> */}
      </div>

      <div className={styles.usersList}>
        <h2>Users List</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>User ID</th>
              {/* <th>Center</th> */}
              <th>Role</th>
              <th>Location</th>
              <th>Status</th>
              <th>Edit</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && !initialLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                    <div className={styles.spinner} style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                    <span style={{ color: '#666' }}>Loading users...</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className={styles.userInfo}>
                    <div className={styles.avatar}>
                      {user.primary_profile?.first_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>{`${capitalizeFirstLetter(user.primary_profile?.first_name)} ${capitalizeFirstLetter(user.primary_profile?.last_name)}`}</div>
                  </div>
                </td>
                <td>{user.username || 'N/A'}</td>
                 {/* <td>Command Center</td> */}
                <td>{user.primary_profile?.user_type || 'N/A'}</td>
                <td>{allCenters.find(c => c.id === user.current_organisation_id)?.location || 'N/A'}</td>
                <td>
                  <span className={user.is_active ? styles.statusActive : styles.statusInactive}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button 
                    className={styles.editButton}
                    onClick={() => handleEditClick(user)}
                  >
                    <img src="https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/Group+1597881133.svg" alt="Edit" />
                  </button>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    {user.is_active ? (
                      <button 
                        className={styles.deactivateButton}
                        onClick={() => handleDeactivateUser(user.id)}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button 
                        className={styles.activateButton}
                        onClick={() => handleActivateUser(user.id)}
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>

        {users.length > 0 && totalPages > 0 && (
          <div className={styles.pagination}>
            <button
              className={styles.paginationButton}
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </button>
            <div className={styles.pageNumbers}>
              {renderPaginationNumbers()}
            </div>
            <button
              className={styles.paginationButton}
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Edit User</h2>
            <div className={styles.userHeader}>
              <div className={styles.avatar}>
                {editingUser.primary_profile?.first_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h3>{`${capitalizeFirstLetter(editingUser.primary_profile?.first_name)} ${capitalizeFirstLetter(editingUser.primary_profile?.last_name)}`}</h3>
                <p>{editingUser.username || 'N/A'}</p>
              </div>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className={styles.formGroup}>
                <label>Name *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="John Doe"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Country Code *</label>
                  <input
                    type="text"
                    value={editFormData.country_code}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, country_code: e.target.value }))}
                    required
                    placeholder="+91"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Mobile Number *</label>
                  <input
                    type="tel"
                    value={editFormData.mobile_number}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, mobile_number: e.target.value }))}
                    // required
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Email *</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder="user@example.com"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Designation *</label>
                <input
                  type="text"
                  value={editFormData.designation}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, designation: e.target.value }))}
                  required
                  placeholder="Senior Doctor"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Role *</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value }))}
                  required
                >
                  <option value="">Select Role</option>
                  {/* If current user is admin or superadmin, show only admin roles */}
                  {editingUser && (editingUser.current_profile?.user_type === 'admin' || editingUser.current_profile?.user_type === 'superadmin') ? (
                    <>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </>
                  ) : (
                    /* If current user is doctor or nurse, show only doctor/nurse roles */
                    <>
                      <option value="doctor">Doctor</option>
                      <option value="nurse">Nurse</option>
                    </>
                  )}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Password (Leave blank to keep current password)</label>
                <input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter new password (optional)"
                  minLength={8}
                />
                <small>Password must be at least 8 characters long</small>
              </div>

              {editingUser && (
                <div className={styles.formGroup}>
                  <label>
                    Signature
                    {editingUser.primary_profile?.role_type === 'doctor' && <span style={{ color: 'red' }}> *</span>}
                  </label>
                  {loadingSignature ? (
                    <div>Loading signature...</div>
                  ) : (
                    <>
                      {currentSignatureUrl && !signaturePreview && (
                        <div style={{ marginBottom: '0.5rem' }}>
                          <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>Current Signature:</p>
                          <img 
                            src={currentSignatureUrl} 
                            alt="Current signature" 
                            style={{ 
                              maxWidth: '200px', 
                              maxHeight: '100px', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '4px',
                              padding: '4px',
                              display: 'block'
                            }} 
                          />
                        </div>
                      )}
                      <input
                        type="file"
                        id="signature"
                        name="signature"
                        accept="image/*"
                        onChange={handleSignatureChange}
                        required={editingUser.primary_profile?.role_type === 'doctor' && !currentSignatureUrl}
                        style={{ marginTop: currentSignatureUrl && !signaturePreview ? '0.5rem' : '0' }}
                      />
                      {signaturePreview && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>New Signature Preview:</p>
                          <img 
                            src={signaturePreview} 
                            alt="Signature preview" 
                            style={{ 
                              maxWidth: '200px', 
                              maxHeight: '100px', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '4px',
                              padding: '4px',
                              display: 'block'
                            }} 
                          />
                        </div>
                      )}
                      <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
                        {editingUser.primary_profile?.role_type === 'doctor' 
                          ? 'Upload a signature image (max 5MB). Required for doctors.'
                          : 'Upload a new signature image (max 5MB). Leave blank to keep current signature.'}
                      </small>
                    </>
                  )}
                </div>
              )}

              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  className={styles.cancelButton}
                  onClick={() => {
                    setShowEditModal(false);
                    setEditFormData({
                      name: '',
                      mobile_number: '',
                      designation: '',
                      role: '',
                      password: '',
                      email: '',
                      country_code: '',
                    });
                    setCurrentSignatureUrl(null);
                    setNewSignatureFile(null);
                    setSignaturePreview(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.saveButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 