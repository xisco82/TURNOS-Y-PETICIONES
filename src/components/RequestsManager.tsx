import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  ArrowLeftRight,
  SunMedium,
  HeartPulse,
  AlertOctagon,
  Plus,
  CheckCircle,
  XCircle,
  HelpCircle,
  MessageSquare,
  Send,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  ShiftChangeRequest,
  DaysOffRequest,
  AbsenceRequest,
  IncidentItem,
  User,
} from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Props {
  employees: User[];
}

export const RequestsManager: React.FC<Props> = ({ employees }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeSection, setActiveSection] = useState<'shift' | 'days_off' | 'absence' | 'incidents'>('shift');

  const [shiftRequests, setShiftRequests] = useState<ShiftChangeRequest[]>([]);
  const [daysOffRequests, setDaysOffRequests] = useState<DaysOffRequest[]>([]);
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New request modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Forms state
  const [scForm, setScForm] = useState({
    date: new Date().toISOString().split('T')[0],
    currentShift: '09:00-17:00',
    proposedShift: '14:00-22:00',
    coworkerId: '',
    comments: '',
  });

  const [doForm, setDoForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    comment: '',
  });

  const [abForm, setAbForm] = useState({
    subType: 'communication' as 'communication' | 'leave_request',
    category: 'medico' as 'medico' | 'urgencia_familiar' | 'fuerza_mayor' | 'otro',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    hasCertificate: false,
    comment: '',
  });

  const [incForm, setIncForm] = useState({
    category: 'fichaje',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqData, incData] = await Promise.all([api.getRequests(), api.getIncidents()]);
      setShiftRequests(reqData.shiftRequests);
      setDaysOffRequests(reqData.daysOffRequests);
      setAbsenceRequests(reqData.absenceRequests);
      setIncidents(incData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Helper status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'acknowledged':
      case 'resuelta':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
            <CheckCircle className="w-3 h-3" />
            <span>{status === 'acknowledged' ? 'Registrada' : status === 'resuelta' ? 'Resuelta' : 'Aprobada'}</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200">
            <XCircle className="w-3 h-3" />
            <span>Rechazada</span>
          </span>
        );
      case 'info_requested':
      case 'en_revision':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
            <HelpCircle className="w-3 h-3" />
            <span>{status === 'en_revision' ? 'En revisión' : 'Info solicitada'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Clock className="w-3 h-3" />
            <span>Pendiente</span>
          </span>
        );
    }
  };

  const [errorNotification, setErrorNotification] = useState<string | null>(null);

  // Coworker response action
  const handleCoworkerAction = async (id: string, response: 'accepted' | 'rejected') => {
    try {
      await api.respondCoworkerShiftChange(id, response);
      fetchData();
    } catch (e: any) {
      setErrorNotification(e.message || 'Error al procesar respuesta del compañero');
    }
  };

  // Admin decision
  const handleAdminDecision = async (
    type: 'shift-change' | 'days-off' | 'absence',
    id: string,
    status: string,
    applyToSchedule = false
  ) => {
    try {
      await api.updateRequestStatus(type, id, status, undefined, applyToSchedule);
      fetchData();
    } catch (e: any) {
      setErrorNotification(e.message || 'Error al actualizar estado');
    }
  };

  // Add comment
  const handleSendComment = async (type: 'shift-change' | 'days-off' | 'absence', id: string) => {
    if (!commentText.trim()) return;
    try {
      await api.addRequestComment(type, id, commentText.trim());
      setCommentText('');
      fetchData();
    } catch (e: any) {
      setErrorNotification(e.message || 'Error al enviar comentario');
    }
  };

  // Submit new request
  const handleSubmitShiftChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createShiftChangeRequest(scForm);
      setShowNewModal(false);
      fetchData();
    } catch (err: any) {
      setErrorNotification(err.message || 'Error al registrar cambio de turno');
    }
  };

  const handleSubmitDaysOff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDaysOffRequest(doForm);
      setShowNewModal(false);
      fetchData();
    } catch (err: any) {
      setErrorNotification(err.message || 'Error al registrar días libres');
    }
  };

  const handleSubmitAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAbsenceRequest(abForm);
      setShowNewModal(false);
      fetchData();
    } catch (err: any) {
      setErrorNotification(err.message || 'Error al registrar ausencia');
    }
  };

  const handleSubmitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createIncident(incForm);
      setShowNewModal(false);
      fetchData();
    } catch (err: any) {
      setErrorNotification(err.message || 'Error al registrar incidencia');
    }
  };

  return (
    <div className="space-y-6">
      {errorNotification && (
        <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorNotification}</span>
          </div>
          <button onClick={() => setErrorNotification(null)} className="font-bold text-xs hover:underline">
            ✕
          </button>
        </div>
      )}
      {/* 4 Independent Sections Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5">
          <button
            onClick={() => setActiveSection('shift')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${
              activeSection === 'shift'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>A. Cambios de Turno</span>
            {shiftRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500 text-white">
                {shiftRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('days_off')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${
              activeSection === 'days_off'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <SunMedium className="w-3.5 h-3.5" />
            <span>B. Días Libres y Vacaciones</span>
            {daysOffRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500 text-white">
                {daysOffRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('absence')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${
              activeSection === 'absence'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>C. Médico y Ausencias</span>
            {absenceRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500 text-white">
                {absenceRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('incidents')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${
              activeSection === 'incidents'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>D. Incidencias</span>
            {incidents.filter(i => i.status === 'abierta').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500 text-white">
                {incidents.filter(i => i.status === 'abierta').length}
              </span>
            )}
          </button>
        </div>

        {/* Create button */}
        {!isAdmin && (
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Solicitud</span>
          </button>
        )}
      </div>

      {/* SECTION A: CAMBIOS DE TURNO */}
      {activeSection === 'shift' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <strong>Procedimiento:</strong> Si se incluye un compañero, este debe aceptar primero. Una vez aceptado,
            el administrador revisa y aprueba. Al aprobar, el cuadrante publicado se actualiza automáticamente.
          </div>

          <div className="space-y-3">
            {shiftRequests.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200 dark:border-slate-800">
                No hay solicitudes de cambio de turno registradas
              </div>
            ) : (
              shiftRequests.map(item => {
                const isMyRequest = item.employeeId === user?.id;
                const isMyCoworkerRequest = item.coworkerId === user?.id;
                const needsCoworkerAction = isMyCoworkerRequest && item.coworkerStatus === 'pending';

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {item.employeeName}
                          </span>
                          {renderStatusBadge(item.status)}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Fecha solicitada: <strong>{item.date}</strong> • Solicitado el{' '}
                          {new Date(item.createdAt).toLocaleDateString('es-ES')}
                        </p>
                      </div>

                      {/* Admin Decision Actions */}
                      {isAdmin && item.status === 'pending' && (!item.coworkerId || item.coworkerStatus === 'accepted') && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAdminDecision('shift-change', item.id, 'approved', true)}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                          >
                            Aprobar y Actualizar Cuadrante
                          </button>
                          <button
                            onClick={() => handleAdminDecision('shift-change', item.id, 'rejected')}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => handleAdminDecision('shift-change', item.id, 'info_requested')}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                          >
                            Pedir Info
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                        <span className="text-slate-400 block mb-1">Turno Actual:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{item.currentShift}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                        <span className="text-indigo-500 block mb-1">Cambio Propuesto:</span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-300">{item.proposedShift}</span>
                      </div>
                    </div>

                    {item.coworkerName && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-slate-500">Compañero implicado: </span>
                          <strong className="text-slate-900 dark:text-white">{item.coworkerName}</strong>
                          <span className="ml-2 text-slate-400">
                            (Estado aceptación:{' '}
                            <strong>
                              {item.coworkerStatus === 'accepted'
                                ? 'Aceptado por compañero'
                                : item.coworkerStatus === 'rejected'
                                ? 'Rechazado'
                                : 'Pendiente de aceptación'}
                            </strong>
                            )
                          </span>
                        </div>

                        {needsCoworkerAction && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCoworkerAction(item.id, 'accepted')}
                              className="px-3 py-1 text-xs font-bold rounded bg-emerald-600 text-white"
                            >
                              Aceptar Intercambio
                            </button>
                            <button
                              onClick={() => handleCoworkerAction(item.id, 'rejected')}
                              className="px-3 py-1 text-xs font-bold rounded bg-rose-600 text-white"
                            >
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Comments Thread */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Hilo de comentarios ({item.comments.length})
                      </span>
                      {item.comments.map(c => (
                        <div key={c.id} className="text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <strong className="text-slate-700 dark:text-slate-300">{c.userName}</strong>
                            <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-800 dark:text-slate-200">{c.text}</p>
                        </div>
                      ))}

                      {/* Add comment */}
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="Escribe un comentario..."
                          value={selectedRequestId === item.id ? commentText : ''}
                          onFocus={() => setSelectedRequestId(item.id)}
                          onChange={e => setCommentText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSendComment('shift-change', item.id);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                        />
                        <button
                          onClick={() => handleSendComment('shift-change', item.id)}
                          className="px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl text-xs font-semibold"
                        >
                          Enviar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SECTION B: DÍAS LIBRES Y VACACIONES */}
      {activeSection === 'days_off' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <strong>Procedimiento:</strong> Queda pendiente hasta la resolución del administrador. Si coincide con
            días ya concedidos a otros empleados, el sistema avisa para evitar descubiertos.
          </div>

          <div className="space-y-3">
            {daysOffRequests.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200 dark:border-slate-800">
                No hay solicitudes de días libres o vacaciones
              </div>
            ) : (
              daysOffRequests.map(item => {
                // Check overlaps with other approved requests
                const overlaps = daysOffRequests.filter(
                  other =>
                    other.id !== item.id &&
                    other.status === 'approved' &&
                    !(other.endDate < item.startDate || other.startDate > item.endDate)
                );

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {item.employeeName}
                          </span>
                          {renderStatusBadge(item.status)}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Del <strong>{item.startDate}</strong> al <strong>{item.endDate}</strong>
                        </p>
                      </div>

                      {isAdmin && item.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAdminDecision('days-off', item.id, 'approved')}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleAdminDecision('days-off', item.id, 'rejected')}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                    </div>

                    {overlaps.length > 0 && (
                      <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>
                          <strong>Coincidencia de fechas:</strong> Coincide con vacaciones ya aprobadas de:{' '}
                          {overlaps.map(o => o.employeeName).join(', ')}.
                        </span>
                      </div>
                    )}

                    {item.comment && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl">
                        «{item.comment}»
                      </p>
                    )}

                    {/* Comments */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1">
                      {item.comments.map(c => (
                        <div key={c.id} className="text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-800">
                          <strong className="text-slate-700 dark:text-slate-300 mr-2">{c.userName}:</strong>
                          <span className="text-slate-600 dark:text-slate-200">{c.text}</span>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Añadir comentario..."
                          value={selectedRequestId === item.id ? commentText : ''}
                          onFocus={() => setSelectedRequestId(item.id)}
                          onChange={e => setCommentText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSendComment('days-off', item.id);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                        />
                        <button
                          onClick={() => handleSendComment('days-off', item.id)}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs"
                        >
                          Enviar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SECTION C: MÉDICO Y AUSENCIAS (Strict Privacy: NO Diagnoses!) */}
      {activeSection === 'absence' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Garantía de Privacidad y Cumplimiento Laboral:</strong>
              <p className="mt-0.5">
                Por estricta protección de datos (RGPD), está prohibido solicitar diagnósticos médicos. Solo se recoge
                el tipo, fechas y estado del justificante. Solo visible para el empleado y el administrador.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {absenceRequests.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200 dark:border-slate-800">
                No hay registros de ausencia o médicos
              </div>
            ) : (
              absenceRequests.map(item => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {item.employeeName}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {item.subType === 'communication'
                            ? 'Comunicación de ausencia (Informativa)'
                            : 'Petición de permiso (Requiere decisión)'}
                        </span>
                        {renderStatusBadge(item.status)}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Categoría: <strong className="capitalize">{item.category}</strong> • Fechas:{' '}
                        <strong>
                          {item.startDate} al {item.endDate}
                        </strong>
                      </p>
                    </div>

                    {isAdmin && item.subType === 'leave_request' && item.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAdminDecision('absence', item.id, 'approved')}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Aprobar Permiso
                        </button>
                        <button
                          onClick={() => handleAdminDecision('absence', item.id, 'rejected')}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Certificate indicator */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Justificante entregado:</span>
                    {item.hasCertificate ? (
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <FileCheck className="w-4 h-4" /> Sí entregado
                      </span>
                    ) : (
                      <span className="font-bold text-amber-600">Pendiente de entrega</span>
                    )}
                  </div>

                  {/* Comments */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1">
                    {item.comments.map(c => (
                      <div key={c.id} className="text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-800">
                        <strong className="text-slate-700 dark:text-slate-300 mr-2">{c.userName}:</strong>
                        <span className="text-slate-600 dark:text-slate-200">{c.text}</span>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Mensaje sobre justificante o trámite..."
                        value={selectedRequestId === item.id ? commentText : ''}
                        onFocus={() => setSelectedRequestId(item.id)}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSendComment('absence', item.id);
                        }}
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                      />
                      <button
                        onClick={() => handleSendComment('absence', item.id)}
                        className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION D: INCIDENCIAS */}
      {activeSection === 'incidents' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <strong>Seguimiento de Incidencias:</strong> Registro de errores en fichajes, turnos asignados incorrectamente,
            material o dudas sobre el cuadrante.
          </div>

          <div className="space-y-3">
            {incidents.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200 dark:border-slate-800">
                No hay incidencias registradas
              </div>
            ) : (
              incidents.map(item => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {item.employeeName}
                        </span>
                        <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                          {item.category}
                        </span>
                        {renderStatusBadge(item.status)}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Fecha: {item.date}</p>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={async () => {
                            await api.updateIncidentStatus(item.id, 'en_revision');
                            fetchData();
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                        >
                          En revisión
                        </button>
                        <button
                          onClick={async () => {
                            await api.updateIncidentStatus(item.id, 'resuelta');
                            fetchData();
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Resolver
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                    {item.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CREATE MODAL FOR EMPLOYEES */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-3">
              {activeSection === 'shift' && 'Solicitar Cambio de Turno'}
              {activeSection === 'days_off' && 'Solicitar Días Libres o Vacaciones'}
              {activeSection === 'absence' && 'Comunicar Ausencia o Pedir Permiso'}
              {activeSection === 'incidents' && 'Registrar Nueva Incidencia'}
            </h3>

            {/* Shift Change Form */}
            {activeSection === 'shift' && (
              <form onSubmit={handleSubmitShiftChange} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Fecha del turno</label>
                  <input
                    type="date"
                    value={scForm.date}
                    onChange={e => setScForm({ ...scForm, date: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Turno actual</label>
                  <input
                    type="text"
                    value={scForm.currentShift}
                    onChange={e => setScForm({ ...scForm, currentShift: e.target.value })}
                    placeholder="Ej: 09:00-17:00"
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Cambio propuesto</label>
                  <input
                    type="text"
                    value={scForm.proposedShift}
                    onChange={e => setScForm({ ...scForm, proposedShift: e.target.value })}
                    placeholder="Ej: 14:00-22:00 o LIBRE"
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Compañero implicado (Opcional si es cambio mutuo)</label>
                  <select
                    value={scForm.coworkerId}
                    onChange={e => setScForm({ ...scForm, coworkerId: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="">Sin compañero asignado</option>
                    {employees
                      .filter(e => e.id !== user?.id)
                      .map(e => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Comentarios</label>
                  <textarea
                    value={scForm.comments}
                    onChange={e => setScForm({ ...scForm, comments: e.target.value })}
                    rows={2}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-3 py-2 font-semibold text-slate-500"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 font-bold bg-indigo-600 text-white rounded-xl">
                    Enviar Solicitud
                  </button>
                </div>
              </form>
            )}

            {/* Days Off Form */}
            {activeSection === 'days_off' && (
              <form onSubmit={handleSubmitDaysOff} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1">Fecha inicio</label>
                    <input
                      type="date"
                      value={doForm.startDate}
                      onChange={e => setDoForm({ ...doForm, startDate: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Fecha fin</label>
                    <input
                      type="date"
                      value={doForm.endDate}
                      onChange={e => setDoForm({ ...doForm, endDate: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Comentarios / Observaciones (Opcional)</label>
                  <textarea
                    value={doForm.comment}
                    onChange={e => setDoForm({ ...doForm, comment: e.target.value })}
                    rows={2}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-3 py-2 font-semibold text-slate-500"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 font-bold bg-indigo-600 text-white rounded-xl">
                    Enviar Solicitud
                  </button>
                </div>
              </form>
            )}

            {/* Absence Form */}
            {activeSection === 'absence' && (
              <form onSubmit={handleSubmitAbsence} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Tipo de trámite</label>
                  <select
                    value={abForm.subType}
                    onChange={e => setAbForm({ ...abForm, subType: e.target.value as any })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="communication">Comunicación de ausencia (Informativa, no requiere aprobación)</option>
                    <option value="leave_request">Petición de permiso (Requiere aprobación del administrador)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Categoría</label>
                  <select
                    value={abForm.category}
                    onChange={e => setAbForm({ ...abForm, category: e.target.value as any })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="medico">Médico / Consulta</option>
                    <option value="urgencia_familiar">Urgencia Familiar</option>
                    <option value="fuerza_mayor">Fuerza Mayor</option>
                    <option value="otro">Otro deber inexcusable</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1">Fecha inicio</label>
                    <input
                      type="date"
                      value={abForm.startDate}
                      onChange={e => setAbForm({ ...abForm, startDate: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Fecha fin</label>
                    <input
                      type="date"
                      value={abForm.endDate}
                      onChange={e => setAbForm({ ...abForm, endDate: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      required
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={abForm.hasCertificate}
                      onChange={e => setAbForm({ ...abForm, hasCertificate: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Justificante entregado al administrador
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Nota: Nunca introduzcas datos de diagnóstico o salud personal.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-3 py-2 font-semibold text-slate-500"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 font-bold bg-indigo-600 text-white rounded-xl">
                    Guardar Ausencia
                  </button>
                </div>
              </form>
            )}

            {/* Incidents Form */}
            {activeSection === 'incidents' && (
              <form onSubmit={handleSubmitIncident} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Categoría</label>
                  <select
                    value={incForm.category}
                    onChange={e => setIncForm({ ...incForm, category: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="fichaje">Fichaje u Horario</option>
                    <option value="turno_incorrecto">Turno asignado incorrecto</option>
                    <option value="material">Material o Instalaciones</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Fecha</label>
                  <input
                    type="date"
                    value={incForm.date}
                    onChange={e => setIncForm({ ...incForm, date: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Descripción</label>
                  <textarea
                    value={incForm.description}
                    onChange={e => setIncForm({ ...incForm, description: e.target.value })}
                    rows={3}
                    placeholder="Explica qué ha sucedido..."
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-3 py-2 font-semibold text-slate-500"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 font-bold bg-indigo-600 text-white rounded-xl">
                    Registrar Incidencia
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
