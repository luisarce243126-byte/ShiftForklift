import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ShieldCheck, 
  Truck, 
  Sun, 
  Sunrise, 
  Moon, 
  Coffee, 
  Palmtree, 
  Star, 
  Check, 
  X, 
  Info,
  Award,
  FileImage
} from 'lucide-react';

// Tipos de Turnos disponibles con estilo Heineken
const SHIFT_TYPES = {
  M: { code: 'M', label: 'Mañana', time: '06:00 - 14:00', color: 'bg-emerald-800/60 text-emerald-200 border-emerald-500/40 hover:bg-emerald-700/60', canvasColor: '#065f46', icon: Sunrise },
  T: { code: 'T', label: 'Tarde', time: '14:00 - 22:00', color: 'bg-amber-600/30 text-amber-300 border-amber-500/40 hover:bg-amber-600/40', canvasColor: '#d97706', icon: Sun },
  N: { code: 'N', label: 'Noche', time: '22:00 - 06:00', color: 'bg-indigo-900/60 text-indigo-200 border-indigo-500/40 hover:bg-indigo-800/60', canvasColor: '#3730a3', icon: Moon },
  DES: { code: 'DES', label: 'Descanso', time: 'Día Libre', color: 'bg-emerald-950 text-emerald-400 border-emerald-700/40 hover:bg-emerald-900', canvasColor: '#022c22', icon: Coffee },
  VAC: { code: 'VAC', label: 'Vacaciones', time: 'Periodo Vacacional', color: 'bg-purple-900/50 text-purple-200 border-purple-500/40 hover:bg-purple-800/50', canvasColor: '#6b21a8', icon: Palmtree },
  INC: { code: 'INC', label: 'Incapacidad', time: 'Licencia Médica', color: 'bg-red-900/60 text-red-200 border-red-500/40 hover:bg-red-800/60', canvasColor: '#991b1b', icon: AlertTriangle }
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
  const [isRequestVacationOpen, setIsRequestVacationOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);

  const [newOp, setNewOp] = useState({
    name: '',
    zone: WAREHOUSE_ZONES[1],
    equipment: FORKLIFT_TYPES[0],
    shiftPattern: 'Mañana',
    licenseExpiry: ''
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

  // GENERADOR Y DESCARGADOR DE IMAGEN PNG
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

    // Fondo Verde Botella Principal (Heineken Dark Emerald)
    ctx.fillStyle = '#022415';
    ctx.fillRect(0, 0, width, height);

    // Encabezado Verde Heineken Brillante
    ctx.fillStyle = '#005826';
    ctx.fillRect(0, 0, width, 95);

    // Dibujar Estrella Roja Heineken
    ctx.fillStyle = '#e31b23';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('★', 35, 60);

    // Título Principal en Blanco
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('PROGRAMACIÓN SEMANAL DE MONTACARGISTAS', 85, 45);

    // Subtítulo con fecha
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`Semana del ${weekDays[0].dayNumber} ${weekDays[0].monthName} al ${weekDays[6].dayNumber} ${weekDays[6].monthName} | Filtro: ${selectedZone}`, 85, 73);

    // Cabecera de Tabla
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

    // Filas de Operadores
    filteredOperators.forEach((op, rIdx) => {
      const y = tableTop + 45 + (rIdx * rowHeight);

      // Fondo de fila alternado
      ctx.fillStyle = rIdx % 2 === 0 ? '#043420' : '#022818';
      ctx.fillRect(30, y, width - 60, rowHeight - 4);
      
      // Borde de la fila
      ctx.strokeStyle = '#005826';
      ctx.lineWidth = 1;
      ctx.strokeRect(30, y, width - 60, rowHeight - 4);

      // Nombre del Operador
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(op.name, 45, y + 26);

      // Subtexto (ID y Zona)
      ctx.fillStyle = '#6ee7b7';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(`${op.id} • ${op.zone}`, 45, y + 46);

      // Celdas de Turnos
      weekDays.forEach((day, cIdx) => {
        const x = 330 + (cIdx * colWidth);
        const shiftCode = scheduleData[`${op.id}_${day.dateStr}`] || 'DES';
        const shiftConfig = SHIFT_TYPES[shiftCode] || SHIFT_TYPES.DES;

        // Tarjeta del Turno
        ctx.fillStyle = shiftConfig.canvasColor;
        const boxX = x + 8;
        const boxY = y + 10;
        const boxW = colWidth - 16;
        const boxH = 40;

        // Dibujar rectángulo redondeado
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        } else {
          ctx.fillRect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();

        // Código del turno
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(shiftCode, boxX + (boxW / 2), boxY + 24);
        ctx.textAlign = 'left';
      });
    });

    // Pie de Imagen
    const footerY = height - 25;
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('★ Generado por ShiftForklift - Control de Horarios y Rotación de Almacén', 35, footerY);

    // Descargar PNG
    const dataUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.download = `Horarios_Montacargas_${currentWeekStart}.png`;
    downloadLink.href = dataUrl;
    downloadLink.click();
  };

  const handleAddOperator = (e) => {
    e.preventDefault();
    if (!newOp.name) return;
    const newId = `M-${100 + operators.length + 1}`;
    setOperators([...operators, { id: newId, ...newOp, status: 'Activo' }]);
    setNewOp({ name: '', zone: WAREHOUSE_ZONES[1], equipment: FORKLIFT_TYPES[0], shiftPattern: 'Mañana', licenseExpiry: '' });
    setIsAddOperatorOpen(false);
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
      {/* HEADER DE ESTILO HEINEKEN */}
      <header className="border-b border-emerald-800/60 bg-[#00471f]/90 backdrop-blur sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Estrella Roja Heineken e Icono */}
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

          {/* Navegación */}
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
              <span>Matriz de Horarios</span>
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
              <span>Montacargistas ({operators.length})</span>
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
              <span>Vacaciones / Permisos</span>
              {vacationRequests.filter(r => r.status === 'Pendiente').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              )}
            </button>
          </nav>

          {/* Botones de Acción */}
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
              onClick={() => setIsAddOperatorOpen(true)}
              className="bg-red-600 hover:bg-red-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Operador</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">

        {/* 1. SECCIÓN MATRIZ DE HORARIOS */}
        {activeTab === 'scheduler' && (
          <div className="space-y-5">
            {/* HERRAMIENTAS Y EXPORTACIÓN */}
            <div className="bg-[#003818] border border-emerald-800/70 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-lg">
              
              {/* Navegación Semanal */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleWeekChange('prev')}
                  className="p-2 bg-[#022415] hover:bg-emerald-900 rounded-xl text-emerald-200 transition border border-emerald-800/60"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center space-x-2 bg-[#02180d] px-4 py-2 rounded-xl border border-emerald-900">
                  <CalendarIcon className="w-4 h-4 text-red-500" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    Semana: {weekDays[0].dayNumber} {weekDays[0].monthName} - {weekDays[6].dayNumber} {weekDays[6].monthName}
                  </span>
                </div>
                <button
                  onClick={() => handleWeekChange('next')}
                  className="p-2 bg-[#022415] hover:bg-emerald-900 rounded-xl text-emerald-200 transition border border-emerald-800/60"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Botón de Exportación Rápida a PNG y Filtros */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleDownloadPNG}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg transition"
                >
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

            {/* LEYENDA DE TURNOS */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#002e14]/60 p-3 rounded-xl border border-emerald-800/40 text-xs">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-red-500 fill-red-500" /> Claves de Turno Heineken:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {Object.values(SHIFT_TYPES).map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.code} className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] ${s.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span className="font-bold">{s.code}</span>
                      <span className="hidden sm:inline opacity-90">- {s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MATRIZ / TABLA */}
            <div className="bg-[#002e14] border border-emerald-800/80 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-[#01190e] border-b border-emerald-800/80 text-emerald-300 text-xs uppercase tracking-wider">
                      <th className="p-4 w-64 sticky left-0 bg-[#01190e] z-20">Montacargista / Zona</th>
                      {weekDays.map((day) => (
                        <th 
                          key={day.dateStr} 
                          className={`p-3 text-center border-l border-emerald-900 ${day.isWeekend ? 'bg-[#032616]' : ''}`}
                        >
                          <div className={day.isWeekend ? 'text-red-500 font-bold' : 'text-emerald-400 font-bold'}>{day.dayName}</div>
                          <div className="text-white text-sm font-bold">{day.dayNumber} {day.monthName}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/60 text-xs">
                    {filteredOperators.map((op) => {
                      const expired = isLicenseExpired(op.licenseExpiry);
                      return (
                        <tr key={op.id} className="hover:bg-emerald-900/30 transition">
                          
                          {/* Datos Operador */}
                          <td className="p-4 sticky left-0 bg-[#002913] border-r border-emerald-900 z-10">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-bold text-white text-sm flex items-center space-x-1.5">
                                  <span>{op.name}</span>
                                  {expired && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" title="Licencia Vencida" />
                                  )}
                                </div>
                                <div className="text-[11px] text-emerald-300 font-medium mt-0.5">{op.zone}</div>
                                <div className="text-[10px] text-emerald-500 flex items-center space-x-1 mt-1">
                                  <Truck className="w-3 h-3" />
                                  <span>{op.equipment}</span>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono bg-[#01190e] text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800">
                                {op.id}
                              </span>
                            </div>
                          </td>

                          {/* Celdas Semanales */}
                          {weekDays.map((day) => {
                            const key = `${op.id}_${day.dateStr}`;
                            const currentShiftCode = scheduleData[key] || 'DES';
                            const shiftInfo = SHIFT_TYPES[currentShiftCode] || SHIFT_TYPES.DES;
                            const ShiftIcon = shiftInfo.icon;

                            return (
                              <td 
                                key={day.dateStr} 
                                className={`p-2 border-l border-emerald-900/60 text-center ${
                                  day.isWeekend ? 'bg-[#01180d]/40' : ''
                                }`}
                              >
                                <button
                                  onClick={() => setSelectedCell({ operatorId: op.id, date: day.dateStr, currentShift: currentShiftCode, name: op.name })}
                                  className={`w-full py-2.5 px-1 rounded-xl border flex flex-col items-center justify-center transition-all hover:scale-[1.03] active:scale-95 shadow-sm ${shiftInfo.color}`}
                                >
                                  <ShiftIcon className="w-4 h-4 mb-1" />
                                  <span className="font-bold text-xs tracking-wider">{shiftInfo.code}</span>
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* COBERTURA DIARIA */}
                  <tfoot>
                    <tr className="bg-[#01190e] border-t border-emerald-800 font-semibold text-xs">
                      <td className="p-4 sticky left-0 bg-[#01190e] text-emerald-300 border-r border-emerald-900">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span>Operadores Activos:</span>
                        </div>
                      </td>
                      {weekDays.map((day) => {
                        const cov = dailyCoverage[day.dateStr] || { M:0, T:0, N:0 };
                        const totalActivos = cov.M + cov.T + cov.N;

                        return (
                          <td key={day.dateStr} className="p-3 text-center border-l border-emerald-900">
                            <span className="text-sm font-bold text-emerald-300">{totalActivos} Op.</span>
                            <div className="text-[10px] text-emerald-400 flex justify-center space-x-1 mt-1 font-mono">
                              <span title="Mañana">M:{cov.M}</span>
                              <span title="Tarde">T:{cov.T}</span>
                              <span title="Noche">N:{cov.N}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. OPERADORES */}
        {activeTab === 'operators' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#003818] p-4 rounded-2xl border border-emerald-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" /> Plantilla de Montacargistas
                </h2>
                <p className="text-xs text-emerald-300/80">Control de equipos y certificaciones de manejo.</p>
              </div>
              <button
                onClick={() => setIsAddOperatorOpen(true)}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Operador</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {operators.map((op) => {
                const expired = isLicenseExpired(op.licenseExpiry);
                return (
                  <div key={op.id} className="bg-[#002e14] border border-emerald-800 rounded-2xl p-5 hover:border-emerald-600 transition space-y-4 shadow-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-[#00471f] border border-emerald-600/40 flex items-center justify-center text-emerald-300 font-bold">
                          {op.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm">{op.name}</h3>
                          <span className="text-xs font-mono text-emerald-400">{op.id}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
                        {op.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs divide-y divide-emerald-900/60 pt-1">
                      <div className="flex justify-between py-1 text-emerald-200">
                        <span className="text-emerald-400">Zona de Trabajo:</span>
                        <span className="font-semibold text-white">{op.zone}</span>
                      </div>
                      <div className="flex justify-between py-1 text-emerald-200">
                        <span className="text-emerald-400">Maquinaria:</span>
                        <span className="font-medium">{op.equipment}</span>
                      </div>
                      <div className="flex justify-between py-1 text-emerald-200 items-center">
                        <span className="text-emerald-400">Vigencia Licencia DC-3:</span>
                        <span className={`font-mono ${expired ? 'text-red-400 font-bold' : 'text-emerald-200'}`}>
                          {op.licenseExpiry || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. VACACIONES */}
        {activeTab === 'vacations' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#003818] p-4 rounded-2xl border border-emerald-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Palmtree className="w-5 h-5 text-purple-400" /> Solicitudes de Vacaciones y Permisos
                </h2>
                <p className="text-xs text-emerald-300/80">Gestión de ausencias aprobadas.</p>
              </div>
              <button
                onClick={() => setIsRequestVacationOpen(true)}
                className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Solicitud</span>
              </button>
            </div>

            <div className="bg-[#002e14] border border-emerald-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#01190e] border-b border-emerald-800 text-emerald-300 uppercase tracking-wider">
                      <th className="p-4">Operador</th>
                      <th className="p-4">Tipo</th>
                      <th className="p-4">Periodo</th>
                      <th className="p-4">Motivo</th>
                      <th className="p-4 text-center">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900">
                    {vacationRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-emerald-900/30">
                        <td className="p-4 font-bold text-white">
                          <div>{req.operatorName}</div>
                          <span className="text-[10px] font-mono text-emerald-400">{req.operatorId}</span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg bg-purple-900/40 text-purple-300 border border-purple-600/30 font-medium">
                            {req.type}
                          </span>
                        </td>
                        <td className="p-4 text-emerald-200 font-mono">
                          {req.startDate} al {req.endDate}
                        </td>
                        <td className="p-4 text-emerald-300/80 max-w-xs truncate">{req.reason}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            req.status === 'Aprobado' 
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-600' 
                              : 'bg-red-950 text-red-400 border-red-600'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {req.status === 'Pendiente' && (
                            <>
                              <button
                                onClick={() => handleVacationStatus(req.id, 'Aprobado')}
                                className="p-1.5 bg-emerald-800/40 hover:bg-emerald-700/60 text-emerald-300 rounded-lg border border-emerald-600/40"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleVacationStatus(req.id, 'Rechazado')}
                                className="p-1.5 bg-red-800/40 hover:bg-red-700/60 text-red-300 rounded-lg border border-red-600/40"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
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

      {/* MODAL: CAMBIO DE TURNO */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#01140b]/80 backdrop-blur-sm">
          <div className="bg-[#002e14] border border-emerald-700 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Asignar Turno</h3>
                <p className="text-xs text-emerald-300">{selectedCell.name} — {selectedCell.date}</p>
              </div>
              <button onClick={() => setSelectedCell(null)} className="text-emerald-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {Object.values(SHIFT_TYPES).map((s) => {
                const Icon = s.icon;
                const isSelected = selectedCell.currentShift === s.code;
                return (
                  <button
                    key={s.code}
                    onClick={() => handleSetShift(selectedCell.operatorId, selectedCell.date, s.code)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${s.color} ${
                      isSelected ? 'ring-2 ring-red-500 scale-[1.02]' : 'opacity-90'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="w-5 h-5" />
                      <span className="font-bold text-sm">{s.code}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-xs">{s.label}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">{s.time}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO OPERADOR */}
      {isAddOperatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#01140b]/80 backdrop-blur-sm">
          <div className="bg-[#002e14] border border-emerald-700 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Alta de Montacargista</h3>
              </div>
              <button onClick={() => setIsAddOperatorOpen(false)} className="text-emerald-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOperator} className="space-y-4 text-xs">
              <div>
                <label className="block text-emerald-300 font-semibold mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={newOp.name}
                  onChange={(e) => setNewOp({ ...newOp, name: e.target.value })}
                  className="w-full bg-[#01190e] border border-emerald-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-300 font-semibold mb-1">Zona</label>
                  <select
                    value={newOp.zone}
                    onChange={(e) => setNewOp({ ...newOp, zone: e.target.value })}
                    className="w-full bg-[#01190e] border border-emerald-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {WAREHOUSE_ZONES.filter(z => z !== 'Todas las zonas').map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-300 font-semibold mb-1">Tipo de Montacargas</label>
                  <select
                    value={newOp.equipment}
                    onChange={(e) => setNewOp({ ...newOp, equipment: e.target.value })}
                    className="w-full bg-[#01190e] border border-emerald-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {FORKLIFT_TYPES.map(eq => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-300 font-semibold mb-1">Turno Base</label>
                  <select
                    value={newOp.shiftPattern}
                    onChange={(e) => setNewOp({ ...newOp, shiftPattern: e.target.value })}
                    className="w-full bg-[#01190e] border border-emerald-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Mañana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noche">Noche</option>
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-300 font-semibold mb-1">Vencimiento Licencia</label>
                  <input
                    type="date"
                    required
                    value={newOp.licenseExpiry}
                    onChange={(e) => setNewOp({ ...newOp, licenseExpiry: e.target.value })}
                    className="w-full bg-[#01190e] border border-emerald-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-emerald-800">
                <button
                  type="button"
                  onClick={() => setIsAddOperatorOpen(false)}
                  className="px-4 py-2 bg-[#01190e] text-emerald-300 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg"
                >
                  Guardar Operador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR VACACIONES */}
      {isRequestVacationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#01140b]/80 backdrop-blur-sm">
          <div className="bg-[#002e14] border border-emerald-700 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
              <div className="flex items-center space-x-2">
                <Palmtree className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">Registrar Permiso</h3>
              </div>
              <button onClick={() => setIsRequestVacationOpen(false)} className="text-emerald-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target;
              const opId = form.operatorId.value;
              const op = operators.find(o => o.id === opId);
              setVacationRequests([{
                id: Date.now(),
                operatorId: opId,
                operatorName: op ? op.name : 'Operador',
                startDate: form.startDate.value,
                endDate: form.endDate.value,
                type: form.type.value,
                status: 'Pendiente',
                reason: form.reason.value
              }, ...vacationRequests]);
              setIsRequestVacationOpen(false);
            }} className="space-y-4 text-xs">
              <div>
                <label className="block text-emerald-300 font-semibold mb-1">Montacargista</label>
                <select name="operatorId" required className="w-full bg-[#01190e] border border-emerald-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500">
                  {operators.map(op => (
                    <option key={op.id} value={op.id}>{op.name} ({op.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-emerald-300 font-semibold mb-1">Tipo de Permiso</label>
                <select name="type" className="w-full bg-[#01190e] border border-emerald-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500">
                  <option value="Vacaciones">Vacaciones Anuales</option>
                  <option value="Día de Descanso Especial">Día de Descanso Especial</option>
                  <option value="Incapacidad Médica">Incapacidad Médica</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-300 font-semibold mb-1">Inicio</label>
                  <input type="date" name="startDate" required className="w-full bg-[#01190e] border border-emerald-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-emerald-300 font-semibold mb-1">Fin</label>
                  <input type="date" name="endDate" required className="w-full bg-[#01190e] border border-emerald-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              <div>
                <label className="block text-emerald-300 font-semibold mb-1">Motivo</label>
                <textarea name="reason" rows={2} className="w-full bg-[#01190e] border border-emerald-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-emerald-800">
                <button type="button" onClick={() => setIsRequestVacationOpen(false)} className="px-4 py-2 bg-[#01190e] text-emerald-300 font-semibold rounded-xl">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-xl shadow-lg">
                  Enviar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```eof
