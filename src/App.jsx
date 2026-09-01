import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  Plus, 
  Trash2, 
  Download, 
  ShieldCheck, 
  ShieldAlert, 
  Star // Import the star icon
} from 'lucide-react';

const SHIFTS = {
  M: { label: 'Mañana', color: 'bg-[#00a94e] text-white' }, // Wordmark Green
  T: { label: 'Tarde', color: 'bg-[#008c3a] text-white' }, // Slightly darker green
  N: { label: 'Noche', color: 'bg-[#006e28] text-white' }, // Deep green
  DES: { label: 'Descanso', color: 'bg-[#1d4d38] text-white' }, // Muted dark green
  VAC: { label: 'Vacaciones', color: 'bg-[#138e5c] text-white' }, // Clear muted green
  INC: { label: 'Incapacidad', color: 'bg-[#e31837] text-white' } // Star Red
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
    <div className="min-h-screen bg-[#021f12] text-white p-4 md:p-8 font-sans">
      {/* Header with Heineken Vibe and Red Star Icon */}
      <header className="max-w-7xl mx-auto mb-8 bg-[#00a94e] p-6 rounded-2xl shadow-xl border border-[#00a94e]/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <Star className="w-16 h-16 text-[#e31837] mb-2 md:mb-0" fill="#e31837" />
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide">ShiftForklift</h1>
            <p className="text-sm text-[#e1e1e1]">Gestión de Horarios y Licencias de Montacarguismo</p>
          </div>
        </div>
        <button
          onClick={handlePrintReport}
          className="flex items-center gap-2 bg-[#021f12] hover:bg-[#032e1a] text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg transition duration-200 border border-[#00a94e]/30"
        >
          <Download className="w-5 h-5" />
          Exportar / Imprimir Reporte
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto space-y-8">
        {/* Leyenda de Turnos */}
        <section className="bg-[#032e1a] p-5 rounded-2xl border border-[#00a94e]/50 shadow-md">
          <h2 className="text-xs font-bold text-[#c1c1c1] uppercase tracking-wider mb-3">Leyenda de Turnos (Haz clic en la celda para cambiar)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(SHIFTS).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 bg-[#021f12] p-2.5 rounded-xl border border-[#00a94e]/30">
                <span className={`w-8 h-8 flex items-center justify-center font-bold text-xs rounded-lg ${value.color}`}>
                  {key}
                </span>
                <span className="text-xs font-medium text-[#c1c1c1]">{value.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tabla de Horarios con Weekend Red Highlights */}
        <section className="bg-[#032e1a] rounded-2xl border border-[#00a94e]/50 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-[#00a94e]/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-400" />
              Programación Semanal de Operadores
            </h2>
            <span className="text-xs text-[#c1c1c1]">Total Operadores: {operators.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#021f12]/80 text-[#c1c1c1] text-xs uppercase tracking-wider border-b border-[#00a94e]/50">
                  <th className="p-4">Operador</th>
                  <th className="p-4">Licencia</th>
                  {DAYS.map((day, idx) => (
                    <th key={day} className={`p-4 text-center ${idx >= 5 ? 'text-red-400' : ''}`}>
                      {day}
                    </th>
                  ))}
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#00a94e]/30 text-sm">
                {operators.map((op) => (
                  <tr key={op.id} className="hover:bg-[#032e1a]/50 transition">
                    <td className="p-4 font-semibold text-white">
                      {op.name}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {op.licenseValid ? (
                          <ShieldCheck className="w-4 h-4 text-[#00a94e]" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-[#e31837]" />
                        )}
                        <span className="text-xs text-[#c1c1c1] font-mono">{op.licenseNumber}</span>
                      </div>
                      <span className="text-[10px] text-[#c1c1c1] block mt-0.5">Vence: {op.licenseExpiry}</span>
                    </td>
                    {op.schedule.map((shiftKey, dayIdx) => {
                      const shiftInfo = SHIFTS[shiftKey] || SHIFTS.M;
                      return (
                        <td key={dayIdx} className="p-2 text-center">
                          <button
                            onClick={() => handleShiftChange(op.id, dayIdx)}
                            className={`w-10 h-10 rounded-xl font-bold text-xs transition duration-150 transform hover:scale-105 active:scale-95 shadow-md ${shiftInfo.color} ${shiftKey === 'INC' ? 'border-2 border-white' : ''}`}
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
                        className="p-2 text-[#e31837] hover:text-[#e31837] hover:bg-[#e31837]/10 rounded-lg transition"
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

        {/* Formulario Agregar Operador con Red Accent Button */}
        <section className="bg-[#032e1a] p-6 rounded-2xl border border-[#00a94e]/50 shadow-lg">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-red-400" />
            Agregar Nuevo Operador
          </h2>
          <form onSubmit={handleAddOperator} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-[#c1c1c1] mb-1">Nombre Completo</label>
              <input
                type="text"
                placeholder="Ej. Juan Pérez"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[#021f12] border border-[#00a94e]/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00a94e]"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-[#c1c1c1] mb-1">Nº Licencia</label>
              <input
                type="text"
                placeholder="Ej. LIC-9920"
                value={newLic}
                onChange={(e) => setNewLic(e.target.value)}
                className="w-full bg-[#021f12] border border-[#00a94e]/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00a94e]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#c1c1c1] mb-1">Vencimiento Licencia</label>
              <input
                type="date"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                className="w-full bg-[#021f12] border border-[#00a94e]/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00a94e]"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-[#e31837] hover:bg-[#e31837]/80 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition"
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
