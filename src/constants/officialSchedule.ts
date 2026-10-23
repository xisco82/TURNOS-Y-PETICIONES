import { WeekSchedule } from '../types';

export const OFFICIAL_SCHEDULE_TEXT = `	02/11	03/11	04/11	05/11	06/11	07/11	08/11
	LUNES	MARTES	MIERCOLES	JUEVES	VIERNES	SABADO	DOMINGO
XISCO	M	M	M	M	L	L	10:00-18:00
ALIZ	L	M	M	T	M	M	L
OSCAR	L	L	N	N	N	N	N
MIRIAM	M	L	L	M	M	10:00-18:00	07:00-15:00
JOSEP	T	T	T	L	L	T	T
JAVI	M	M	M	M	M	L	L
TONI	BP	BP	BP	BP	BP	BP	BP
INES	T	T	L	L	T	AP	M
CARLOS	N	N	L	L	T	T	T
JAKELINE	L	L	T	T	10:00-18:00	M	M`;

export const OFFICIAL_WEEK_SCHEDULE: WeekSchedule = {
  id: 'sched-2026-11-02',
  weekStartDate: '2026-11-02',
  weekEndDate: '2026-11-08',
  weekLabel: 'SEMANA DEL 02/11 AL 08/11 DE 2026',
  status: 'published',
  version: 1,
  publishedAt: '2026-10-23T18:00:00.000Z',
  publishedBy: 'Administrador Principal (Xisco G. H.)',
  changeReason: 'Cuadrante oficial de la plantilla para la semana del 2 al 8 de noviembre 2026',
  rawInputText: OFFICIAL_SCHEDULE_TEXT,
  rows: [
    {
      employeeId: 'emp-1',
      employeeName: 'Francisco Gallego Huguet',
      totalHours: 40,
      warnings: [],
      days: {
        '2026-11-02': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-03': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-04': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-05': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-06': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-07': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-08': { type: 'work', startTime: '10:00', endTime: '18:00', rawText: '10:00-18:00', hours: 8 },
      },
    },
    {
      employeeId: 'emp-2',
      employeeName: 'Aliz Varga',
      totalHours: 40,
      warnings: [],
      days: {
        '2026-11-02': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-03': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-04': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-05': { type: 'work', startTime: '15:00', endTime: '23:00', rawText: 'T', hours: 8 },
        '2026-11-06': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-07': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-08': { type: 'free', rawText: 'L', hours: 0 },
      },
    },
    {
      employeeId: 'emp-3',
      employeeName: 'Oscar David Millán Vivancos',
      totalHours: 40,
      warnings: [],
      days: {
        '2026-11-02': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-03': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-04': { type: 'work', startTime: '23:00', endTime: '07:00', rawText: 'N', hours: 8, isOvernight: true },
        '2026-11-05': { type: 'work', startTime: '23:00', endTime: '07:00', rawText: 'N', hours: 8, isOvernight: true },
        '2026-11-06': { type: 'work', startTime: '23:00', endTime: '07:00', rawText: 'N', hours: 8, isOvernight: true },
        '2026-11-07': { type: 'work', startTime: '23:00', endTime: '07:00', rawText: 'N', hours: 8, isOvernight: true },
        '2026-11-08': { type: 'work', startTime: '23:00', endTime: '07:00', rawText: 'N', hours: 8, isOvernight: true },
      },
    },
    {
      employeeId: 'emp-7',
      employeeName: 'Miriam García Heras',
      totalHours: 40,
      warnings: [],
      days: {
        '2026-11-02': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-03': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-04': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-05': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-06': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-07': { type: 'work', startTime: '10:00', endTime: '18:00', rawText: '10:00-18:00', hours: 8 },
        '2026-11-08': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: '07:00-15:00', hours: 8 },
      },
    },
    {
      employeeId: 'emp-6',
      employeeName: 'Josep Vidal Pérez',
      totalHours: 40,
      warnings: [],
      days: {
        '2026-11-02': { type: 'work', startTime: '15:00', endTime: '23:00', rawText: 'T', hours: 8 },
        '2026-11-03': { type: 'work', startTime: '15:00', endTime: '23:00', rawText: 'T', hours: 8 },
        '2026-11-04': { type: 'work', startTime: '15:00', endTime: '23:00', rawText: 'T', hours: 8 },
        '2026-11-05': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-06': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-07': { type: 'work', startTime: '15:00', endTime: '23:00', rawText: 'T', hours: 8 },
        '2026-11-08': { type: 'work', startTime: '15:00', endTime: '23:00', rawText: 'T', hours: 8 },
      },
    },
    {
      employeeId: 'emp-4',
      employeeName: 'Francisco Javier Segundo Moya',
      totalHours: 40,
      warnings: [],
      days: {
        '2026-11-02': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-03': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-04': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-05': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-06': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-07': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-08': { type: 'free', rawText: 'L', hours: 0 },
      },
    },
    {
      employeeId: 'emp-10',
      employeeName: 'Antonio Torres Mulet',
      totalHours: 0,
      warnings: [],
      days: {
        '2026-11-02': { type: 'sick', rawText: 'BP', hours: 0, note: 'Baja Médica / IT' },
        '2026-11-03': { type: 'sick', rawText: 'BP', hours: 0, note: 'Baja Médica / IT' },
        '2026-11-04': { type: 'sick', rawText: 'BP', hours: 0, note: 'Baja Médica / IT' },
        '2026-11-05': { type: 'sick', rawText: 'BP', hours: 0, note: 'Baja Médica / IT' },
        '2026-11-06': { type: 'sick', rawText: 'BP', hours: 0, note: 'Baja Médica / IT' },
        '2026-11-07': { type: 'sick', rawText: 'BP', hours: 0, note: 'Baja Médica / IT' },
        '2026-11-08': { type: 'sick', rawText: 'BP', hours: 0, note: 'Baja Médica / IT' },
      },
    },
    {
      employeeId: 'emp-5',
      employeeName: 'Inés Ruiz Morey',
      totalHours: 32,
      warnings: [],
      days: {
        '2026-11-02': { type: 'work', startTime: '15:00', endTime: '23:00', rawText: 'T', hours: 8 },
        '2026-11-03': { type: 'work', startTime: '15:00', endTime: '23:00', rawText: 'T', hours: 8 },
        '2026-11-04': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-05': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-06': { type: 'work', startTime: '15:00', endTime: '23:00', rawText: 'T', hours: 8 },
        '2026-11-07': { type: 'free', rawText: 'AP', hours: 0, note: 'Asuntos Propios (Permiso)' },
        '2026-11-08': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
      },
    },
    {
      employeeId: 'emp-8',
      employeeName: 'Carlos Rodríguez Martín',
      totalHours: 40,
      warnings: [],
      days: {
        '2026-11-02': { type: 'work', startTime: '23:00', endTime: '07:00', rawText: 'N', hours: 8, isOvernight: true },
        '2026-11-03': { type: 'work', startTime: '23:00', endTime: '07:00', rawText: 'N', hours: 8, isOvernight: true },
        '2026-11-04': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-05': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-06': { type: 'work', startTime: '15:00', endTime: '23:00', rawText: 'T', hours: 8 },
        '2026-11-07': { type: 'work', startTime: '15:00', endTime: '23:00', rawText: 'T', hours: 8 },
        '2026-11-08': { type: 'work', startTime: '15:00', endTime: '23:00', rawText: 'T', hours: 8 },
      },
    },
    {
      employeeId: 'emp-9',
      employeeName: 'Jakeline Munera Zapata',
      totalHours: 40,
      warnings: [],
      days: {
        '2026-11-02': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-03': { type: 'free', rawText: 'L', hours: 0 },
        '2026-11-04': { type: 'work', startTime: '15:00', endTime: '23:00', rawText: 'T', hours: 8 },
        '2026-11-05': { type: 'work', startTime: '15:00', endTime: '23:00', rawText: 'T', hours: 8 },
        '2026-11-06': { type: 'work', startTime: '10:00', endTime: '18:00', rawText: '10:00-18:00', hours: 8 },
        '2026-11-07': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
        '2026-11-08': { type: 'work', startTime: '07:00', endTime: '15:00', rawText: 'M', hours: 8 },
      },
    },
  ],
};
