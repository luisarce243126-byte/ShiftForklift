import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  Plus, 
  Trash2, 
  Download, 
  ShieldCheck, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight, 
  Edit2, 
  Check, 
  X, 
  TreePalm, 
  AlertCircle,
  Clock
} from 'lucide-react';

// Datos iniciales de demostración
const INITIAL_EMPLOYEES = [
  { id: '1', name: 'Ana García', department: 'Ingeniería', position: 'Senior Developer', maxDays: 15, avatar: 'AG' },
  { id: '2', name: 'Carlos López', department: 'Diseño', position: 'UX Designer', maxDays: 12, avatar: 'CL' },
  { id: '3', name: 'María Rodríguez', department: 'Ingeniería', position: 'QA Lead', maxDays: 15, avatar: 'MR' },
  { id: '4', name: 'Javier Martínez', department: 'Soporte', position: 'Support Agent', maxDays: 10, avatar: 'JM' },
  { id: '5', name: 'Sofía Hernández', department: 'Diseño', position: 'UI Designer', maxDays: 12, avatar: 'SH' },
];

const INITIAL_VACATIONS = [
  { id: '101', employeeId: '1', startDate: '2026-09-10', endDate: '2026-09-15', status: 'approved', notes: 'Vacaciones de verano' },
  { id: '102', employeeId: '3', startDate: '2026-09-12', endDate: '2026-09-18', status: 'pending', notes: 'Viaje familiar' },
  { id: '103', employeeId: '2', startDate: '2026-09-01', endDate: '2026-09-05', status: 'approved', notes: 'Descanso' },
  { id: '104', employeeId: '4', startDate: '2026-09-20', endDate: '2026-09-25', status: 'pending', notes: 'Asuntos personales' },
];

