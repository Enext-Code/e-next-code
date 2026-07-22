export interface Patient {
  bedNo: string;
  name: string;
  age: number;
  patientId: string;
  admissionDate: string;
  status: 'Admitted' | 'Discharged';
}

export const patientData: Patient[] = [
  {
    bedNo: '00001',
    name: 'Christine Brooks',
    age: 30,
    patientId: '83838388',
    admissionDate: '14 Feb 2019',
    status: 'Discharged'
  },
  {
    bedNo: '00002',
    name: 'Rosie Pearson',
    age: 62,
    patientId: '979 Immanuel Ferry Suite 526',
    admissionDate: '14 Feb 2019',
    status: 'Admitted'
  },
  // Add more patient data...
]; 