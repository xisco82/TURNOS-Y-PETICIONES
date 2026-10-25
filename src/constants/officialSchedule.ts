import { WeekSchedule } from '../types';

export const OFFICIAL_SCHEDULE_TEXT = `\t02/11\t03/11\t04/11\t05/11\t06/11\t07/11\t08/11
\tLUNES\tMARTES\tMIERCOLES\tJUEVES\tVIERNES\tSABADO\tDOMINGO
XISCO\tM\tM\tM\tM\tL\tL\t10:00-18:00
ALIZ\tL\tM\tM\tT\tM\tM\tL
OSCAR\tL\tL\tN\tN\tN\tN\tN
MIRIAM\tM\tL\tL\tM\tM\t10:00-18:00\t07:00-15:00
JOSEP\tT\tT\tT\tL\tL\tT\tT
JAVI\tM\tM\tM\tM\tM\tL\tL
TONI\tBP\tBP\tBP\tBP\tBP\tBP\tBP
INES\tT\tT\tL\tL\tT\tAP\tM
CARLOS\tN\tN\tL\tL\tT\tT\tT
JAKELINE\tL\tL\tT\tT\t10:00-18:00\tM\tM`;

export const OFFICIAL_WEEK_SCHEDULE: Partial<WeekSchedule> = {
  id: 'sched-2026-11-02',
  weekStartDate: '2026-11-02',
  weekEndDate: '2026-11-08',
  weekLabel: 'SEMANA DEL 02/11 AL 08/11 DE 2026',
  status: 'published',
  version: 1,
  publishedAt: '2026-10-23T18:00:00.000Z',
  publishedBy: 'Administrador Principal (Francisco Gallego Huguet)',
  changeReason: 'Cuadrante oficial de la plantilla para la semana del 2 al 8 de noviembre 2026',
  rawInputText: OFFICIAL_SCHEDULE_TEXT,
};
