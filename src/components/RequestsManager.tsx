import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  SunMedium,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Send,
  UserCheck,
  AlertTriangle,
  Calendar,
  Filter,
  Share2,
  Mail,
  Check,
  X,
} from 'lucide-react';
import {
  User,
  ShiftChangeRequest,
  DaysOffRequest,
} from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isInes, isJakeline, isAfternoonShift, validateInesJakelineConflict } from '../utils/shiftStyles';

interface Props {
  employees: User[];
}

export const RequestsManager: React.FC<Props> = ({ employees }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Only two categories: Turnos and Días Libres
  const [activeTab, setActiveTab] = useState<'shift' | 'daysoff'>('shift');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);

  const [shiftRequests, setShiftRequests] = useState<ShiftChangeRequest[]>([]);
  const [daysOffRequests, setDaysOffRequests] = useState<DaysOffRequest[]>([]);

  // Modals for creating new requests
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showDaysOffModal, setShowDaysOffModal] = useState(false);

  // Comments state
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Form states - Shift Swap
  const [shiftForm, setShiftForm] = useState({
    date: new Date().toISOString().split('T')[0],
    currentShift: 'M', // 'M', 'T', 'N', 'L', etc.
    proposedShift: 'T',
    coworkerId: '',
    coworkerCurrentShift: 'T',
    targetDate: new Date().toISOString().split('T')[0],
    comments: '',
  });

  // Form states - Days Off Swap
  const [daysOffForm, setDaysOffForm] = useState({
    coworkerId: '',
    dateA: new Date().toISOString().split('T')[0],
    dateB: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    comments: '',
  });

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const reqs = await api.getRequests();
      setShiftRequests(reqs.shiftRequests || []);
      setDaysOffRequests(reqs.daysOffRequests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Validation for Inés and Jakeline Rule (Rule 5)
  const isShiftConflict = Boolean(
    shiftForm.coworkerId &&
    validateInesJakelineConflict(
      user?.id || '',
      shiftForm.proposedShift,
      shiftForm.coworkerId,
      shiftForm.currentShift
    ).hasConflict
  );

  // Handle Create Shift Swap Request
  const handleCreateShiftRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.coworkerId) {
      setFeedbackMsg({ text: 'Por favor, selecciona un compañero para realizar el intercambio', type: 'error' });
      return;
    }

    if (isShiftConflict) {
      setFeedbackMsg({
        text: 'Normativa Hotel HM Gran Fiesta: INES y JAKELINE nunca pueden coincidir en el mismo turno de tarde (T).',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCoworker = employees.find(emp => emp.id === shiftForm.coworkerId);
      const res = await api.createShiftChangeRequest({
        date: shiftForm.date,
        currentShift: shiftForm.currentShift,
        proposedShift: shiftForm.proposedShift,
        coworkerId: shiftForm.coworkerId,
        coworkerCurrentShift: shiftForm.coworkerCurrentShift,
        targetDate: shiftForm.targetDate,
        swapKind: 'shift',
        comments: shiftForm.comments || undefined,
      });

      setShowShiftModal(false);
      setFeedbackMsg({
        text: `Solicitud de intercambio enviada a ${selectedCoworker?.name || 'tu compañero'}. Notificación enviada a rec1granfiesta@hmhotels.com.`,
        type: 'success',
      });
      fetchData();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Error al enviar solicitud', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Days Off Swap Request
  const handleCreateDaysOffSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!daysOffForm.coworkerId) {
      setFeedbackMsg({ text: 'Por favor, selecciona un compañero para el intercambio de días libres', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCoworker = employees.find(emp => emp.id === daysOffForm.coworkerId);
      // We record day-off swap as a specialized ShiftChangeRequest where shift is 'L'
      await api.createShiftChangeRequest({
        date: daysOffForm.dateA,
        targetDate: daysOffForm.dateB,
        currentShift: 'L',
        proposedShift: 'M',
        coworkerCurrentShift: 'L',
        coworkerId: daysOffForm.coworkerId,
        swapKind: 'day_off',
        comments: daysOffForm.comments || `Intercambio de día libre: cambio mi libre del ${daysOffForm.dateA} por el libre del ${daysOffForm.dateB} de ${selectedCoworker?.name}.`,
      });

      setShowDaysOffModal(false);
      setFeedbackMsg({
        text: `Intercambio de día libre solicitado a ${selectedCoworker?.name}. Notificación enviada a rec1granfiesta@hmhotels.com.`,
        type: 'success',
      });
      fetchData();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Error al enviar solicitud', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Coworker Response (Accept or Deny)
  const handleCoworkerResponse = async (id: string, response: 'accepted' | 'rejected') => {
    try {
      await api.respondCoworkerShiftChange(id, response);
      setFeedbackMsg({
        text:
          response === 'accepted'
            ? '¡Intercambio aceptado! Los cuadrantes de ambos empleados han sido actualizados y se ha notificado a rec1granfiesta@hmhotels.com.'
            : 'Has denegado la solicitud. El cuadrante se mantiene intacto y se ha notificado a rec1granfiesta@hmhotels.com.',
        type: 'success',
      });
      fetchData();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Error al responder', type: 'error' });
    }
  };

  // Generate WhatsApp Notification Link
  const getWhatsAppLink = (item: ShiftChangeRequest) => {
    const coworker = employees.find(e => e.id === item.coworkerId);
    const requester = employees.find(e => e.id === item.employeeId);
    const phone = coworker?.phone || item.coworkerPhone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    const message = `Hola ${item.coworkerName || 'compañero/a'}, te he enviado una solicitud de intercambio de turnos en Hotel HM Gran Fiesta para el día ${item.date} (mi turno ${item.currentShift} por tu turno ${item.proposedShift}). Entra a la aplicación para aceptarla o denegarla: https://turnos-y-peticiones.vercel.app`;

    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  };

  // Generate Direct Email Links (mailto: for native app / Gmail web) to rec1granfiesta@hmhotels.com
  const getEmailLinks = (item: ShiftChangeRequest) => {
    const isDayOff = item.swapKind === 'day_off';
    const typeLabel = isDayOff ? 'Intercambio de Días Libres' : 'Intercambio de Turnos';
    const statusLabel =
      item.status === 'approved'
        ? 'ACEPTADO (Cuadrante actualizado)'
        : item.status === 'rejected'
        ? 'DENEGADO (Sin cambios)'
        : 'PENDIENTE DE RESPUESTA';

    const subject = `[HM Gran Fiesta] ${typeLabel} - ${item.employeeName} y ${item.coworkerName || 'Compañero'} (${item.date})`;
    const body = `Estimada Dirección / Recepción Hotel HM Gran Fiesta (rec1granfiesta@hmhotels.com),

Se comunica el siguiente trámite de turnos a través de la aplicación:

• Trámite: ${typeLabel}
• Empleado solicitante: ${item.employeeName}
• Compañero asignado: ${item.coworkerName || 'Compañero'}
• Fecha: ${item.date}${item.targetDate && item.targetDate !== item.date ? ` (al ${item.targetDate})` : ''}
• Turno original solicitante: ${item.currentShift === 'L' ? 'Día Libre (L)' : `Turno ${item.currentShift}`}
• Turno acordado: ${item.proposedShift === 'L' ? 'Día Libre (L)' : `Turno ${item.proposedShift}`}
• Estado actual: ${statusLabel}
${item.comments ? `• Observaciones: ${item.comments}\n` : ''}
Saludos cordiales,
Hotel HM Gran Fiesta`;

    const to = 'rec1granfiesta@hmhotels.com';
    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    return { mailtoUrl, gmailUrl, subject, body };
  };

  // Filter requests
  const filteredShiftRequests = shiftRequests
    .filter(r => (statusFilter === 'all' ? true : r.status === statusFilter))
    .filter(r => (activeTab === 'shift' ? r.swapKind !== 'day_off' : r.swapKind === 'day_off'));

  const pendingCount = shiftRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Top Banner and Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{isAdmin ? 'Gestión de Intercambios y Solicitudes' : 'Mis Solicitudes de Intercambio'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Intercambios de turnos y días libres entre compañeros con actualización inmediata del cuadrante y aviso a Dirección (rec1granfiesta@hmhotels.com).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowShiftModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Intercambiar Turno</span>
          </button>
          <button
            onClick={() => setShowDaysOffModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 active:scale-95 transition cursor-pointer"
          >
            <SunMedium className="w-3.5 h-3.5" />
            <span>Intercambiar Día Libre</span>
          </button>
        </div>
      </div>

      {/* Integration Info Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Avisos a Dirección:
          </span>
          <a
            href="mailto:rec1granfiesta@hmhotels.com?subject=[HM%20Gran%20Fiesta]%20Consulta%20de%20Turnos&body=Hola%20Direcci%C3%B3n,"
            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            title="Haz clic para abrir tu aplicación de correo del dispositivo (Gmail, Mail, etc.)"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>rec1granfiesta@hmhotels.com</span>
          </a>
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=rec1granfiesta@hmhotels.com&su=[HM%20Gran%20Fiesta]%20Consulta%20de%20Turnos"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-0.5 rounded-md bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/60 dark:text-red-300 font-bold text-[10px] transition"
            title="Abrir directamente en Gmail Web"
          >
            Abrir en Gmail
          </a>
          <span className="text-slate-400 text-[11px] hidden md:inline">
            • Notificaciones por WhatsApp listas
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500">Filtrar:</span>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                statusFilter === f
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aceptadas' : 'Denegadas'}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between animate-in fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span className="font-medium">{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="font-bold text-xs hover:underline cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('shift')}
          className={`py-3 px-4 border-b-2 whitespace-nowrap flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'shift'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Intercambios de Turno</span>
        </button>

        <button
          onClick={() => setActiveTab('daysoff')}
          className={`py-3 px-4 border-b-2 whitespace-nowrap flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'daysoff'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <SunMedium className="w-4 h-4" />
          <span>Intercambios de Días Libres</span>
        </button>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Cargando solicitudes...</div>
        ) : filteredShiftRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            No hay solicitudes de intercambio {activeTab === 'shift' ? 'de turno' : 'de días libres'} en esta vista.
          </div>
        ) : (
          filteredShiftRequests.map(item => {
            const isCoworkerTarget = item.coworkerId === user?.id;
            const isRequester = item.employeeId === user?.id;
            const isPending = item.status === 'pending';
            const canRespond = (isCoworkerTarget || isAdmin) && isPending;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{item.employeeName}</span>
                    <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {item.coworkerName || 'Compañero/a'}
                    </span>
                    <span className="text-xs text-slate-400">• Fecha: <strong>{item.date}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        item.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : item.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {item.status === 'approved'
                        ? 'Aceptado (Cuadrante Actualizado)'
                        : item.status === 'rejected'
                        ? 'Denegado (Sin Cambios)'
                        : 'Pendiente de Respuesta'}
                    </span>
                  </div>
                </div>

                {/* Shift Details Box */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Turno {item.employeeName}:
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {item.currentShift === 'L' ? 'Día Libre (L)' : `Turno ${item.currentShift}`}
                    </span>
                    <span className="text-[11px] text-indigo-600 block mt-0.5">
                      Pasa a: {item.proposedShift === 'L' ? 'Día Libre (L)' : `Turno ${item.proposedShift}`}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Turno {item.coworkerName || 'Compañero'}:
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {item.proposedShift === 'L' ? 'Día Libre (L)' : `Turno ${item.proposedShift}`}
                    </span>
                    <span className="text-[11px] text-indigo-600 block mt-0.5">
                      Pasa a: {item.currentShift === 'L' ? 'Día Libre (L)' : `Turno ${item.currentShift}`}
                    </span>
                  </div>
                </div>

                {/* Status and Notifications Notice */}
                {(() => {
                  const emailLinks = getEmailLinks(item);
                  return (
                    <div className="flex flex-col md:flex-row md:items-center justify-between text-xs text-slate-500 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600 dark:text-slate-300">
                        <Mail className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        <span>Aviso a Dirección:</span>
                        <a
                          href={emailLinks.mailtoUrl}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold transition border border-indigo-200 dark:border-indigo-800"
                          title="Abrir tu aplicación de correo propia (Gmail / Mail / Outlook) con los datos listos para enviar"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Abrir en mi correo (rec1granfiesta@hmhotels.com)</span>
                        </a>
                        <a
                          href={emailLinks.gmailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold text-[10px] transition border border-red-200 dark:border-red-800"
                          title="Abrir directamente en Gmail Web con el mensaje redactado"
                        >
                          Gmail Web
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* WhatsApp share button */}
                        <a
                          href={getWhatsAppLink(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                          title="Enviar mensaje por WhatsApp al compañero para que acepte o deniegue"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Avisar por WhatsApp</span>
                        </a>

                        {/* Coworker or Admin Action Buttons */}
                        {canRespond && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCoworkerResponse(item.id, 'accepted')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Aceptar</span>
                            </button>
                            <button
                              onClick={() => handleCoworkerResponse(item.id, 'rejected')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Denegar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Intercambio de Turnos */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                <span>Solicitar Intercambio de Turno</span>
              </h3>
              <button
                onClick={() => setShowShiftModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateShiftRequest} className="space-y-4 pt-4 text-xs">
              {/* Inés & Jakeline conflict alert */}
              {isShiftConflict && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span className="font-bold block">Regla de turnos no permitida:</span>
                    <span>INES y JAKELINE no pueden coincidir en el turno de tarde (T) el mismo día bajo ninguna circunstancia.</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  1. Selecciona con qué compañero deseas intercambiar *
                </label>
                <select
                  value={shiftForm.coworkerId}
                  onChange={e => setShiftForm({ ...shiftForm, coworkerId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  required
                >
                  <option value="">-- Elige compañero de plantilla --</option>
                  {employees
                    .filter(e => e.id !== user?.id && e.status === 'active')
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    2. Fecha del turno *
                  </label>
                  <input
                    type="date"
                    value={shiftForm.date}
                    onChange={e => setShiftForm({ ...shiftForm, date: e.target.value, targetDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    3. Mi turno actual *
                  </label>
                  <select
                    value={shiftForm.currentShift}
                    onChange={e => setShiftForm({ ...shiftForm, currentShift: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="M">M (Mañana 08:00 - 16:00)</option>
                    <option value="T">T (Tarde 16:00 - 00:00)</option>
                    <option value="N">N (Noche 00:00 - 08:00)</option>
                    <option value="L">L (Día Libre)</option>
                    <option value="10:00-18:00">10:00 - 18:00</option>
                    <option value="07:00-15:00">07:00 - 15:00</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  4. Turno del compañero que deseo hacer *
                </label>
                <select
                  value={shiftForm.proposedShift}
                  onChange={e => setShiftForm({ ...shiftForm, proposedShift: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-indigo-600"
                >
                  <option value="M">M (Mañana 08:00 - 16:00)</option>
                  <option value="T">T (Tarde 16:00 - 00:00)</option>
                  <option value="N">N (Noche 00:00 - 08:00)</option>
                  <option value="L">L (Día Libre)</option>
                  <option value="10:00-18:00">10:00 - 18:00</option>
                  <option value="07:00-15:00">07:00 - 15:00</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Motivo o comentario (Opcional)
                </label>
                <textarea
                  value={shiftForm.comments}
                  onChange={e => setShiftForm({ ...shiftForm, comments: e.target.value })}
                  placeholder="Ej: Intercambio acordado para acudir a una cita personal"
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl text-[11px] text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0 text-indigo-600" />
                <span>
                  Al pulsar enviar, se generará el aviso por WhatsApp y se notificará a <strong>rec1granfiesta@hmhotels.com</strong>.
                </span>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isShiftConflict}
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Intercambio de Días Libres */}
      {showDaysOffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <SunMedium className="w-4 h-4 text-amber-600" />
                <span>Intercambiar Día Libre con un Compañero</span>
              </h3>
              <button
                onClick={() => setShowDaysOffModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDaysOffSwap} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  1. ¿Con qué compañero intercambias el día libre? *
                </label>
                <select
                  value={daysOffForm.coworkerId}
                  onChange={e => setDaysOffForm({ ...daysOffForm, coworkerId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  required
                >
                  <option value="">-- Elige compañero --</option>
                  {employees
                    .filter(e => e.id !== user?.id && e.status === 'active')
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    2. Fecha en la que tú quieres librar *
                  </label>
                  <input
                    type="date"
                    value={daysOffForm.dateA}
                    onChange={e => setDaysOffForm({ ...daysOffForm, dateA: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    3. Fecha en la que tu compañero librará *
                  </label>
                  <input
                    type="date"
                    value={daysOffForm.dateB}
                    onChange={e => setDaysOffForm({ ...daysOffForm, dateB: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Comentarios u observaciones
                </label>
                <textarea
                  value={daysOffForm.comments}
                  onChange={e => setDaysOffForm({ ...daysOffForm, comments: e.target.value })}
                  placeholder="Detalles sobre los turnos que se cubrirán"
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>
                  El resultado del intercambio se notificará inmediatamente a <strong>rec1granfiesta@hmhotels.com</strong>.
                </span>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDaysOffModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Propuesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
