```react
import React, { useState, useEffect, useMemo } from 'react';
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
  Layers
} from 'lucide-react';

// Tipos de Turnos disponibles con nombres simplificados (sin horas)
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

    // Fondo Verde Botella Principal
    ctx.fillStyle = '#022415';
    ctx.fillRect(0, 0, width, height);

    // Encabezado Verde Heineken Brillante
    ctx.fillStyle = '#005826';
    ctx.fillRect(0, 0, width, 95);

    // Dibujar Estrella Roja
    ctx.fillStyle = '#e31b23';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('★', 35, 60);

    // Título Principal
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

  const handleAddOperator = (e) => {
    e.preventDefault();
    if (!newOp.name) return;
    const newId = `M-${100 + operators.length + 1}`;
    setOperators([...operators, { id: newId, ...newOp, status: 'Activo' }]);
    setNewOp({ name: '', zone: WAREHOUSE_ZONES[1], equipment: FORKLIFT_TYPES[0], shiftPattern: 'Mañana', licenseExpiry: '2027-12-31' });
    setIsAddOperatorOpen(false);
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
      {/* HEADER DE ESTILO HEINEKEN */}
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

      {/* BARRA MÓVIL DE NAVEGACIÓN */}
      <div className="md:hidden flex bg-[#02180d] p-2 border-b border-emerald-900 justify-around">
        <button
          onClick={() => setActiveTab('scheduler')}
          className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-lg ${
            activeTab === 'scheduler' ? 'bg-emerald-600 text-white' : 'text-emerald-400'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Matriz</span>
        </button>
        <button
          onClick={() => setActiveTab('operators')}
          className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-lg ${
            activeTab === 'operators' ? 'bg-emerald-600 text-white' : 'text-emerald-400'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Personal</span>
        </button>
        <button
          onClick={() => setActiveTab('vacations')}
          className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-lg ${
            activeTab === 'vacations' ? 'bg-emerald-600 text-white' : 'text-emerald-400'
          }`}
        >
          <Palmtree className="w-3.5 h-3.5" />
          <span>Permisos</span>
        </button>
      </div>

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
              <div className="flex
