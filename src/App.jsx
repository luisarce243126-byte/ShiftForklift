import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Truck, 
  Sun, 
  Sunrise, 
  Moon, 
  Coffee, 
  Palmtree, 
  Star, 
  Check, 
  X, 
  FileImage,
  Layers,
  Pencil,
  Trash2
} from 'lucide-react';

const SHIFT_TYPES = {
  M: { code: 'M', label: 'Mañana', color: 'bg-emerald-800/80 text-emerald-100 border-emerald-500/50 hover:bg-emerald-700/90', canvasColor: '#065f46', icon: Sunrise },
  T: { code: 'T', label: 'Tarde', color: 'bg-amber-600/40 text-amber-200 border-amber-500/50 hover:bg-amber-600/60', canvasColor: '#d97706', icon: Sun },
  N: { code: 'N', label: 'Noche', color: 'bg-indigo-900/80 text-indigo-100 border-indigo-500/50 hover:bg-indigo-800/90', canvasColor: '#3730a3', icon: Moon },
  DES: { code: 'DES', label: 'Descanso', color: 'bg-emerald-950 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900', canvasColor: '#022c22', icon: Coffee },
  VAC: { code: 'VAC', label: 'Vacaciones', color: 'bg-purple-900/70 text-purple-200 border-purple-500/50 hover:bg-purple-800/70', canvasColor: '#6b21a8', icon: Palmtree },
  INC: { code: 'INC', label: 'Incapacidad', color: 'bg-red-900/80 text-red-200 border-red-500/50 hover:bg-red-800/80', canvasColor: '#991b1b', icon: AlertTriangle }
};

const WAREHOUSE_ZONES = [
  'Todas las zonas',
  'Recepción / Carga',
  'Pasillos Alta Montaña (Reach)',
  'Embarques / Surtido',
  'Bodega Fría / Congelados',
  'Patio de Contenedores'
];

const FORKLIFT_TYPES = [
  'Hombre Sentado (Gas/Combustión)',
  'Hombre Sentado (Eléctrico)',
  'Hombre Parado (Reach)',
  'Trilateral / Pasillo Angosto',
  'Transpaleta Eléctrica (Rider)'
];

