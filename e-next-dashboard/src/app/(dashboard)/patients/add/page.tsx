'use client';

import React from 'react';
import AddPatientForm from '@/components/patients/AddPatientForm';
import Breadcrumb from '@/components/common/Breadcrumb';

export default function AddPatientPage() {
  const breadcrumbItems = [
    { label: 'Patients', href: '/patients' },
    { label: 'Add Patient' }
  ];
  return (
    <>
    <h1 style={{ fontSize: '28px', fontWeight: '600' }}>Add Patient</h1>
      <Breadcrumb items={breadcrumbItems} />
      <AddPatientForm />
    </>
  );
} 