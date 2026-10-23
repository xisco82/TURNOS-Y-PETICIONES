import { User } from '../types';

export function normalizeDni(dni?: string): string {
  if (!dni) return '';
  return dni.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export const OFFICIAL_ADMIN_USER: User = {
  id: 'admin-1',
  name: 'Administrador Principal (Francisco Gallego Huguet)',
  aliases: ['Admin', 'Dirección', 'Xisco', 'xiscooquin', 'Francisco Gallego'],
  email: 'xiscooquin@gmail.com',
  dni: '43134155-R',
  phone: '+34 600 000 000',
  role: 'admin',
  status: 'active',
  tempPassword: '3090',
  mustChangePassword: false,
  createdAt: '2026-10-22T09:37:00.648Z',
};