const INITIAL_OPERATORS = [
  { id: 'M-101', name: 'Carlos Mendoza', zone: 'Pasillos Alta Montaña (Reach)', equipment: 'Hombre Parado (Reach)', shiftPattern: 'Mañana', licenseExpiry: '2026-11-15', status: 'Activo' },
  { id: 'M-102', name: 'Roberto Gómez', zone: 'Recepción / Carga', equipment: 'Hombre Sentado (Gas/Combustión)', shiftPattern: 'Mañana', licenseExpiry: '2027-02-10', status: 'Activo' },
  { id: 'M-103', name: 'Ana Patricia Silva', zone: 'Embarques / Surtido', equipment: 'Hombre Sentado (Eléctrico)', shiftPattern: 'Tarde', licenseExpiry: '2026-09-01', status: 'Activo' },
  { id: 'M-104', name: 'Jorge Luis Martínez', zone: 'Pasillos Alta Montaña (Reach)', equipment: 'Trilateral / Pasillo Angosto', shiftPattern: 'Noche', licenseExpiry: '2025-12-01', status: 'Activo' },
  { id: 'M-105', name: 'David Hernández', zone: 'Bodega Fría / Congelados', equipment: 'Hombre Parado (Reach)', shiftPattern: 'Mañana', licenseExpiry: '2027-05-20', status: 'Activo' },
  { id: 'M-106', name: 'Fernando Castillo', zone: 'Patio de Contenedores', equipment: 'Hombre Sentado (Gas/Combustión)', shiftPattern: 'Tarde', licenseExpiry: '2026-08-30', status: 'Activo' },
  { id: 'M-107', name: 'Gabriel Torres', zone: 'Embarques / Surtido', equipment: 'Transpaleta Eléctrica (Rider)', shiftPattern: 'Tarde', licenseExpiry: '2026-10-12', status: 'Activo' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('scheduler');
  const [operators, setOperators] = useState(INITIAL_OPERATORS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('Todas las zonas');

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  });

  const [scheduleData, setScheduleData] = useState({});
  const [vacationRequests, setVacationRequests] = useState([
    { id: 1, operatorId: 'M-103', operatorName: 'Ana Patricia Silva', startDate: '2026-09-10', endDate: '2026-09-18', type: 'Vacaciones', status: 'Pendiente', reason: 'Vacaciones anuales reglamentarias' },
    { id: 2, operatorId: 'M-105', operatorName: 'David Hernández', startDate: '2026-09-02', endDate: '2026-09-03', type: 'Día de Descanso Especial', status: 'Aprobado', reason: 'Asunto personal familiar' }
  ]);

  const [isAddOperatorOpen, setIsAddOperatorOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState(null);
  const [isRequestVacationOpen, setIsRequestVacationOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);

  const [newOp, setNewOp] = useState({
    name: '',
    zone: WAREHOUSE_ZONES[1],
    equipment: FORKLIFT_TYPES[0],
    shiftPattern: 'Mañana',
    licenseExpiry: '2027-12-31'
  });

  const [newVac, setNewVac] = useState({
    operatorId: INITIAL_OPERATORS[0].id,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    type: 'Vacaciones',
    reason: ''
  });

  const weekDays = useMemo(() => {
    const days = [];
    const start = new Date(currentWeekStart + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      days.push({
        dateStr,
        dayName: dayNames[d.getDay()],
        dayNumber: d.getDate(),
        monthName: d.toLocaleDateString('es-ES', { month: 'short' }),
        isWeekend: d.getDay() === 0 || d.getDay() === 6
      });
    }
    return days;
  }, [currentWeekStart]);

  useEffect(() => {
    const newSchedule = { ...scheduleData };
    let changed = false;

    operators.forEach((op) => {
      weekDays.forEach((day, idx) => {
        const key = `${op.id}_${day.dateStr}`;
        if (!newSchedule[key]) {
          if (idx === 5 || idx === 6) {
            newSchedule[key] = 'DES';
          } else {
            if (op.shiftPattern === 'Mañana') newSchedule[key] = 'M';
            else if (op.shiftPattern === 'Tarde') newSchedule[key] = 'T';
            else newSchedule[key] = 'N';
          }
          changed = true;
        }
      });
    });

    if (changed) {
      setScheduleData(newSchedule);
    }
  }, [operators, weekDays]);

  const handleWeekChange = (direction) => {
    const start = new Date(currentWeekStart + 'T00:00:00');
    start.setDate(start.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(start.toISOString().split('T')[0]);
  };

  const handleSetShift = (operatorId, dateStr, shiftCode) => {
    setScheduleData(prev => ({
      ...prev,
      [`${operatorId}_${dateStr}`]: shiftCode
    }));
    setSelectedCell(null);
  };

  const filteredOperators = useMemo(() => {
    return operators.filter(op => {
      const matchesSearch = op.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            op.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesZone = selectedZone === 'Todas las zonas' || op.zone === selectedZone;
      return matchesSearch && matchesZone;
    });
  }, [operators, searchQuery, selectedZone]);

  const dailyCoverage = useMemo(() => {
    const coverage = {};
    weekDays.forEach(day => {
      coverage[day.dateStr] = { M: 0, T: 0, N: 0, DES: 0, VAC: 0, INC: 0 };
      filteredOperators.forEach(op => {
        const shift = scheduleData[`${op.id}_${day.dateStr}`] || 'DES';
        if (coverage[day.dateStr][shift] !== undefined) {
          coverage[day.dateStr][shift]++;
        }
      });
    });
    return coverage;
  }, [weekDays, filteredOperators, scheduleData]);

  const handleDownloadPNG = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const width = 1300;
    const rowHeight = 65;
    const headerHeight = 140;
    const footerHeight = 70;
    const height = headerHeight + (filteredOperators.length * rowHeight) + footerHeight;

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#022415';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#005826';
    ctx.fillRect(0, 0, width, 95);

    ctx.fillStyle = '#e31b23';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('★', 35, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('PROGRAMACIÓN SEMANAL DE MONTACARGISTAS', 85, 45);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`Semana del ${weekDays[0].dayNumber} ${weekDays[0].monthName} al ${weekDays[6].dayNumber} ${weekDays[6].monthName} | Filtro: ${selectedZone}`, 85, 73);

    const tableTop = 110;
    ctx.fillStyle = '#01190e';
    ctx.fillRect(30, tableTop, width - 60, 45);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('OPERADOR / ZONA', 45, tableTop + 27);

    const colWidth = (width - 360) / 7;
    weekDays.forEach((day, i) => {
      const x = 330 + (i * colWidth);
      ctx.fillStyle = day.isWeekend ? '#e31b23' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`${day.dayName.toUpperCase()} ${day.dayNumber}`, x + (colWidth / 2), tableTop + 27);
    });
    ctx.textAlign = 'left';

    filteredOperators.forEach((op, rIdx) => {
      const y = tableTop + 45 + (rIdx * rowHeight);

      ctx.fillStyle = rIdx % 2 === 0 ? '#043420' : '#022818';
      ctx.fillRect(30, y, width - 60, rowHeight - 4);
      
      ctx.strokeStyle = '#005826';
      ctx.lineWidth = 1;
      ctx.strokeRect(30, y, width - 60, rowHeight - 4);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(op.name, 45, y + 26);

      ctx.fillStyle = '#6ee7b7';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(`${op.id} • ${op.zone}`, 45, y + 46);

      weekDays.forEach((day, cIdx) => {
        const x = 330 + (cIdx * colWidth);
        const shiftCode = scheduleData[`${op.id}_${day.dateStr}`] || 'DES';
        const shiftConfig = SHIFT_TYPES[shiftCode] || SHIFT_TYPES.DES;

        ctx.fillStyle = shiftConfig.canvasColor;
        const boxX = x + 8;
        const boxY = y + 10;
        const boxW = colWidth - 16;
        const boxH = 40;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        } else {
          ctx.fillRect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(shiftCode, boxX + (boxW / 2), boxY + 24);
        ctx.textAlign = 'left';
      });
    });

    const footerY = height - 25;
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('★ Generado por ShiftForklift - Control de Horarios y Rotación de Almacén', 35, footerY);

    const dataUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.download = `Horarios_Montacargas_${currentWeekStart}.png`;
    downloadLink.href = dataUrl;
    downloadLink.click();
  };

  // APERTURA DE MODAL CREAR
  const handleOpenAddModal = () => {
    setEditingOperator(null);
    setNewOp({
      name: '',
      zone: WAREHOUSE_ZONES[1],
      equipment: FORKLIFT_TYPES[0],
      shiftPattern: 'Mañana',
      licenseExpiry: '2027-12-31'
    });
    setIsAddOperatorOpen(true);
  };

  // APERTURA DE MODAL EDITAR
  const handleOpenEditModal = (op) => {
    setEditingOperator(op);
    setNewOp({
      name: op.name,
      zone: op.zone,
      equipment: op.equipment,
      shiftPattern: op.shiftPattern,
      licenseExpiry: op.licenseExpiry || '2027-12-31'
    });
    setIsAddOperatorOpen(true);
  };

  // GUARDAR (CREAR O EDITAR)
  const handleSaveOperator = (e) => {
    e.preventDefault();
    if (!newOp.name) return;

    if (editingOperator) {
      setOperators(prev => prev.map(op => 
        op.id === editingOperator.id ? { ...op, ...newOp } : op
      ));
    } else {
      const newId = `M-${100 + operators.length + 1}`;
      setOperators(prev => [...prev, { id: newId, ...newOp, status: 'Activo' }]);
    }

    setIsAddOperatorOpen(false);
    setEditingOperator(null);
  };

  // ELIMINAR OPERADOR
  const handleDeleteOperator = (operatorId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este montacargista?')) {
      setOperators(prev => prev.filter(op => op.id !== operatorId));
    }
  };

  const handleCreateVacationRequest = (e) => {
    e.preventDefault();
    const op = operators.find(o => o.id === newVac.operatorId);
    if (!op) return;

    const newReq = {
      id: vacationRequests.length + 1,
      operatorId: op.id,
      operatorName: op.name,
      startDate: newVac.startDate,
      endDate: newVac.endDate,
      type: newVac.type,
      status: 'Pendiente',
      reason: newVac.reason || 'Solicitud de ausencia'
    };

    setVacationRequests([newReq, ...vacationRequests]);
    setIsRequestVacationOpen(false);
    setNewVac({
      operatorId: operators[0]?.id || 'M-101',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      type: 'Vacaciones',
      reason: ''
    });
  };

  const handleVacationStatus = (id, newStatus) => {
    setVacationRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const isLicenseExpired = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  return (
    <div className="min-h-screen bg-[#021f12] text-emerald-50 font-sans pb-12">
      <header className="border-b border-emerald-800/60 bg-[#00471f]/90 backdrop-blur sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#006029] to-[#003818] border border-emerald-500/30 flex items-center justify-center relative shadow-md">
              <Truck className="w-5 h-5 text-emerald-200" />
              <Star className="w-4 h-4 text-red-600 fill-red-600 absolute -top-1 -right-1 filter drop-shadow" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide text-white flex items-center gap-2">
                ShiftForklift <span className="text-xs px-2 py-0.5 rounded bg-red-600 text-white font-bold tracking-wider">LOGÍSTICA</span>
              </h1>
              <p className="text-xs text-emerald-300/80">Gestión de Turnos y Vacaciones para Montacargistas</p>
            </div>
          </div>

          <nav className="hidden md:flex space-x-1 bg-[#02180d] p-1 rounded-xl border border-emerald-900">
            <button
              onClick={() => setActiveTab('scheduler')}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'scheduler' 
                  ? 'bg-emerald-600 text-white shadow' 
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-900/50'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Matriz</span>
            </button>
            <button
              onClick={() => setActiveTab('operators')}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'operators' 
                  ? 'bg-emerald-600 text-white shadow' 
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-900/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Personal ({operators.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('vacations')}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'vacations' 
                  ? 'bg-emerald-600 text-white shadow' 
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-900/50'
              }`}
            >
              <Palmtree className="w-4 h-4" />
              <span>Permisos</span>
              {vacationRequests.filter(r => r.status === 'Pendiente').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              )}
            </button>
          </nav>

          <div className="flex items-center space-x-2">
            <button 
              onClick={handleDownloadPNG}
              className="bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500/40 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 shadow-md transition"
              title="Descargar Horarios en Imagen PNG"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span className="hidden sm:inline">Descargar PNG</span>
            </button>
            <button 
              onClick={handleOpenAddModal}
              className="bg-red-600 hover:bg-red-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Operador</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* MATRIZ DE HORARIOS */}
        {activeTab === 'scheduler' && (
          <div className="space-y-5">
            <div className="bg-[#003818] border border-emerald-800/70 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center space-x-3">
                <button onClick={() => handleWeekChange('prev')} className="p-2 bg-[#022415] hover:bg-emerald-900 rounded-xl text-emerald-200 transition border border-emerald-800/60">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center space-x-2 bg-[#02180d] px-4 py-2 rounded-xl border border-emerald-900">
                  <CalendarIcon className="w-4 h-4 text-red-500" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    Semana: {weekDays[0].dayNumber} {weekDays[0].monthName} - {weekDays[6].dayNumber} {weekDays[6].monthName}
                  </span>
                </div>
                <button onClick={() => handleWeekChange('next')} className="p-2 bg-[#022415] hover:bg-emerald-900 rounded-xl text-emerald-200 transition border border-emerald-800/60">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button onClick={handleDownloadPNG} className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg transition">
                  <FileImage className="w-4 h-4" />
                  <span>Descargar Reporte PNG</span>
                </button>

                <div className="relative flex-1 min-w-[160px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                  <input
                    type="text"
                    placeholder="Buscar operador..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#02180d] border border-emerald-900 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="relative">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                  <select
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    className="bg-[#02180d] border border-emerald-900 rounded-xl pl-9 pr-8 py-2 text-xs text-emerald-200 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                  >
                    {WAREHOUSE_ZONES.map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#002812] border border-emerald-800/80 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-[#001f0d] border-b border-emerald-800/80">
                      <th className="py-3.5 px-4 text-left text-xs font-bold text-emerald-300 uppercase tracking-wider w-64">
                        Montacargista / Área
                      </th>
                      {weekDays.map((day) => (
                        <th key={day.dateStr} className={`py-3.5 px-2 text-center border-l border-emerald-900/60 ${day.isWeekend ? 'bg-red-950/20' : ''}`}>
                          <div className="text-xs font-bold text-emerald-200 uppercase">{day.dayName}</div>
                          <div className={`text-base font-extrabold ${day.isWeekend ? 'text-red-400' : 'text-white'}`}>
                            {day.dayNumber}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/50">
                    {filteredOperators.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-emerald-500">
                          No se encontraron montacargistas.
                        </td>
                      </tr>
                    ) : (
                      filteredOperators.map((op) => (
                        <tr key={op.id} className="hover:bg-[#003517]/50 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-bold text-sm text-white flex items-center gap-1.5">
                                {op.name}
                                {isLicenseExpired(op.licenseExpiry) && (
                                  <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
                                )}
                              </div>
                              <div className="text-xs text-emerald-400/80 font-medium">
                                {op.id} • <span className="text-emerald-300">{op.zone}</span>
                              </div>
                            </div>
                          </td>

                          {weekDays.map((day) => {
                            const shiftCode = scheduleData[`${op.id}_${day.dateStr}`] || 'DES';
                            const shift = SHIFT_TYPES[shiftCode] || SHIFT_TYPES.DES;
                            const IconComponent = shift.icon;

                            return (
                              <td key={day.dateStr} className={`p-1.5 text-center border-l border-emerald-900/40 ${day.isWeekend ? 'bg-red-950/10' : ''}`}>
                                <button
                                  onClick={() => setSelectedCell({ operatorId: op.id, dateStr: day.dateStr, currentShift: shiftCode })}
                                  className={`w-full py-2 px-1 rounded-xl border text-xs font-bold transition-all duration-150 flex flex-col items-center justify-center gap-0.5 shadow-sm hover:scale-105 ${shift.color}`}
                                >
                                  <IconComponent className="w-3.5 h-3.5" />
                                  <span>{shift.code}</span>
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECCIÓN MONTACARGISTAS CON EDICIÓN Y ELIMINACIÓN */}
        {activeTab === 'operators' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#003818] border border-emerald-800/70 rounded-2xl p-4">
              <div>
                <h2 className="text-lg font-bold text-white">Plantilla de Montacargistas</h2>
                <p className="text-xs text-emerald-300">Gestión de licencias, equipos asignados y zonas de trabajo</p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Nuevo Operador</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {operators.map(op => {
                const expired = isLicenseExpired(op.licenseExpiry);
                return (
                  <div key={op.id} className="bg-[#002812] border border-emerald-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                            {op.id}
                          </span>
                          <h3 className="text-base font-bold text-white mt-1">{op.name}</h3>
                        </div>
                        
                        {/* Botones de Editar y Eliminar */}
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenEditModal(op)}
                            className="p-1.5 bg-emerald-900/80 hover:bg-emerald-700 text-emerald-200 rounded-lg border border-emerald-700/60 transition"
                            title="Editar Montacargista"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOperator(op.id)}
                            className="p-1.5 bg-red-950/80 hover:bg-red-800 text-red-300 rounded-lg border border-red-800/60 transition"
                            title="Eliminar Montacargista"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs border-t border-emerald-900/80 pt-3 text-emerald-200">
                        <div className="flex justify-between">
                          <span className="text-emerald-400/80">Zona:</span>
                          <span className="font-semibold text-white">{op.zone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-400/80">Equipo:</span>
                          <span className="font-semibold text-white text-right">{op.equipment}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-400/80">Turno Base:</span>
                          <span className="font-semibold text-emerald-300">{op.shiftPattern}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-emerald-400/80">Venc. Licencia:</span>
                          <span className={`font-bold px-2 py-0.5 rounded ${
                            expired 
                              ? 'bg-red-900/80 text-red-200 border border-red-500/50' 
                              : 'bg-emerald-950 text-emerald-300'
                          }`}>
                            {op.licenseExpiry || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {expired && (
                      <div className="mt-4 p-2 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center gap-2 text-xs text-red-300">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span>Licencia vencida. Requiere recertificación.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECCIÓN PERMISOS */}
        {activeTab === 'vacations' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#003818] border border-emerald-800/70 rounded-2xl p-4">
              <div>
                <h2 className="text-lg font-bold text-white">Solicitudes de Vacaciones y Ausencias</h2>
                <p className="text-xs text-emerald-300">Control de permisos de montacargistas</p>
              </div>
              <button onClick={() => setIsRequestVacationOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md">
                <Plus className="w-4 h-4" />
                <span>Registrar Permiso / Vacaciones</span>
              </button>
            </div>

            <div className="bg-[#002812] border border-emerald-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#001f0d] border-b border-emerald-800/80 text-emerald-300 text-xs font-bold uppercase">
                      <th className="py-3.5 px-4">Operador</th>
                      <th className="py-3.5 px-4">Tipo</th>
                      <th className="py-3.5 px-4">Periodo</th>
                      <th className="py-3.5 px-4">Motivo</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/50 text-xs">
                    {vacationRequests.map(req => (
                      <tr key={req.id} className="hover:bg-[#003517]/50">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{req.operatorName}</div>
                          <div className="text-[10px] text-emerald-400">{req.operatorId}</div>
                        </td>
                        <td className="py-3.5 px-4">{req.type}</td>
                        <td className="py-3.5 px-4">{req.startDate} al {req.endDate}</td>
                        <td className="py-3.5 px-4">{req.reason}</td>
                        <td className="py-3.5 px-4">{req.status}</td>
                        <td className="py-3.5 px-4 text-center">
                          {req.status === 'Pendiente' && (
                            <div className="flex items-center justify-center space-x-2">
                              <button onClick={() => handleVacationStatus(req.id, 'Aprobado')} className="p-1.5 bg-emerald-700 text-white rounded-lg"><Check className="w-4 h-4"/></button>
                              <button onClick={() => handleVacationStatus(req.id, 'Rechazado')} className="p-1.5 bg-red-800 text-white rounded-lg"><X className="w-4 h-4"/></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL AGREGAR / EDITAR MONTACARGISTA */}
      {isAddOperatorOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#002e14] border border-emerald-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-red-500" />
                {editingOperator ? `Editar Montacargista (${editingOperator.id})` : 'Registrar Nuevo Montacargista'}
              </h3>
              <button onClick={() => setIsAddOperatorOpen(false)} className="text-emerald-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOperator} className="space-y-4 text-xs">
              <div>
                <label className="block text-emerald-300 font-bold mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Carlos Pérez"
                  value={newOp.name}
                  onChange={(e) => setNewOp({ ...newOp, name: e.target.value })}
                  className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-300 font-bold mb-1">Zona de Almacén</label>
                  <select
                    value={newOp.zone}
                    onChange={(e) => setNewOp({ ...newOp, zone: e.target.value })}
                    className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {WAREHOUSE_ZONES.filter(z => z !== 'Todas las zonas').map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-300 font-bold mb-1">Tipo de Montacargas</label>
                  <select
                    value={newOp.equipment}
                    onChange={(e) => setNewOp({ ...newOp, equipment: e.target.value })}
                    className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {FORKLIFT_TYPES.map(ft => (
                      <option key={ft} value={ft}>{ft}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-300 font-bold mb-1">Turno Predeterminado</label>
                  <select
                    value={newOp.shiftPattern}
                    onChange={(e) => setNewOp({ ...newOp, shiftPattern: e.target.value })}
                    className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Mañana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noche">Noche</option>
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-300 font-bold mb-1">Vencimiento Licencia DC-3</label>
                  <input
                    type="date"
                    required
                    value={newOp.licenseExpiry}
                    onChange={(e) => setNewOp({ ...newOp, licenseExpiry: e.target.value })}
                    className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddOperatorOpen(false)}
                  className="px-4 py-2 bg-emerald-950 text-emerald-300 rounded-xl font-bold hover:bg-emerald-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold"
                >
                  {editingOperator ? 'Guardar Cambios' : 'Guardar Montacargista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
