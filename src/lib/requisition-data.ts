export type RequisitionStatus = 'pending' | 'approved' | 'rejected' | 'in-progress';
export type RequisitionPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RequisitionCategory = 'office-supplies' | 'equipment' | 'software' | 'travel' | 'maintenance' | 'other';

export interface RequisitionItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Requisition {
  id: string;
  title: string;
  requester: string;
  department: string;
  category: RequisitionCategory;
  priority: RequisitionPriority;
  status: RequisitionStatus;
  items: RequisitionItem[];
  justification: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

const departments = ['Finance', 'Engineering', 'Marketing', 'Operations', 'HR', 'Sales'];
const names = ['Adebayo Ogunlesi', 'Fatima Ibrahim', 'Chidi Nwosu', 'Amina Bello', 'Emeka Okafor', 'Grace Afolabi'];

export const sampleRequisitions: Requisition[] = [
  {
    id: 'REQ-001',
    title: 'Office Printer Replacement',
    requester: names[0],
    department: departments[1],
    category: 'equipment',
    priority: 'high',
    status: 'pending',
    items: [
      { description: 'HP LaserJet Pro MFP', quantity: 2, unitPrice: 450 },
      { description: 'Toner Cartridges (set of 4)', quantity: 4, unitPrice: 85 },
    ],
    justification: 'Current printers are over 5 years old and frequently breaking down, causing delays in document processing.',
    totalAmount: 1240,
    createdAt: '2026-02-10T09:30:00Z',
    updatedAt: '2026-02-10T09:30:00Z',
  },
  {
    id: 'REQ-002',
    title: 'Team Software Licenses',
    requester: names[1],
    department: departments[2],
    category: 'software',
    priority: 'medium',
    status: 'approved',
    items: [
      { description: 'Adobe Creative Suite License', quantity: 5, unitPrice: 600 },
      { description: 'Figma Business Plan', quantity: 5, unitPrice: 180 },
    ],
    justification: 'Design team expansion requires additional software licenses for new hires.',
    totalAmount: 3900,
    createdAt: '2026-02-08T14:15:00Z',
    updatedAt: '2026-02-09T10:00:00Z',
  },
  {
    id: 'REQ-003',
    title: 'Conference Room Furniture',
    requester: names[2],
    department: departments[3],
    category: 'equipment',
    priority: 'low',
    status: 'in-progress',
    items: [
      { description: 'Ergonomic Conference Chairs', quantity: 12, unitPrice: 320 },
      { description: 'Conference Table (12-seater)', quantity: 1, unitPrice: 2500 },
    ],
    justification: 'New conference room setup for the recently renovated 3rd floor.',
    totalAmount: 6340,
    createdAt: '2026-02-05T11:00:00Z',
    updatedAt: '2026-02-11T08:45:00Z',
  },
  {
    id: 'REQ-004',
    title: 'Travel Expense - Client Visit',
    requester: names[3],
    department: departments[5],
    category: 'travel',
    priority: 'urgent',
    status: 'pending',
    items: [
      { description: 'Flight tickets (round trip)', quantity: 2, unitPrice: 750 },
      { description: 'Hotel accommodation (3 nights)', quantity: 2, unitPrice: 200 },
      { description: 'Per diem allowance', quantity: 6, unitPrice: 50 },
    ],
    justification: 'Critical client meeting to finalize Q2 contract renewal worth $2M.',
    totalAmount: 2200,
    createdAt: '2026-02-11T16:00:00Z',
    updatedAt: '2026-02-11T16:00:00Z',
  },
  {
    id: 'REQ-005',
    title: 'Office Supplies Restock',
    requester: names[4],
    department: departments[0],
    category: 'office-supplies',
    priority: 'low',
    status: 'approved',
    items: [
      { description: 'A4 Paper (boxes)', quantity: 20, unitPrice: 25 },
      { description: 'Ink Cartridges', quantity: 10, unitPrice: 35 },
      { description: 'Stationery Bundle', quantity: 15, unitPrice: 18 },
    ],
    justification: 'Monthly office supplies replenishment for all departments.',
    totalAmount: 1120,
    createdAt: '2026-02-07T08:00:00Z',
    updatedAt: '2026-02-08T09:30:00Z',
  },
  {
    id: 'REQ-006',
    title: 'HVAC Maintenance Service',
    requester: names[5],
    department: departments[3],
    category: 'maintenance',
    priority: 'medium',
    status: 'rejected',
    items: [
      { description: 'HVAC System Inspection & Service', quantity: 1, unitPrice: 1800 },
      { description: 'Filter Replacement Kit', quantity: 3, unitPrice: 120 },
    ],
    justification: 'Annual HVAC maintenance for building climate control systems.',
    totalAmount: 2160,
    createdAt: '2026-02-03T13:00:00Z',
    updatedAt: '2026-02-06T15:00:00Z',
  },
];

export const categoryLabels: Record<RequisitionCategory, string> = {
  'office-supplies': 'Office Supplies',
  'equipment': 'Equipment',
  'software': 'Software',
  'travel': 'Travel',
  'maintenance': 'Maintenance',
  'other': 'Other',
};

export const priorityLabels: Record<RequisitionPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const statusLabels: Record<RequisitionStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  'in-progress': 'In Progress',
};
