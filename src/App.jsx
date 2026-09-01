import React, { useState } from 'react';
import { Users, Calendar, Plus, Trash2, Download, ShieldAlert, ChevronLeft, ChevronRight, Edit2, Check, X, Truck, Clock } from 'lucide-react';

const INITIAL_EMPLOYEES = [
  { id: '1', name: 'Ana García', department: 'Almacén Central', position: 'Operador Montacargas Sr.', maxDays: 15, avatar: 'AG' },
  { id: '2', name: 'Carlos López', department: 'Zona Carga', position: 'Montacargista AP', maxDays: 12, avatar: 'CL' },
  { id: '3', name: 'María Rodríguez', department: 'Almacén A', position: 'Supervisora Turno', maxDays: 15, avatar: 'MR' },
  { id: '4', name: 'Javier Martínez', department: 'Despacho', position: 'Operador Montacargas', maxDays: 10, avatar: 'JM' },
];

const INITIAL_VACATIONS = [
  { id: '101', employeeId: '1', startDate: '2026-09-10', endDate: '2026-09-15', status: 'approved', notes: 'Permiso programado' },
  { id: '102', employeeId: '3', startDate: '2026-09-12', endDate: '2026-09-18', status: 'pending', notes: 'Capacitación externa' },
];

export default function App() {
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [vacations, setVacations] = useState(INITIAL_VACATIONS);
  const [activeTab, setActiveTab] = useState('calendar');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1));

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [formError, setFormError] = useState('');

  const [newReq, setNewReq] = useState({ employeeId: '', start: '', end: '', notes: '' });
  const [empForm, setEmpForm] = useState({ name: '', dept: '', pos: '', maxDays: 15 });

  const departments = Array.from(new Set(employees.map(e => e.department)));

  const getDaysCount = (startStr, endStr) => {
    if (!startStr || !endStr) return 0;
    const [y1, m1, d1] = startStr.split('-').map(Number);
    const [y2, m2, d2] = endStr.split('-').map(Number);
    const diff = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  };

  const isOverlapping = (s1, e1, s2, e2) => s1 <= e2 && e1 >= s2;

  const calculateStats = (empId) => {
    const emp = employees.find(e => e.id === empId);
    const max = emp ? emp.maxDays : 15;
    const used = vacations.filter(v => v.employeeId === empId && v.status === 'approved')
      .reduce((acc, v) => acc + getDaysCount(v.startDate, v.endDate), 0);
    const pending = vacations.filter(v => v.employeeId === empId && v.status === 'pending')
      .reduce((acc, v) => acc + getDaysCount(v.startDate, v.endDate), 0);
    return { used, pending, remaining: Math.max(0, max - used), max };
  };

  const hasConflict = (req) => {
    const emp = employees.find(e => e.id === req.employeeId);
    if (!emp) return false;
    return vacations.some(v => v.id !== req.id && v.status !== 'rejected' &&
      employees.find(e => e.id === v.employeeId)?.department === emp.department &&
      isOverlapping(req.startDate, req.endDate, v.startDate, v.endDate)
    );
  };

  const handleAddRequest = (e) => {
    e.preventDefault();
    setFormError('');
    const { employeeId, start, end, notes } = newReq;
    if (!employeeId || !start || !end) return setFormError('Complete los campos obligatorios.');
    if (start > end) return setFormError('La fecha de inicio debe ser anterior a la final.');
    
    const days = getDaysCount(start, end);
    const stats = calculateStats(employeeId);
    if (days > stats.remaining) return setFormError(`El operador solo tiene ${stats.remaining} días disponibles.`);
    if (vacations.some(v => v.employeeId === employeeId && v.status !== 'rejected' && isOverlapping(start, end, v.startDate, v.endDate))) {
      return setFormError('Ya existe una programación en ese rango de fechas.');
    }

    setVacations([{ id: Date.now().toString(), employeeId, startDate: start, endDate: end, status: 'pending', notes: notes || 'Sin observaciones' }, ...vacations]);
    setNewReq({ employeeId: '', start: '', end: '', notes: '' });
    setShowAddModal(false);
  };

  const handleSaveEmployee = (e) => {
    e.preventDefault();
    setFormError('');
    const { name, dept, pos, maxDays } = empForm;
    if (!name.trim() || !dept.trim() || !pos.trim()) return setFormError('Complete todos los campos.');
    
    if (editingEmp) {
      setEmployees(employees.map(e => e.id === editingEmp.id ? { ...e, name, department: dept, position: pos, maxDays: Number(maxDays) } : e));
    } else {
      const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'OP';
      setEmployees([...employees, { id: Date.now().toString(), name, department: dept, position: pos, maxDays: Number(maxDays), avatar }]);
    }
    setShowEmpModal(false);
  };

  const exportToCSV = () => {
    const headers = ['Operador', 'Área/Almacén', 'Puesto', 'Inicio', 'Fin', 'Días', 'Estado', 'Notas'];
    const rows = vacations.map(v => {
      const emp = employees.find(e => e.id === v.employeeId);
      return [`"${emp?.name || 'Eliminado'}"`, `"${emp?.department || '-'}"`, `"${emp?.position || '-'}"`, `"${v.startDate}"`, `"${v.endDate}"`, getDaysCount(v.startDate, v.endDate), `"${v.status}"`, `"${(v.notes || '').replace(/"/g, '""')}"`].join(',');
    });
    const blob = new Blob(["\uFEFF" + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `turnos_montacargas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredVacations = vacations.filter(v => {
    const emp = employees.find(e => e.id === v.employeeId);
    return (filterDept === 'all' || emp?.department === filterDept) && (filterStatus === 'all' || v.status === filterStatus);
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const calendarDays = [];
  for (let i = 0; i < firstDay.getDay(); i++) calendarDays.push(null);
  for (let i = 1; i <= new Date(year, month + 1, 0).getDate(); i++) {
    calendarDays.push({ dayNumber: i, dateKey: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}` });
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-xl text-slate-950 font-bold"><Truck className="w-6 h-6" /></div>
            <div><h1 className="text-xl font-black text-amber-500 tracking-wide uppercase">ShiftForklift</h1><p className="text-xs text-slate-400">Control Operaciones & Montacargas</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg"><Download className="w-4 h-4" /><span className="hidden sm:inline">CSV</span></button>
            <button onClick={() => { setFormError(''); setShowAddModal(true); }} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-950 font-semibold bg-amber-500 hover:bg-amber-400 rounded-lg"><Plus className="w-4 h-4" />Nuevo Registro</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex border-b border-slate-700 mb-6 gap-8">
          {['calendar', 'requests', 'employees'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 px-1 flex items-center gap-2 font-medium text-sm border-b-2 capitalize ${activeTab === tab ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400'}`}>
              {tab === 'calendar' ? <Calendar className="w-4 h-4" /> : tab === 'requests' ? <Clock className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              {tab === 'calendar' ? 'Calendario Operativo' : tab === 'requests' ? `Programaciones (${vacations.filter(v => v.status === 'pending').length})` : `Operadores (${employees.length})`}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
          <div className="flex gap-4">
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="bg-slate-900 text-slate-200 border border-slate-700 p-2 rounded-lg text-sm">
              <option value="all">Todas las Áreas/Almacenes</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-900 text-slate-200 border border-slate-700 p-2 rounded-lg text-sm">
              <option value="all">Todos los estados</option>
              <option value="approved">Aprobadas</option>
              <option value="pending">Pendientes</option>
              <option value="rejected">Rechazadas</option>
            </select>
          </div>
        </div>

        {activeTab === 'calendar' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="flex justify-between p-4 border-b border-slate-700 bg-slate-800/50">
              <h2 className="font-bold capitalize text-amber-400">{firstDay.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</h2>
              <div className="flex gap-2">
                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-slate-700 rounded text-slate-300"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs font-semibold bg-slate-700 hover:bg-slate-600 rounded text-slate-200">Hoy</button>
                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-slate-700 rounded text-slate-300"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 border-b border-slate-700 bg-slate-900 text-center text-xs py-2 text-slate-400 font-semibold">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 bg-slate-700 gap-px">
              {calendarDays.map((day, i) => !day ? <div key={i} className="bg-slate-800 min-h-[90px] p-2" /> : (
                <div key={day.dateKey} className="bg-slate-800 min-h-[90px] p-2">
                  <span className="text-xs font-bold text-slate-500">{day.dayNumber}</span>
                  <div className="space-y-1 mt-1">
                    {filteredVacations.filter(v => v.status !== 'rejected' && day.dateKey >= v.startDate && day.dateKey <= v.endDate).map(v => (
                      <div key={v.id} className={`p-1 rounded text-[11px] flex justify-between border ${v.status === 'approved' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>
                        <span className="truncate">{employees.find(e => e.id === v.employeeId)?.name.split(' ')[0] || 'N/A'}</span>
                        {hasConflict(v) && <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs text-slate-400 border-b border-slate-700 uppercase">
                <tr><th className="p-4">Operador</th><th className="p-4">Fechas</th><th className="p-4">Días</th><th className="p-4">Estado</th><th className="p-4 text-right">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredVacations.map(v => (
                  <tr key={v.id} className="hover:bg-slate-750">
                    <td className="p-4 font-semibold text-slate-200">{employees.find(e => e.id === v.employeeId)?.name || 'Eliminado'}</td>
                    <td className="p-4 text-slate-300">{v.startDate} a {v.endDate}</td>
                    <td className="p-4 text-slate-300">{getDaysCount(v.startDate, v.endDate)}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${v.status === 'approved' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-700 text-slate-300'}`}>{v.status}</span></td>
                    <td className="p-4 text-right">
                      {v.status === 'pending' && (
                        <>
                          <button onClick={() => setVacations(vacations.map(x => x.id === v.id ? { ...x, status: 'approved' } : x))} className="p-1 text-emerald-400 hover:text-emerald-300"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setVacations(vacations.map(x => x.id === v.id ? { ...x, status: 'rejected' } : x))} className="p-1 text-rose-400 hover:text-rose-300"><X className="w-4 h-4" /></button>
                        </>
                      )}
                      <button onClick={() => setVacations(vacations.filter(x => x.id !== v.id))} className="p-1 text-slate-500 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'employees' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {employees.map(emp => {
              const stats = calculateStats(emp.id);
              return (
                <div key={emp.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-slate-100">{emp.name}</h3>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingEmp(emp); setEmpForm({ name: emp.name, dept: emp.department, pos: emp.position, maxDays: emp.maxDays }); setShowEmpModal(true); }} className="text-slate-400 hover:text-amber-400"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setEmployees(employees.filter(e => e.id !== emp.id))} className="text-slate-400 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{emp.position} • {emp.department}</p>
                  <div className="text-xs flex justify-between font-semibold mb-1">
                    <span className="text-slate-300">{stats.used} / {stats.max} días asignados</span>
                    <span className="text-amber-400">{stats.remaining} disp.</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full" style={{ width: `${(stats.used / stats.max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-6 relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="font-bold text-slate-100 mb-4">Nueva Solicitud de Operador</h3>
            {formError && <p className="text-xs text-rose-400 mb-3">{formError}</p>}
            <form onSubmit={handleAddRequest} className="space-y-3">
              <select value={newReq.employeeId} onChange={e => setNewReq({ ...newReq, employeeId: e.target.value })} className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded text-sm" required>
                <option value="">Seleccionar Operador</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.department})</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={newReq.start} onChange={e => setNewReq({ ...newReq, start: e.target.value })} className="bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded text-sm" required />
                <input type="date" value={newReq.end} onChange={e => setNewReq({ ...newReq, end: e.target.value })} className="bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded text-sm" required />
              </div>
              <textarea placeholder="Notas / Turno de reemplazo" value={newReq.notes} onChange={e => setNewReq({ ...newReq, notes: e.target.value })} className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded text-sm" />
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1 text-sm text-slate-300">Cancelar</button><button type="submit" className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded text-sm hover:bg-amber-400">Guardar</button></div>
            </form>
          </div>
        </div>
      )}

      {showEmpModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-6 relative">
            <button onClick={() => setShowEmpModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="font-bold text-slate-100 mb-4">{editingEmp ? 'Editar Operador' : 'Nuevo Operador'}</h3>
            {formError && <p className="text-xs text-rose-400 mb-3">{formError}</p>}
            <form onSubmit={handleSaveEmployee} className="space-y-3">
              <input type="text" placeholder="Nombre completo" value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded text-sm" required />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Área / Almacén" value={empForm.dept} onChange={e => setEmpForm({ ...empForm, dept: e.target.value })} className="bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded text-sm" required />
                <input type="text" placeholder="Puesto / Categoría" value={empForm.pos} onChange={e => setEmpForm({ ...empForm, pos: e.target.value })} className="bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded text-sm" required />
              </div>
              <input type="number" placeholder="Días Máximos Asignados" value={empForm.maxDays} onChange={e => setEmpForm({ ...empForm, maxDays: e.target.value })} className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded text-sm" required />
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowEmpModal(false)} className="px-3 py-1 text-sm text-slate-300">Cancelar</button><bu
