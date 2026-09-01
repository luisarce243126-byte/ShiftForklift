import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  Plus, 
  Trash2, 
  Download, 
  ShieldCheck, 
  ShieldAlert, 
  Clock 
} from 'lucide-react';

const SHIFTS = {
  M: { label: 'Mañana', color: 'bg-emerald-500 text-white' },
  T: { label: 'Tarde', color: 'bg-amber-500 text-white' },
  N: { label: 'Noche', color: 'bg-indigo-600 text-white' },
  DES: { label: 'Descanso', color: 'bg-slate-500 text-white' },
  VAC: { label: 'Vacaciones', color: 'bg-sky-500 text-white' },
  INC: { label: 'Incapacidad', color: 'bg-rose-500 text-white' }
};

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function App() {
  const [operators, setOperators] = useState([
    {
      id: 1,
      name: 'Carlos Mendoza',
      licenseNumber: 'LIC-8821',
      licenseValid: true,
      licenseExpiry: '2026-12-15',
      schedule: ['M', 'M', 'M', 'M', 'M', 'DES', 'DES']
    },
    {
      id: 2,
      name: 'Ana Ramos',
      licenseNumber: 'LIC-4019',
      licenseValid: true,
      licenseExpiry: '2026-10-20',
      schedule: ['T', 'T', 'T', 'T', 'T', 'DES', 'DES']
    },
    {
      id: 3,
      name: 'Jorge Luis Morales',
      licenseNumber: 'LIC-1102',
      licenseValid: false,
      licenseExpiry: '2026-08-01',
      schedule: ['N', 'N', 'N', 'N', 'N', 'DES', 'DES']
    }
  ]);

  const [newName, setNewName] = useState('');
  const [newLic, setNewLic] = useState('');
  const [newExpiry, setNewExpiry] = useState('');

  const handleShiftChange = (operatorId, dayIndex) => {
    const shiftKeys = Object.keys(SHIFTS);
    setOperators(prev => prev.map(op => {
      if (op.id !== operatorId) return op;
      const currentShift = op.schedule[dayIndex];
      const nextIndex = (shiftKeys.indexOf(currentShift) + 1) % shiftKeys.length;
      const newSchedule = [...op.schedule];
      newSchedule[dayIndex] = shiftKeys[nextIndex];
      return { ...op, schedule: newSchedule };
    }));
  };

  const handleAddOperator = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newOp = {
      id: Date.now(),
      name: newName,
      licenseNumber: newLic || 'N/A',
      licenseValid: newExpiry ? new Date(newExpiry) >= new Date() : true,
      licenseExpiry: newExpiry || '2027-01-01',
      schedule: ['M', 'M', 'M', 'M', 'M', 'DES', 'DES']
    };
    setOperators([...operators, newOp]);
    setNewName('');
    setNewLic('');
    setNewExpiry('');
  };

  const handleDeleteOperator = (id) => {
    setOperators(operators.filter(op => op.id !== id));
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8 bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide">ShiftForklift</h1>
            <p className="text-sm text-slate-400">Gestión de Horarios y Licencias de Montacarguismo</p>
          </div>
        </div>
        <button
          onClick={handlePrintReport}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg transition duration-200"
        >
          <Download className="w-5 h-5" />
          Exportar / Imprimir Reporte
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto space-y-8">
        {/* Leyenda de Turnos */}
        <section className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-md">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Leyenda de Turnos (Haz clic en la celda para cambiar)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(SHIFTS).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-700">
                <span className={`w-8 h-8 flex items-center justify-center font-bold text-xs rounded-lg ${value.color}`}>
                  {key}
                </span>
                <span className="text-xs font-medium text-slate-300">{value.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tabla de Horarios */}
        <section className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              Programación Semanal de Operadores
            </h2>
            <span className="text-xs text-slate-400">Total Operadores: {operators.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                  <th className="p-4">Operador</th>
                  <th className="p-4">Licencia</th>
                  {DAYS.map((day, idx) => (
                    <th key={day} className={`p-4 text-center ${idx >= 5 ? 'text-amber-400' : ''}`}>
                      {day}
                    </th>
                  ))}
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-sm">
                {operators.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-700/30 transition">
                    <td className="p-4 font-semibold text-white">
                      {op.name}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {op.licenseValid ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-rose-400" />
                        )}
                        <span className="text-xs text-slate-300 font-mono">{op.licenseNumber}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Vence: {op.licenseExpiry}</span>
                    </td>
                    {op.schedule.map((shiftKey, dayIdx) => {
                      const shiftInfo = SHIFTS[shiftKey] || SHIFTS.M;
                      return (
                        <td key={dayIdx} className="p-2 text-center">
                          <button
                            onClick={() => handleShiftChange(op.id, dayIdx)}
                            className={`w-10 h-10 rounded-xl font-bold text-xs transition duration-150 transform hover:scale-105 active:scale-95 shadow-md ${shiftInfo.color}`}
                            title={`Cambiar turno de ${DAYS[dayIdx]}`}
                          >
                            {shiftKey}
                          </button>
                        </td>
                      );
                    })}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDeleteOperator(op.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        title="Eliminar operador"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Formulario Agregar Operador */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Agregar Nuevo Operador
          </h2>
          <form onSubmit={handleAddOperator} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombre Completo</label>
              <input
                type="text"
                placeholder="Ej. Juan Pérez"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nº Licencia</label>
              <input
                type="text"
                placeholder="Ej. LIC-9920"
                value={newLic}
                onChange={(e) => setNewLic(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Vencimiento Licencia</label>
              <input
                type="date"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Plus className="w-5 h-5" />
                Guardar Operador
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