export default function App() {
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [vacations, setVacations] = useState(INITIAL_VACATIONS);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'requests', 'employees'
  
  // Filtros
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1)); // Sept 2026

  // Estados de Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);

  // Errores de formulario
  const [formError, setFormError] = useState('');

  // Formulario Solicitud
  const [newReqEmployeeId, setNewReqEmployeeId] = useState('');
  const [newReqStart, setNewReqStart] = useState('');
  const [newReqEnd, setNewReqEnd] = useState('');
  const [newReqNotes, setNewReqNotes] = useState('');

  // Formulario Empleado
  const [empName, setEmpName] = useState('');
  const [empDept, setEmpDept] = useState('');
  const [empPos, setEmpPos] = useState('');
  const [empMaxDays, setEmpMaxDays] = useState(15);

  const departments = Array.from(new Set(employees.map(e => e.department)));

  // Helper: Cálculo de días seguro (Independiente de la zona horaria)
  const getDaysCount = (startStr, endStr) => {
    if (!startStr || !endStr) return 0;
    const [y1, m1, d1] = startStr.split('-').map(Number);
    const [y2, m2, d2] = endStr.split('-').map(Number);
    
    const utc1 = Date.UTC(y1, m1 - 1, d1);
    const utc2 = Date.UTC(y2, m2 - 1, d2);
    
    if (utc2 < utc1) return 0;
    
    const diffDays = Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  };

  // Helper: Verificación de solapamiento de fechas
  const isOverlapping = (s1, e1, s2, e2) => {
    return (s1 <= e2) && (e1 >= s2);
  };

  // Cálculo seguro de estadísticas por empleado
  const calculateStats = (empId) => {
    const emp = employees.find(e => e.id === empId);
    const defaultMax = emp ? emp.maxDays : 15;

    const used = vacations
      .filter(v => v.employeeId === empId && v.status === 'approved')
      .reduce((acc, v) => acc + getDaysCount(v.startDate, v.endDate), 0);

    const pending = vacations
      .filter(v => v.employeeId === empId && v.status === 'pending')
      .reduce((acc, v) => acc + getDaysCount(v.startDate, v.endDate), 0);

    return {
      used,
      pending,
      remaining: Math.max(0, defaultMax - used),
      max: defaultMax,
      empFound: !!emp
    };
  };

  // Detector de conflictos departamentales
  const hasConflict = (req) => {
    const emp = employees.find(e => e.id === req.employeeId);
    if (!emp) return false;

    return vacations.some(v => 
      v.id !== req.id &&
      v.status !== 'rejected' &&
      employees.find(e => e.id === v.employeeId)?.department === emp.department &&
      isOverlapping(req.startDate, req.endDate, v.startDate, v.endDate)
    );
  };

  // Manejo de Solicitudes
  const handleAddRequest = (e) => {
    e.preventDefault();
    setFormError('');

    if (!newReqEmployeeId || !newReqStart || !newReqEnd) {
      setFormError('Por favor complete todos los campos obligatorios.');
      return;
    }

    if (newReqStart > newReqEnd) {
      setFormError('La fecha de inicio no puede ser posterior a la fecha final.');
      return;
    }

    const daysRequested = getDaysCount(newReqStart, newReqEnd);
    const stats = calculateStats(newReqEmployeeId);

    if (daysRequested > stats.remaining) {
      setFormError(`El empleado solo tiene ${stats.remaining} días disponibles (solicitó ${daysRequested}).`);
      return;
    }

    const selfOverlap = vacations.some(v =>
      v.employeeId === newReqEmployeeId &&
      v.status !== 'rejected' &&
      isOverlapping(newReqStart, newReqEnd, v.startDate, v.endDate)
    );

    if (selfOverlap) {
      setFormError('El empleado ya tiene una solicitud registrada en este rango de fechas.');
      return;
    }

    const newReq = {
      id: Date.now().toString(),
      employeeId: newReqEmployeeId,
      startDate: newReqStart,
      endDate: newReqEnd,
      status: 'pending',
      notes: newReqNotes || 'Sin observaciones'
    };

    setVacations([newReq, ...vacations]);
    setNewReqEmployeeId('');
    setNewReqStart('');
    setNewReqEnd('');
    setNewReqNotes('');
    setFormError('');
    setShowAddModal(false);
  };

  const handleUpdateStatus = (id, newStatus) => {
    setVacations(vacations.map(v => v.id === id ? { ...v, status: newStatus } : v));
  };

  const handleDeleteVacation = (id) => {
    setVacations(vacations.filter(v => v.id !== id));
  };

  // Manejo de Empleados
  const handleOpenEmpModal = (emp = null) => {
    setFormError('');
    if (emp) {
      setEditingEmp(emp);
      setEmpName(emp.name);
      setEmpDept(emp.department);
      setEmpPos(emp.position);
      setEmpMaxDays(emp.maxDays);
    } else {
      setEditingEmp(null);
      setEmpName('');
      setEmpDept('');
      setEmpPos('');
      setEmpMaxDays(15);
    }
    setShowEmpModal(true);
  };

  const handleSaveEmployee = (e) => {
    e.preventDefault();
    setFormError('');

    if (!empName.trim() || !empDept.trim() || !empPos.trim()) {
      setFormError('Por favor complete todos los campos del empleado.');
      return;
    }

    if (empMaxDays < 1) {
      setFormError('El máximo de días debe ser mayor a 0.');
      return;
    }

    if (editingEmp) {
      setEmployees(employees.map(e => e.id === editingEmp.id ? {
        ...e,
        name: empName,
        department: empDept,
        position: empPos,
        maxDays: Number(empMaxDays)
      } : e));
    } else {
      const initials = empName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'EM';

      const newEmp = {
        id: Date.now().toString(),
        name: empName,
        department: empDept,
        position: empPos,
        maxDays: Number(empMaxDays),
        avatar: initials
      };
      setEmployees([...employees, newEmp]);
    }

    setShowEmpModal(false);
  };

  const handleDeleteEmployee = (id) => {
    if (window.confirm('¿Está seguro de eliminar este empleado? Sus solicitudes de vacaciones se mantendrán.')) {
      setEmployees(employees.filter(e => e.id !== id));
    }
  };

  // Exportar a CSV compatible con Excel
  const exportToCSV = () => {
    const headers = ['Empleado', 'Departamento', 'Cargo', 'Inicio', 'Fin', 'Días', 'Estado', 'Notas'];
    const rows = vacations.map(v => {
      const emp = employees.find(e => e.id === v.employeeId);
      const days = getDaysCount(v.startDate, v.endDate);
      return [
        `"${emp ? emp.name : 'Empleado Eliminado'}"`,
        `"${emp ? emp.department : '-'}"`,
        `"${emp ? emp.position : '-'}"`,
        `"${v.startDate}"`,
        `"${v.endDate}"`,
        days,
        `"${v.status === 'approved' ? 'Aprobada' : v.status === 'rejected' ? 'Rechazada' : 'Pendiente'}"`,
        `"${(v.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vacaciones_reporte_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrado de Vacaciones
  const filteredVacations = vacations.filter(v => {
    const emp = employees.find(e => e.id === v.employeeId);
    const matchDept = filterDept === 'all' || (emp && emp.department === filterDept);
    const matchStatus = filterStatus === 'all' || v.status === filterStatus;
    return matchDept && matchStatus;
  });

  // Generación de Calendario
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getMonthData = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNumber: i,
        dateKey: dateStr
      });
    }
    return { days, monthName: firstDay.toLocaleString('es-ES', { month: 'long', year: 'numeric' }) };
  };

  const monthData = getMonthData();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Encabezado Principal */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <TreePalm className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">ControlVacaciones</h1>
              <p className="text-xs text-slate-500">Gestión de ausencias y personal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
            <button 
              onClick={() => { setFormError(''); setShowAddModal(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Solicitud</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Pestañas de Navegación */}
        <div className="flex border-b border-slate-200 mb-6 gap-8">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`pb-4 px-1 flex items-center gap-2 font-medium text-sm border-b-2 transition ${
              activeTab === 'calendar' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendario
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-4 px-1 flex items-center gap-2 font-medium text-sm border-b-2 transition ${
              activeTab === 'requests' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Solicitudes ({vacations.filter(v => v.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`pb-4 px-1 flex items-center gap-2 font-medium text-sm border-b-2 transition ${
              activeTab === 'employees' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Empleados ({employees.length})
          </button>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-sm">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">DEPARTAMENTO</label>
              <select 
                value={filterDept} 
                onChange={(e) => setFilterDept(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todos los departamentos</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">ESTADO</label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todos los estados</option>
                <option value="approved">Aprobadas</option>
                <option value="pending">Pendientes</option>
                <option value="rejected">Rechazadas</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-medium border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Aprobadas: {vacations.filter(v => v.status === 'approved').length}
            </span>
            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-medium border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pendientes: {vacations.filter(v => v.status === 'pending').length}
            </span>
          </div>
        </div>

        {/* PESTAÑA 1: VISTA DE CALENDARIO */}
        {activeTab === 'calendar' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900 capitalize">{monthData.monthName}</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrevMonth}
                  className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
                >
                  Hoy
                </button>
                <button 
                  onClick={handleNextMonth}
                  className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-center text-xs font-semibold text-slate-500 py-2">
              <div>Dom</div>
              <div>Lun</div>
              <div>Mar</div>
              <div>Mié</div>
              <div>Jue</div>
              <div>Vie</div>
              <div>Sáb</div>
            </div>

            <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
              {monthData.days.map((dayObj, i) => {
                if (!dayObj) {
                  return <div key={`empty-${i}`} className="bg-white min-h-[100px] p-2"></div>;
                }

                const dayVacations = filteredVacations.filter(v => 
                  v.status !== 'rejected' && 
                  dayObj.dateKey >= v.startDate && 
                  dayObj.dateKey <= v.endDate
                );

                return (
                  <div key={dayObj.dateKey} className="bg-white min-h-[100px] p-2 flex flex-col justify-start">
                    <span className="text-xs font-bold text-slate-400 mb-1">{dayObj.dayNumber}</span>
                    <div className="space-y-1">
                      {dayVacations.map(v => {
                        const emp = employees.find(e => e.id === v.employeeId);
                        const isApproved = v.status === 'approved';
                        const conflict = hasConflict(v);

                        return (
                          <div 
                            key={v.id}
                            className={`p-1.5 rounded text-[11px] font-medium leading-tight flex items-center justify-between border ${
                              isApproved 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                            title={`${emp ? emp.name : 'Eliminado'} (${v.startDate} a ${v.endDate})`}
                          >
                            <span className="truncate">{emp ? emp.name.split(' ')[0] : 'Eliminado'}</span>
                            {conflict && (
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0 ml-1" title="Conflicto en departamento" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PESTAÑA 2: LISTA DE SOLICITUDES */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
