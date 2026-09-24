import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { redis } from './db';
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
  FileText,
  Image as ImageIcon,
  Pencil,
  Trash2,
  Lock,
  LogOut,
  UserCheck,
  ShieldCheck,
  Layers,
  Loader2,
  Bell,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  History,
  Activity,
  Undo2,
  Info,
  FilterX,
  UserPlus,
  ArrowRightLeft,
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  CalendarDays,
  Users2
} from 'lucide-react';

const MOCK_USERS = [
  { id: 1, email: 'admin@empresa.com', pass: '123456', name: 'Administrador General', role: 'Admin' },
  { id: 2, email: 'supervisor@empresa.com', pass: '123456', name: 'Supervisor Logística', role: 'Supervisor' },
  { id: 3, email: 'operador@empresa.com', pass: '123456', name: 'Carlos Mendoza (Operador)', role: 'Operador' }
];

const SHIFT_TYPES = {
  M: { code: 'M', label: 'Mañana', color: 'bg-emerald-800/80 text-emerald-100 border-emerald-500/50 hover:bg-emerald-700/90', icon: Sunrise },
  T: { code: 'T', label: 'Tarde', color: 'bg-amber-600/40 text-amber-200 border-amber-500/50 hover:bg-amber-600/60', icon: Sun },
  N: { code: 'N', label: 'Noche', color: 'bg-indigo-900/80 text-indigo-100 border-indigo-500/50 hover:bg-indigo-800/90', icon: Moon },
  DES: { code: 'DES', label: 'Descanso', color: 'bg-emerald-950 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900', icon: Coffee },
  VAC: { code: 'VAC', label: 'Vacaciones', color: 'bg-purple-900/70 text-purple-200 border-purple-500/50 hover:bg-purple-800/70', icon: Palmtree },
  INC: { code: 'INC', label: 'Incapacidad', color: 'bg-red-900/80 text-red-200 border-red-500/50 hover:bg-red-800/80', icon: AlertTriangle }
};

const WAREHOUSE_ZONES = [
  'Todas las zonas',
  'Recepción / Carga',
  'Pasillos Alta Montaña (Reach)',
  'Embarques / Surtido',
  'Materiales / Entrada a Línea',
  'Patio de Contenedores'
];

const FORKLIFT_TYPES = [
  'Hombre Sentado (Eléctrico)',
  'Hombre Parado (Reach)',
  'Trilateral / Pasillo Angosto',
  'Transpaleta Eléctrica (Rider)'
];

const ABSENCE_TYPES = [
  'Vacaciones',
  'Incapacidad',
  'Día de Descanso Especial',
  'Permiso Personal'
];

const SHIFT_WINDOWS = {
  M: { start: 7 * 60,        end: 15 * 60,           label: '07:00 - 15:00' },
  T: { start: 15 * 60,       end: 22 * 60 + 30,      label: '15:00 - 22:30' },
  N: { start: 22 * 60 + 30,  end: 24 * 60 + 7 * 60,  label: '22:30 - 07:00' }
};

// ✅ Horas por turno (para el módulo de nómina)
const SHIFT_HOURS = { M: 8, T: 8, N: 8.5, DES: 0, VAC: 0, INC: 0 };

const getShiftCodeForDate = (date) => {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  if (totalMinutes >= SHIFT_WINDOWS.M.start && totalMinutes < SHIFT_WINDOWS.M.end) return 'M';
  if (totalMinutes >= SHIFT_WINDOWS.T.start && totalMinutes < SHIFT_WINDOWS.T.end) return 'T';
  return 'N';
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 30000;
const UNDO_WINDOW_MS = 5000;

const formatDateLocal = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatTimeLocal = (date) => {
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const getMondayOfCurrentWeek = (refDate = new Date()) => {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatDateLocal(d);
};

const getLicenseStatusStyle = (expiryDateStr) => {
  if (!expiryDateStr) return 'bg-emerald-950 text-emerald-300 border-emerald-800';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(expiryDateStr + 'T00:00:00');
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'bg-red-950 text-red-300 border-red-700/80 font-bold';
  } else if (diffDays <= 30) {
    return 'bg-amber-950 text-amber-300 border-amber-600/80 font-bold';
  } else {
    return 'bg-emerald-950 text-emerald-300 border-emerald-800';
  }
};

const INDICATOR_ACCENTS = {
  emerald: { bg: 'bg-emerald-950/70', border: 'border-emerald-700/60', text: 'text-emerald-300', value: 'text-emerald-100' },
  amber:   { bg: 'bg-amber-950/70',   border: 'border-amber-700/60',   text: 'text-amber-300',   value: 'text-amber-100' },
  indigo:  { bg: 'bg-indigo-950/70',  border: 'border-indigo-700/60',  text: 'text-indigo-300',  value: 'text-indigo-100' },
  slate:   { bg: 'bg-slate-900/70',   border: 'border-slate-700/60',   text: 'text-slate-300',   value: 'text-slate-100' },
  purple:  { bg: 'bg-purple-950/70',  border: 'border-purple-700/60',  text: 'text-purple-300',  value: 'text-purple-100' },
  red:     { bg: 'bg-red-950/70',     border: 'border-red-700/60',     text: 'text-red-300',     value: 'text-red-100' },
  cyan:    { bg: 'bg-cyan-950/70',    border: 'border-cyan-700/60',    text: 'text-cyan-300',    value: 'text-cyan-100' }
};

function MiniIndicator({ icon: Icon, label, value, accent = 'emerald', subtitle = null }) {
  const c = INDICATOR_ACCENTS[accent] || INDICATOR_ACCENTS.emerald;
  return (
    <div className={`flex items-center gap-2 rounded-lg border ${c.bg} ${c.border} px-2.5 py-1.5`}>
      <Icon className={`w-3.5 h-3.5 ${c.text} shrink-0`} />
      <div className="min-w-0 flex-1">
        <div className={`text-[9px] font-bold uppercase tracking-wider ${c.text} leading-none`}>{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-base font-extrabold ${c.value} leading-none`}>{value}</span>
          {subtitle && <span className={`text-[9px] ${c.text} opacity-70 leading-none`}>{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

const TOAST_STYLES = {
  success: { bg: 'bg-emerald-900 border-emerald-500/60', text: 'text-emerald-100', icon: CheckCircle2, iconColor: 'text-emerald-400' },
  error:   { bg: 'bg-red-900 border-red-500/60',         text: 'text-red-100',     icon: AlertCircle,   iconColor: 'text-red-400' },
  info:    { bg: 'bg-slate-800 border-slate-500/60',     text: 'text-slate-100',   icon: Info,          iconColor: 'text-slate-400' },
  warning: { bg: 'bg-amber-900 border-amber-500/60',     text: 'text-amber-100',   icon: AlertTriangle, iconColor: 'text-amber-400' }
};

function Toast({ toast, onDismiss, onUndo }) {
  const s = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  const Icon = s.icon;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl ${s.bg} ${s.text} min-w-[280px] max-w-md`}>
      <Icon className={`w-4 h-4 ${s.iconColor} shrink-0`} />
      <span className="text-xs font-semibold flex-1">{toast.message}</span>
      {toast.undoAction && (
        <button
          onClick={onUndo}
          className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition flex items-center gap-1"
        >
          <Undo2 className="w-3 h-3" />
          Deshacer
        </button>
      )}
      <button onClick={onDismiss} className="text-white/60 hover:text-white shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ✅ Calcula horas y conteo de días en un rango para un operador
const calcHoursInRange = (operatorId, fromDate, toDate, scheduleData) => {
  const days = { M: 0, T: 0, N: 0, DES: 0, VAC: 0, INC: 0 };
  let total = 0;
  if (!fromDate || !toDate) return { total: 0, days };
  const start = new Date(fromDate + 'T00:00:00');
  const end = new Date(toDate + 'T00:00:00');
  const curr = new Date(start);
  while (curr <= end) {
    const key = `${operatorId}_${formatDateLocal(curr)}`;
    const code = scheduleData[key];
    if (code && SHIFT_HOURS[code] !== undefined) {
      total += SHIFT_HOURS[code];
      days[code] = (days[code] || 0) + 1;
    }
    curr.setDate(curr.getDate() + 1);
  }
  return { total, days };
};

// ✅ Encuentra candidatos para cubrir un turno
const getSuitableReplacements = (targetOperatorId, dateStr, shiftCode, operators, scheduleData, lockedCells) => {
  const target = operators.find(o => o.id === targetOperatorId);
  if (!target) return [];

  // Fecha objetivo y día de la semana (para horas semanales)
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  const dayOfWeek = targetDate.getDay();
  const monday = new Date(targetDate);
  const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  monday.setDate(diff);

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    weekDates.push(formatDateLocal(dd));
  }

  return operators
    .filter(op => op.id !== targetOperatorId)
    .filter(op => {
      const key = `${op.id}_${dateStr}`;
      const code = scheduleData[key];
      // Solo operadores libres ese día
      if (lockedCells.has(key)) return false;
      if (code && code !== 'DES') return false;
      return true;
    })
    .map(op => {
      let score = 0;
      const reasons = [];

      if (op.zone === target.zone) { score += 50; reasons.push('Misma zona'); }
      if (op.equipment === target.equipment) { score += 30; reasons.push('Mismo equipo'); }

      // Horas de la semana con el nuevo turno
      let weekHours = 0;
      weekDates.forEach(date => {
        const key = `${op.id}_${date}`;
        if (date === dateStr) {
          weekHours += SHIFT_HOURS[shiftCode] || 0;
        } else {
          const c = scheduleData[key];
          if (c && SHIFT_HOURS[c] !== undefined) weekHours += SHIFT_HOURS[c];
        }
      });

      // Penalizar si excede 48h
      if (weekHours > 48) {
        score -= 40;
        reasons.push(`${weekHours.toFixed(1)}h excede 48h`);
      } else if (weekHours > 40) {
        score -= 10;
        reasons.push(`${weekHours.toFixed(1)}h esta semana`);
      } else {
        reasons.push(`${weekHours.toFixed(1)}h esta semana`);
      }

      // Licencia vigente
      if (op.licenseExpiry) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(op.licenseExpiry + 'T00:00:00');
        const days = Math.ceil((exp - today) / 86400000);
        if (days < 0) {
          score -= 100;
          reasons.push('Licencia vencida');
        } else if (days <= 30) {
          score -= 15;
          reasons.push(`Licencia vence en ${days}d`);
        }
      }

      return { ...op, score, reasons, weekHours };
    })
    .sort((a, b) => b.score - a.score);
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  const [syncStatus, setSyncStatus] = useState('idle');
  const syncStatusTimeoutRef = useRef(null);

  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type, message, options = {}) => {
    const id = ++toastIdRef.current;
    const duration = options.duration ?? (options.undoAction ? UNDO_WINDOW_MS : 3000);
    const toast = { id, type, message, undoAction: options.undoAction || null };
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const [flashCells, setFlashCells] = useState(new Set());
  const flashCellsTimeoutRef = useRef(null);
  const triggerFlash = useCallback((keys) => {
    setFlashCells(new Set(keys));
    if (flashCellsTimeoutRef.current) clearTimeout(flashCellsTimeoutRef.current);
    flashCellsTimeoutRef.current = setTimeout(() => setFlashCells(new Set()), 900);
  }, []);

  const reportSyncResult = (ok) => {
    setSyncStatus(ok ? 'saved' : 'error');
    if (syncStatusTimeoutRef.current) clearTimeout(syncStatusTimeoutRef.current);
    syncStatusTimeoutRef.current = setTimeout(() => setSyncStatus('idle'), ok ? 2000 : 4000);
  };

  const [showLicenseAlerts, setShowLicenseAlerts] = useState(true);
  const [vacDateError, setVacDateError] = useState('');

  const [activeTab, setActiveTab] = useState('scheduler');

  const [operators, setOperators] = useState([]);
  const [scheduleData, setScheduleData] = useState({});
  const [vacationRequests, setVacationRequests] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  const isUpdatingRef = useRef(false);
  const scheduleRef = useRef(null);

  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMondayOfCurrentWeek());
  const [applyToFullWeek, setApplyToFullWeek] = useState(false);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportMenuRef = useRef(null);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(tick);
  }, []);

  // ✅ Estado para reasignación
  const [reassignModal, setReassignModal] = useState(null); // { operatorId, dateStr }
  const [reassignShift, setReassignShift] = useState('M');

  // ✅ Estado para módulo de horas
  const [hoursStart, setHoursStart] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [hoursEnd, setHoursEnd] = useState(() => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return formatDateLocal(last);
  });
  const [hoursZoneFilter, setHoursZoneFilter] = useState('Todas las zonas');

  useEffect(() => {
    if (!lockoutUntil) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(remaining);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setLoginAttempts(0);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadExportLibraries = async () => {
    if (!window.html2canvas) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    if (!window.jspdf) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  };

  const handleExport = async (format) => {
    if (!scheduleRef.current) return;
    setIsExporting(true);
    setShowExportMenu(false);

    try {
      await loadExportLibraries();
      const element = scheduleRef.current;
      const canvas = await window.html2canvas(element, {
        scale: 2,
        backgroundColor: '#002812',
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth + 80
      });
      const fileName = `Horario_Semanal_${currentWeekStart}`;

      if (format === 'png') {
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `${fileName}.png`;
        link.click();
      } else if (format === 'jpg') {
        const image = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.href = image;
        link.download = `${fileName}.jpg`;
        link.click();
      } else if (format === 'pdf') {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.setFillColor(2, 31, 18);
        pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.text('ShiftForklift - Reporte de Programación de Turnos', 12, 12);
        pdf.setFontSize(9);
        pdf.setTextColor(167, 243, 208);
        const dateRangeText = `Plan Semanal: ${weekDays[0].dayNumber} ${weekDays[0].monthName} - ${weekDays[6].dayNumber} ${weekDays[6].monthName} | Filtro: ${selectedZone}`;
        pdf.text(dateRangeText, 12, 18);
        const imgWidth = pdfWidth - 24;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let positionY = 22;
        const maxHeight = pdfHeight - 32;
        if (imgHeight <= maxHeight) {
          pdf.addImage(imgData, 'PNG', 12, positionY, imgWidth, imgHeight);
        } else {
          const scaleFactor = maxHeight / imgHeight;
          const adjustedWidth = imgWidth * scaleFactor;
          const adjustedHeight = imgHeight * scaleFactor;
          const xOffset = (pdfWidth - adjustedWidth) / 2;
          pdf.addImage(imgData, 'PNG', xOffset, positionY, adjustedWidth, adjustedHeight);
        }
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Exportado el: ${new Date().toLocaleString('es-MX')} por ${currentUser?.name || 'Usuario'}`, 12, pdfHeight - 5);
        pdf.save(`${fileName}.pdf`);
      }
      pushToast('success', `Horario exportado como ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error al exportar horario:', error);
      pushToast('error', 'No se pudo generar la descarga.');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const checkWeekChange = () => {
      const actualMonday = getMondayOfCurrentWeek();
      if (actualMonday !== currentWeekStart) {
        setCurrentWeekStart(actualMonday);
      }
    };
    const interval = setInterval(checkWeekChange, 60000);
    window.addEventListener('focus', checkWeekChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkWeekChange);
    };
  }, [currentWeekStart]);

  const loadCloudData = async () => {
    setIsLoaded(false);
    setLoadError('');
    try {
      const [savedOps, savedSchedule, savedVac] = await Promise.all([
        redis.get('sf_operators'),
        redis.get('sf_scheduleData'),
        redis.get('sf_vacations'),
      ]);
      setOperators(Array.isArray(savedOps) ? savedOps : []);
      setScheduleData(savedSchedule && typeof savedSchedule === 'object' ? savedSchedule : {});
      setVacationRequests(Array.isArray(savedVac) ? savedVac : []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setLoadError('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadCloudData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoaded || loadError) return;
    const interval = setInterval(async () => {
      if (isUpdatingRef.current) return;
      try {
        const [savedOps, savedSchedule, savedVac] = await Promise.all([
          redis.get('sf_operators'),
          redis.get('sf_scheduleData'),
          redis.get('sf_vacations'),
        ]);
        if (!isUpdatingRef.current) {
          if (Array.isArray(savedOps)) setOperators(savedOps);
          if (savedSchedule && typeof savedSchedule === 'object') setScheduleData(savedSchedule);
          if (Array.isArray(savedVac)) setVacationRequests(savedVac);
        }
      } catch (err) {
        console.error('Error en sincronización continua:', err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isLoaded, loadError]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('Todas las zonas');
  const [selectedEquipment, setSelectedEquipment] = useState('Todos los equipos');
  const [onlyExpiringLicenses, setOnlyExpiringLicenses] = useState(false);

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
    operatorId: '',
    startDate: formatDateLocal(new Date()),
    endDate: formatDateLocal(new Date(Date.now() + 86400000 * 5)),
    type: 'Vacaciones',
    reason: ''
  });

  const weekDays = useMemo(() => {
    const days = [];
    const [year, month, day] = currentWeekStart.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      days.push({
        dateStr: formatDateLocal(d),
        dayName: dayNames[d.getDay()],
        dayNumber: d.getDate(),
        monthName: d.toLocaleDateString('es-ES', { month: 'short' }),
        isWeekend: d.getDay() === 0 || d.getDay() === 6
      });
    }
    return days;
  }, [currentWeekStart]);

  const isHistoricalWeek = useMemo(() => {
    const currentMonday = getMondayOfCurrentWeek();
    return currentWeekStart < currentMonday;
  }, [currentWeekStart]);

  const isCurrentWeek = useMemo(() => {
    return currentWeekStart === getMondayOfCurrentWeek();
  }, [currentWeekStart]);

  const activeShiftCode = useMemo(() => getShiftCodeForDate(now), [now]);

  const statsDateStr = useMemo(() => {
    if (isCurrentWeek) return formatDateLocal(now);
    return weekDays[0]?.dateStr || formatDateLocal(now);
  }, [isCurrentWeek, now, weekDays]);

  const statsDateLabel = useMemo(() => {
    if (isCurrentWeek) return 'HOY';
    return `Lun ${weekDays[0]?.dayNumber} ${weekDays[0]?.monthName}`;
  }, [isCurrentWeek, weekDays]);

  const shiftStats = useMemo(() => {
    const stats = { M: 0, T: 0, N: 0, DES: 0, VAC: 0, INC: 0, total: operators.length };
    operators.forEach(op => {
      const code = scheduleData[`${op.id}_${statsDateStr}`] || 'DES';
      if (stats[code] !== undefined) stats[code]++;
    });
    stats.active = stats.M + stats.T + stats.N;
    stats.absent = stats.VAC + stats.INC;
    return stats;
  }, [operators, scheduleData, statsDateStr]);

  const lockedCells = useMemo(() => {
    const locked = new Set();
    vacationRequests
      .filter(r => r.status === 'Aprobado')
      .forEach(req => {
        const [sY, sM, sD] = req.startDate.split('-').map(Number);
        const [eY, eM, eD] = req.endDate.split('-').map(Number);
        let curr = new Date(sY, sM - 1, sD);
        const end = new Date(eY, eM - 1, eD);
        while (curr <= end) {
          locked.add(`${req.operatorId}_${formatDateLocal(curr)}`);
          curr.setDate(curr.getDate() + 1);
        }
      });
    return locked;
  }, [vacationRequests]);

  const lockedCellsInView = useMemo(() => {
    let count = 0;
    operators.forEach(op => {
      weekDays.forEach(day => {
        if (lockedCells.has(`${op.id}_${day.dateStr}`)) count++;
      });
    });
    return count;
  }, [operators, weekDays, lockedCells]);

  const canEditCell = (operatorId, dateStr) => {
    if (!canEditShifts) return false;
    if (isHistoricalWeek) return false;
    if (lockedCells.has(`${operatorId}_${dateStr}`)) return false;
    return true;
  };

  const detectConflicts = (operatorId, dateStr, newShiftCode, isFullWeek = false) => {
    const conflicts = [];
    const currentCode = scheduleData[`${operatorId}_${dateStr}`];
    const op = operators.find(o => o.id === operatorId);

    if (currentCode === newShiftCode && !isFullWeek) return conflicts;

    if (lockedCells.has(`${operatorId}_${dateStr}`)) {
      conflicts.push(`La celda ya está bloqueada por una ausencia aprobada de ${op?.name || operatorId}.`);
      return conflicts;
    }

    if (['M', 'T', 'N'].includes(newShiftCode)) {
      const weekDates = weekDays.map(d => d.dateStr);
      let weeklyHours = 0;
      let newShiftHours = 8;
      if (newShiftCode === 'N') newShiftHours = 8.5;

      weekDates.forEach(date => {
        const key = `${operatorId}_${date}`;
        const code = date === dateStr ? newShiftCode : scheduleData[key];
        if (code === 'M' || code === 'T') weeklyHours += 8;
        else if (code === 'N') weeklyHours += 8.5;
      });

      if (weeklyHours + newShiftHours > 48) {
        conflicts.push(`${op?.name || operatorId} tendría ${(weeklyHours + newShiftHours).toFixed(1)}h esta semana (límite 48h).`);
      }
    }

    if (newShiftCode === 'N' && !isFullWeek) {
      const currentIdx = weekDays.findIndex(d => d.dateStr === dateStr);
      if (currentIdx >= 0) {
        let consecutiveN = 1;
        for (let i = currentIdx - 1; i >= 0; i--) {
          const code = scheduleData[`${operatorId}_${weekDays[i].dateStr}`];
          if (code === 'N') consecutiveN++;
          else break;
        }
        for (let i = currentIdx + 1; i < 7; i++) {
          const code = scheduleData[`${operatorId}_${weekDays[i].dateStr}`];
          if (code === 'N') consecutiveN++;
          else break;
        }
        if (consecutiveN > 5) {
          conflicts.push(`${op?.name || operatorId} tendría ${consecutiveN} noches consecutivas (máximo recomendado: 5).`);
        }
      }
    }

    return conflicts;
  };

  useEffect(() => {
    if (!isLoaded || isUpdatingRef.current) return;
    if (operators.length === 0) return;
    if (isHistoricalWeek) return;

    const newSchedule = { ...scheduleData };
    let changed = false;

    operators.forEach((op) => {
      weekDays.forEach((day, idx) => {
        const key = `${op.id}_${day.dateStr}`;
        if (lockedCells.has(key)) return;
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
      redis.set('sf_scheduleData', newSchedule).catch(console.error);
    }
  }, [operators, weekDays, isLoaded, isHistoricalWeek, lockedCells]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (lockoutUntil && Date.now() < lockoutUntil) return;

    const email = loginEmail.trim().toLowerCase();
    const user = MOCK_USERS.find(u => u.email.toLowerCase() === email && u.pass === loginPass);

    if (user) {
      setCurrentUser(user);
      setLoginError('');
      setLoginAttempts(0);
      setLoginPass('');
      try { sessionStorage.setItem('sf_session', JSON.stringify(user)); } catch (err) { /* no-op */ }
      pushToast('success', `Bienvenido, ${user.name}`);
    } else {
      const attempts = loginAttempts + 1;
      setLoginAttempts(attempts);
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_MS);
        setLoginError(`Demasiados intentos fallidos. Espera ${LOCKOUT_MS / 1000}s para volver a intentar.`);
      } else {
        setLoginError(`Correo o contraseña incorrectos. (${MAX_LOGIN_ATTEMPTS - attempts} intento(s) restante(s))`);
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try { sessionStorage.removeItem('sf_session'); } catch (err) { /* no-op */ }
  };

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('sf_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        const stillValid = MOCK_USERS.some(u => u.id === parsed.id && u.email === parsed.email);
        if (stillValid) setCurrentUser(parsed);
      }
    } catch (err) { /* no-op */ }
  }, []);

  const canEditShifts = currentUser && ['Admin', 'Supervisor'].includes(currentUser.role);
  const canManageOperators = currentUser && currentUser.role === 'Admin';
  const canApproveVacations = currentUser && ['Admin', 'Supervisor'].includes(currentUser.role);
  const canViewHours = currentUser && ['Admin', 'Supervisor'].includes(currentUser.role);
  const canViewReports = currentUser && ['Admin', 'Supervisor'].includes(currentUser.role);

  const licenseAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return operators
      .map(op => {
        if (!op.licenseExpiry) return null;
        const expiry = new Date(op.licenseExpiry + 'T00:00:00');
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) return null;
        return { ...op, diffDays, expired: diffDays < 0 };
      })
      .filter(Boolean)
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [operators]);

  const filteredOperators = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return operators.filter(op => {
      const matchesSearch = op.name.toLowerCase().includes(searchQuery.toLowerCase()) || op.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesZone = selectedZone === 'Todas las zonas' || op.zone === selectedZone;
      const matchesEquipment = selectedEquipment === 'Todos los equipos' || op.equipment === selectedEquipment;
      let matchesExpiring = true;
      if (onlyExpiringLicenses) {
        if (!op.licenseExpiry) matchesExpiring = false;
        else {
          const expiry = new Date(op.licenseExpiry + 'T00:00:00');
          const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          matchesExpiring = diffDays <= 30;
        }
      }
      return matchesSearch && matchesZone && matchesEquipment && matchesExpiring;
    });
  }, [operators, searchQuery, selectedZone, selectedEquipment, onlyExpiringLicenses]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedZone !== 'Todas las zonas') count++;
    if (selectedEquipment !== 'Todos los equipos') count++;
    if (onlyExpiringLicenses) count++;
    return count;
  }, [searchQuery, selectedZone, selectedEquipment, onlyExpiringLicenses]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedZone('Todas las zonas');
    setSelectedEquipment('Todos los equipos');
    setOnlyExpiringLicenses(false);
    pushToast('info', 'Filtros limpiados');
  };

  const handleSetShift = async (operatorId, dateStr, shiftCode, isFullWeek = false) => {
    if (!canEditShifts) return;
    if (isHistoricalWeek) return;
    const clickedKey = `${operatorId}_${dateStr}`;
    if (lockedCells.has(clickedKey)) return;

    const conflicts = detectConflicts(operatorId, dateStr, shiftCode, isFullWeek);
    if (conflicts.length > 0) {
      pushToast('warning', conflicts[0], { duration: 5000 });
      return;
    }

    const previousSchedule = { ...scheduleData };
    const previousValue = scheduleData[clickedKey];
    const newValue = shiftCode;

    if (previousValue === newValue && !isFullWeek) {
      setSelectedCell(null);
      setApplyToFullWeek(false);
      return;
    }

    isUpdatingRef.current = true;
    setSyncStatus('saving');

    const updatedSchedule = { ...scheduleData };
    const affectedKeys = [];

    if (isFullWeek) {
      weekDays.forEach(day => {
        const key = `${operatorId}_${day.dateStr}`;
        if (!lockedCells.has(key)) {
          updatedSchedule[key] = shiftCode;
          affectedKeys.push(key);
        }
      });
    } else {
      updatedSchedule[clickedKey] = shiftCode;
      affectedKeys.push(clickedKey);
    }

    setScheduleData(updatedSchedule);
    setSelectedCell(null);
    setApplyToFullWeek(false);
    triggerFlash(affectedKeys);

    try {
      await redis.set('sf_scheduleData', updatedSchedule);
      reportSyncResult(true);
      const op = operators.find(o => o.id === operatorId);
      const dayLabel = isFullWeek ? 'toda la semana' : dateStr;
      pushToast('success', `${op?.name || operatorId} → ${SHIFT_TYPES[shiftCode].label} (${dayLabel})`, {
        undoAction: () => {
          setScheduleData(previousSchedule);
          redis.set('sf_scheduleData', previousSchedule).then(() => {
            pushToast('info', 'Cambio deshecho');
          }).catch(() => {
            pushToast('error', 'No se pudo deshacer');
          });
        }
      });
    } catch (error) {
      console.error('Error al guardar turno:', error);
      setScheduleData(previousSchedule);
      reportSyncResult(false);
      pushToast('error', 'Error al guardar. Cambio revertido.');
    } finally {
      setTimeout(() => { isUpdatingRef.current = false; }, 2500);
    }
  };

  // ✅ Asignación desde reasignación inteligente
  const handleReassign = async (targetOperatorId) => {
    if (!reassignModal) return;
    const shiftCode = reassignShift;
    const newKey = `${targetOperatorId}_${reassignModal.dateStr}`;
    const previousSchedule = { ...scheduleData };

    // Validar de nuevo antes de aplicar
    const conflicts = detectConflicts(targetOperatorId, reassignModal.dateStr, shiftCode, false);
    if (conflicts.length > 0) {
      pushToast('warning', conflicts[0], { duration: 5000 });
      return;
    }

    isUpdatingRef.current = true;
    setSyncStatus('saving');

    const updatedSchedule = { ...scheduleData, [newKey]: shiftCode };
    setScheduleData(updatedSchedule);
    setReassignModal(null);
    triggerFlash([newKey]);

    try {
      await redis.set('sf_scheduleData', updatedSchedule);
      reportSyncResult(true);
      const target = operators.find(o => o.id === targetOperatorId);
      const absent = operators.find(o => o.id === reassignModal.operatorId);
      pushToast('success', `${target?.name} cubrirá ${SHIFT_TYPES[shiftCode].label} de ${absent?.name} (${reassignModal.dateStr})`, {
        undoAction: () => {
          setScheduleData(previousSchedule);
          redis.set('sf_scheduleData', previousSchedule).then(() => {
            pushToast('info', 'Reasignación deshecha');
          }).catch(() => {
            pushToast('error', 'No se pudo deshacer');
          });
        }
      });
    } catch (error) {
      console.error('Error al reasignar:', error);
      setScheduleData(previousSchedule);
      reportSyncResult(false);
      pushToast('error', 'Error al reasignar. Cambio revertido.');
    } finally {
      setTimeout(() => { isUpdatingRef.current = false; }, 2500);
    }
  };

  const handleSaveOperator = async (e) => {
    e.preventDefault();
    if (!newOp.name || !canManageOperators) return;

    isUpdatingRef.current = true;
    const previousOps = operators;
    let updatedOps;

    if (editingOperator) {
      updatedOps = operators.map(op => op.id === editingOperator.id ? { ...op, ...newOp } : op);
    } else {
      const maxIdNum = operators.reduce((max, op) => {
        const num = parseInt(op.id.replace(/\D/g, ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 100);
      const newId = `M-${maxIdNum + 1}`;
      updatedOps = [...operators, { id: newId, ...newOp, status: 'Activo' }];
    }

    setOperators(updatedOps);
    setIsAddOperatorOpen(false);
    setEditingOperator(null);
    setSyncStatus('saving');

    try {
      await redis.set('sf_operators', updatedOps);
      reportSyncResult(true);
      pushToast('success', editingOperator ? 'Operador actualizado' : 'Operador registrado');
    } catch (error) {
      console.error('Error al guardar operador:', error);
      setOperators(previousOps);
      reportSyncResult(false);
      pushToast('error', 'Error al guardar operador. Cambio revertido.');
    } finally {
      setTimeout(() => { isUpdatingRef.current = false; }, 2500);
    }
  };

  const handleDeleteOperator = async (operatorId) => {
    if (!canManageOperators) return;
    if (window.confirm('¿Estás seguro de que deseas eliminar este montacargista?')) {
      isUpdatingRef.current = true;
      setSyncStatus('saving');
      const previousOps = operators;
      const updatedOps = operators.filter(op => op.id !== operatorId);
      setOperators(updatedOps);
      try {
        await redis.set('sf_operators', updatedOps);
        reportSyncResult(true);
        pushToast('success', 'Operador eliminado');
      } catch (error) {
        console.error('Error al eliminar en la base de datos:', error);
        setOperators(previousOps);
        reportSyncResult(false);
        pushToast('error', 'Error al eliminar. Cambio revertido.');
      } finally {
        setTimeout(() => { isUpdatingRef.current = false; }, 2500);
      }
    }
  };

  const handleCreateVacationRequest = async (e) => {
    e.preventDefault();
    const op = operators.find(o => o.id === newVac.operatorId);
    if (!op) {
      setVacDateError('Selecciona un operador válido.');
      return;
    }
    if (!newVac.startDate || !newVac.endDate) {
      setVacDateError('Selecciona ambas fechas.');
      return;
    }
    if (newVac.endDate < newVac.startDate) {
      setVacDateError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }
    setVacDateError('');

    isUpdatingRef.current = true;
    setSyncStatus('saving');
    const newReq = {
      id: generateId(),
      operatorId: op.id,
      operatorName: op.name,
      startDate: newVac.startDate,
      endDate: newVac.endDate,
      type: newVac.type,
      status: 'Pendiente',
      reason: newVac.reason || 'Sin motivo especificado'
    };

    const previousVac = vacationRequests;
    const updatedVac = [newReq, ...vacationRequests];
    setVacationRequests(updatedVac);
    setIsRequestVacationOpen(false);

    try {
      await redis.set('sf_vacations', updatedVac);
      reportSyncResult(true);
      pushToast('success', 'Solicitud registrada');
    } catch (error) {
      console.error('Error al guardar permiso:', error);
      setVacationRequests(previousVac);
      reportSyncResult(false);
      pushToast('error', 'Error al registrar solicitud. Cambio revertido.');
    } finally {
      setTimeout(() => { isUpdatingRef.current = false; }, 2500);
    }
  };

  const handleCancelVacationRequest = async (id) => {
    if (!canApproveVacations) return;
    if (!window.confirm('¿Cancelar esta solicitud de permiso?')) return;
    isUpdatingRef.current = true;
    setSyncStatus('saving');
    const previousVac = vacationRequests;
    const updatedVac = vacationRequests.filter(r => r.id !== id);
    setVacationRequests(updatedVac);
    try {
      await redis.set('sf_vacations', updatedVac);
      reportSyncResult(true);
      pushToast('success', 'Solicitud cancelada');
    } catch (error) {
      console.error('Error al cancelar permiso:', error);
      setVacationRequests(previousVac);
      reportSyncResult(false);
      pushToast('error', 'Error al cancelar. Cambio revertido.');
    } finally {
      setTimeout(() => { isUpdatingRef.current = false; }, 2500);
    }
  };

  const handleVacationStatus = async (id, newStatus) => {
    if (!canApproveVacations) return;
    isUpdatingRef.current = true;
    setSyncStatus('saving');
    const req = vacationRequests.find(r => r.id === id);
    const previousVac = vacationRequests;
    const previousSchedule = scheduleData;
    const updatedVac = vacationRequests.map(r => r.id === id ? { ...r, status: newStatus } : r);
    setVacationRequests(updatedVac);

    let updatedSchedule = { ...scheduleData };
    if (newStatus === 'Aprobado' && req) {
      let shiftCode = 'DES';
      if (req.type === 'Vacaciones') shiftCode = 'VAC';
      else if (req.type === 'Incapacidad') shiftCode = 'INC';
      else if (req.type === 'Día de Descanso Especial' || req.type === 'Permiso Personal') shiftCode = 'DES';

      const [sY, sM, sD] = req.startDate.split('-').map(Number);
      const [eY, eM, eD] = req.endDate.split('-').map(Number);
      let curr = new Date(sY, sM - 1, sD);
      const end = new Date(eY, eM - 1, eD);
      while (curr <= end) {
        const dateStr = formatDateLocal(curr);
        updatedSchedule[`${req.operatorId}_${dateStr}`] = shiftCode;
        curr.setDate(curr.getDate() + 1);
      }
      setScheduleData(updatedSchedule);
    }

    try {
      await redis.set('sf_vacations', updatedVac);
      if (newStatus === 'Aprobado' && req) {
        await redis.set('sf_scheduleData', updatedSchedule);
      }
      reportSyncResult(true);
      pushToast('success', `Solicitud marcada como ${newStatus}`);
    } catch (error) {
      console.error('Error al actualizar estado del permiso:', error);
      setVacationRequests(previousVac);
      setScheduleData(previousSchedule);
      reportSyncResult(false);
      pushToast('error', 'Error al actualizar. Cambio revertido.');
    } finally {
      setTimeout(() => { isUpdatingRef.current = false; }, 2500);
    }
  };

  // ✅ Exportar CSV de horas
  const exportHoursCSV = () => {
    const rows = [
      ['Operador', 'ID', 'Zona', 'Equipo', 'Turnos M', 'Turnos T', 'Turnos N', 'Días DES', 'Días VAC', 'Días INC', 'Horas Totales']
    ];
    const targetOps = hoursZoneFilter === 'Todas las zonas'
      ? operators
      : operators.filter(o => o.zone === hoursZoneFilter);

    targetOps.forEach(op => {
      const stats = calcHoursInRange(op.id, hoursStart, hoursEnd, scheduleData);
      rows.push([
        op.name, op.id, op.zone, op.equipment,
        stats.days.M, stats.days.T, stats.days.N,
        stats.days.DES, stats.days.VAC, stats.days.INC,
        stats.total.toFixed(1)
      ]);
    });

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Horas_${hoursStart}_${hoursEnd}.csv`;
    link.click();
    pushToast('success', `CSV exportado con ${targetOps.length} operadores`);
  };

  // ✅ Generar PDF ejecutivo
  const handleExportExecutivePDF = async () => {
    setIsExporting(true);
    try {
      await loadExportLibraries();
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();

      // Fondo
      pdf.setFillColor(2, 31, 18);
      pdf.rect(0, 0, W, H, 'F');

      // Header
      pdf.setFillColor(0, 71, 31);
      pdf.rect(0, 0, W, 25, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text('ShiftForklift — Reporte Ejecutivo', 14, 12);
      pdf.setFontSize(9);
      pdf.setTextColor(167, 243, 208);
      pdf.text(`Semana del ${weekDays[0].dayNumber} ${weekDays[0].monthName} al ${weekDays[6].dayNumber} ${weekDays[6].monthName}`, 14, 19);

      // KPIs
      const totalOps = operators.length;
      const licenseOk = operators.filter(op => {
        if (!op.licenseExpiry) return false;
        const exp = new Date(op.licenseExpiry + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return exp >= today;
      }).length;

      // Cobertura y ausentismo promedio de la semana
      let totalWorked = 0;
      let totalAbsent = 0;
      let totalSlots = 0;
      weekDays.forEach(day => {
        operators.forEach(op => {
          const code = scheduleData[`${op.id}_${day.dateStr}`] || 'DES';
          totalSlots++;
          if (['M', 'T', 'N'].includes(code)) totalWorked++;
          if (['VAC', 'INC'].includes(code)) totalAbsent++;
        });
      });
      const coveragePct = totalSlots > 0 ? Math.round((totalWorked / totalSlots) * 100) : 0;
      const absentPct = totalSlots > 0 ? Math.round((totalAbsent / totalSlots) * 100) : 0;

      const kpis = [
        { label: 'Cobertura', value: `${coveragePct}%`, color: [16, 185, 129] },
        { label: 'Ausentismo', value: `${absentPct}%`, color: [239, 68, 68] },
        { label: 'Licencias vigentes', value: `${licenseOk}/${totalOps}`, color: [59, 130, 246] },
        { label: 'Operadores', value: `${totalOps}`, color: [168, 85, 247] }
      ];

      const kpiY = 32;
      const kpiH = 20;
      const kpiW = (W - 28 - 9) / 4;
      kpis.forEach((kpi, i) => {
        const x = 14 + i * (kpiW + 3);
        pdf.setFillColor(2, 40, 18);
        pdf.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, 'F');
        pdf.setDrawColor(...kpi.color);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, 'S');
        pdf.setTextColor(...kpi.color);
        pdf.setFontSize(7);
        pdf.text(kpi.label.toUpperCase(), x + 3, kpiY + 5);
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.text(kpi.value, x + 3, kpiY + 15);
      });

      // Tabla: cobertura por día
      let y = kpiY + kpiH + 10;
      pdf.setTextColor(167, 243, 208);
      pdf.setFontSize(11);
      pdf.text('Cobertura por día', 14, y);
      y += 6;

      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Día', 16, y);
      pdf.text('Mañana', 50, y);
      pdf.text('Tarde', 80, y);
      pdf.text('Noche', 110, y);
      pdf.text('Descanso', 140, y);
      pdf.text('Ausencias', 172, y);
      y += 4;
      pdf.setDrawColor(30, 100, 60);
      pdf.line(14, y, W - 14, y);
      y += 5;

      weekDays.forEach(day => {
        const counts = { M: 0, T: 0, N: 0, DES: 0, VAC: 0, INC: 0 };
        operators.forEach(op => {
          const code = scheduleData[`${op.id}_${day.dateStr}`] || 'DES';
          if (counts[code] !== undefined) counts[code]++;
        });
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${day.dayName} ${day.dayNumber}`, 16, y);
        pdf.text(String(counts.M), 50, y);
        pdf.text(String(counts.T), 80, y);
        pdf.text(String(counts.N), 110, y);
        pdf.text(String(counts.DES), 140, y);
        pdf.setTextColor(239, 68, 68);
        pdf.text(String(counts.VAC + counts.INC), 172, y);
        y += 6;
      });

      // Tabla: horas por operador (esta semana)
      y += 6;
      pdf.setTextColor(167, 243, 208);
      pdf.setFontSize(11);
      pdf.text('Horas por operador (semana actual)', 14, y);
      y += 6;

      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Operador', 16, y);
      pdf.text('Zona', 80, y);
      pdf.text('M', 138, y);
      pdf.text('T', 148, y);
      pdf.text('N', 158, y);
      pdf.text('Total h', 175, y);
      y += 4;
      pdf.line(14, y, W - 14, y);
      y += 5;

      const sortedByHours = [...operators].map(op => {
        const weekDates = weekDays.map(d => d.dateStr);
        let totalH = 0;
        const c = { M: 0, T: 0, N: 0 };
        weekDates.forEach(date => {
          const code = scheduleData[`${op.id}_${date}`];
          if (code && SHIFT_HOURS[code] !== undefined) {
            totalH += SHIFT_HOURS[code];
            if (['M', 'T', 'N'].includes(code)) c[code]++;
          }
        });
        return { ...op, totalH, c };
      }).sort((a, b) => b.totalH - a.totalH);

      sortedByHours.forEach(op => {
        if (y > H - 25) return; // no desbordar
        pdf.setTextColor(255, 255, 255);
        pdf.text(op.name.substring(0, 30), 16, y);
        pdf.setTextColor(148, 163, 184);
        pdf.text(op.zone.substring(0, 25), 80, y);
        pdf.setTextColor(255, 255, 255);
        pdf.text(String(op.c.M), 138, y);
        pdf.text(String(op.c.T), 148, y);
        pdf.text(String(op.c.N), 158, y);
        pdf.setTextColor(16, 185, 129);
        pdf.text(`${op.totalH.toFixed(1)}h`, 175, y);
        y += 5.5;
      });

      // Footer
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Generado el ${new Date().toLocaleString('es-MX')} por ${currentUser?.name || 'Usuario'}`, 14, H - 8);

      pdf.save(`Reporte_Ejecutivo_${currentWeekStart}.pdf`);
      pushToast('success', 'Reporte ejecutivo generado');
    } catch (error) {
      console.error('Error al generar reporte:', error);
      pushToast('error', 'No se pudo generar el reporte');
    } finally {
      setIsExporting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // PANTALLA DE LOGIN
  // ─────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#021f12] flex items-center justify-center p-4">
        <div className="bg-[#002e14] border border-emerald-700 rounded-3xl max-w-md w-full p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#006029] to-[#003818] border border-emerald-500/40 flex items-center justify-center mx-auto mb-3 shadow-lg relative">
              <Truck className="w-8 h-8 text-emerald-200" />
              <Star className="w-5 h-5 text-red-600 fill-red-600 absolute -top-1 -right-1" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-wide">ShiftForklift</h2>
            <p className="text-xs text-emerald-300/80 mt-1">Iniciar Sesión para acceder al control de turnos</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {loginError && (
              <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-center font-bold">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-emerald-300 font-bold mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-emerald-300 font-bold mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showLoginPass ? 'text' : 'password'}
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  disabled={!!lockoutUntil}
                  className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 pr-10 text-white focus:outline-none focus:border-emerald-500 text-sm disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPass(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-200"
                  tabIndex={-1}
                >
                  {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!!lockoutUntil}
              className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition shadow-lg text-sm mt-2"
            >
              {lockoutUntil ? `Bloqueado (${lockoutRemaining}s)` : 'Ingresar al Sistema'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#021f12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-emerald-300">
          <Loader2 className="w-10 h-10 animate-spin" />
          <span className="text-sm font-bold tracking-wide">Cargando datos…</span>
          <span className="text-[10px] text-emerald-500">Sincronizando con la base de datos</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#021f12] flex items-center justify-center p-4">
        <div className="bg-[#002e14] border border-red-700 rounded-3xl max-w-md w-full p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-950 border border-red-700/60 flex items-center justify-center mx-auto mb-4">
            <CloudOff className="w-8 h-8 text-red-300" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Error de conexión</h2>
          <p className="text-xs text-emerald-200/80 mb-5">{loadError}</p>
          <button
            onClick={loadCloudData}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg text-sm flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          <button
            onClick={handleLogout}
            className="w-full mt-2 py-2 bg-transparent hover:bg-red-950/60 text-red-300 font-bold rounded-xl transition text-xs border border-red-900/60"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  const selectedOperator = selectedCell ? operators.find(o => o.id === selectedCell.operatorId) : null;
  const ActiveShiftIcon = SHIFT_TYPES[activeShiftCode].icon;

  // ✅ Candidatos para reasignación
  const reassignTarget = reassignModal ? operators.find(o => o.id === reassignModal.operatorId) : null;
  const reassignCandidates = reassignModal
    ? getSuitableReplacements(reassignModal.operatorId, reassignModal.dateStr, reassignShift, operators, scheduleData, lockedCells)
    : [];

  return (
    <div className="min-h-screen bg-[#021f12] text-emerald-50 font-sans pb-12">
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-2">
          {toasts.map(t => (
            <Toast
              key={t.id}
              toast={t}
              onDismiss={() => dismissToast(t.id)}
              onUndo={() => {
                if (t.undoAction) t.undoAction();
                dismissToast(t.id);
              }}
            />
          ))}
        </div>
      </div>

      <header className="border-b border-emerald-800/60 bg-[#00471f]/90 backdrop-blur sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#006029] to-[#003818] border border-emerald-500/30 flex items-center justify-center relative shadow-md">
              <Truck className="w-5 h-5 text-emerald-200" />
              <Star className="w-4 h-4 text-red-600 fill-red-600 absolute -top-1 -right-1" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">ShiftForklift</h1>
              <p className="text-xs text-emerald-300/80">Gestión de Turnos y Personal</p>
            </div>
          </div>

          <nav className="hidden md:flex space-x-1 bg-[#02180d] p-1 rounded-xl border border-emerald-900">
            <button onClick={() => setActiveTab('scheduler')} className={`px-3 py-2 text-xs font-bold rounded-lg ${activeTab === 'scheduler' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>Matriz</button>
            <button onClick={() => setActiveTab('operators')} className={`px-3 py-2 text-xs font-bold rounded-lg ${activeTab === 'operators' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>Personal ({operators.length})</button>
            <button onClick={() => setActiveTab('vacations')} className={`px-3 py-2 text-xs font-bold rounded-lg ${activeTab === 'vacations' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>Permisos</button>
            {canViewHours && (
              <button onClick={() => setActiveTab('hours')} className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${activeTab === 'hours' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>
                <DollarSign className="w-3 h-3" /> Horas
              </button>
            )}
            {canViewReports && (
              <button onClick={() => setActiveTab('reports')} className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${activeTab === 'reports' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>
                <BarChart3 className="w-3 h-3" /> Reportes
              </button>
            )}
          </nav>

          <div className="flex items-center space-x-3">
            {syncStatus !== 'idle' && (
              <div className={`hidden sm:flex items-center space-x-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                syncStatus === 'saving' ? 'bg-amber-950 text-amber-300 border-amber-700/60' :
                syncStatus === 'saved' ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60' :
                'bg-red-950 text-red-300 border-red-700/60'
              }`}>
                {syncStatus === 'saving' && <><Loader2 className="w-3 h-3 animate-spin" /><span>Guardando...</span></>}
                {syncStatus === 'saved' && <><CheckCircle2 className="w-3 h-3" /><span>Guardado</span></>}
                {syncStatus === 'error' && <><CloudOff className="w-3 h-3" /><span>Error al guardar</span></>}
              </div>
            )}

            {licenseAlerts.length > 0 && (
              <button
                onClick={() => { setActiveTab('operators'); setShowLicenseAlerts(true); }}
                className="relative p-2 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 rounded-xl transition"
                title="Licencias por vencer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                  {licenseAlerts.length}
                </span>
              </button>
            )}

            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white">{currentUser.name}</div>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${currentUser.role === 'Admin' ? 'bg-red-900 text-red-200' : currentUser.role === 'Supervisor' ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-950 text-amber-200'}`}>
                {currentUser.role}
              </span>
            </div>
            <button onClick={handleLogout} className="p-2 bg-red-950/80 hover:bg-red-800 border border-red-800 text-red-200 rounded-xl transition" title="Cerrar Sesión">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {activeTab === 'scheduler' && (
          <div className="space-y-4">
            {isHistoricalWeek && (
              <div className="bg-slate-900/70 border border-slate-600/60 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-600/60 flex items-center justify-center shrink-0">
                  <History className="w-5 h-5 text-slate-300" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-100">Semana histórica — Solo lectura</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Esta semana ya pasó. Los turnos están bloqueados y no se pueden modificar. Solo puedes consultarlos o exportarlos.
                  </p>
                </div>
                <Lock className="w-5 h-5 text-slate-400 shrink-0" />
              </div>
            )}

            {!isHistoricalWeek && lockedCellsInView > 0 && (
              <div className="bg-purple-950/40 border border-purple-700/40 rounded-2xl px-4 py-2 flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                <p className="text-[10px] text-purple-200">
                  Hay <span className="font-bold">{lockedCellsInView}</span> turno(s) bloqueado(s) por ausencias aprobadas en esta semana. <span className="text-purple-300">Haz clic en uno para buscar reemplazo.</span>
                </p>
              </div>
            )}

            <div className="bg-[#003818] border border-emerald-800/70 rounded-2xl p-3 flex flex-col lg:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <button onClick={() => {
                  const [y, m, d] = currentWeekStart.split('-').map(Number);
                  const prevWeek = new Date(y, m - 1, d - 7);
                  setCurrentWeekStart(formatDateLocal(prevWeek));
                }} className="p-1.5 bg-[#022415] hover:bg-emerald-900 rounded-lg text-emerald-200 border border-emerald-800/60 transition" title="Semana anterior"><ChevronLeft className="w-4 h-4"/></button>

                <div className="text-xs font-bold text-white bg-[#02180d] px-3 py-1.5 rounded-lg border border-emerald-900 flex items-center gap-2">
                  {isHistoricalWeek && <History className="w-3 h-3 text-slate-400" />}
                  {isCurrentWeek && <Activity className="w-3 h-3 text-emerald-400" />}
                  Plan Semanal: {weekDays[0].dayNumber} {weekDays[0].monthName} - {weekDays[6].dayNumber} {weekDays[6].monthName}
                </div>

                <button onClick={() => {
                  const [y, m, d] = currentWeekStart.split('-').map(Number);
                  const nextWeek = new Date(y, m - 1, d + 7);
                  setCurrentWeekStart(formatDateLocal(nextWeek));
                }} className="p-1.5 bg-[#022415] hover:bg-emerald-900 rounded-lg text-emerald-200 border border-emerald-800/60 transition" title="Semana siguiente"><ChevronRight className="w-4 h-4"/></button>

                {!isCurrentWeek && (
                  <button
                    onClick={() => setCurrentWeekStart(getMondayOfCurrentWeek())}
                    className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition border border-emerald-500/50 flex items-center gap-1"
                    title="Volver a la semana actual"
                  >
                    <Activity className="w-3 h-3" />
                    Hoy
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
                <div className="relative">
                  <Search className="w-3 h-3 text-emerald-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar operador..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#02180d] border border-emerald-900 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-700 w-40"
                  />
                </div>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="bg-[#02180d] border border-emerald-900 rounded-lg px-3 py-1.5 text-xs text-emerald-200 focus:outline-none"
                >
                  {WAREHOUSE_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                <select
                  value={selectedEquipment}
                  onChange={(e) => setSelectedEquipment(e.target.value)}
                  className="bg-[#02180d] border border-emerald-900 rounded-lg px-3 py-1.5 text-xs text-emerald-200 focus:outline-none"
                >
                  <option value="Todos los equipos">Todos los equipos</option>
                  {FORKLIFT_TYPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                </select>
                <button
                  onClick={() => setOnlyExpiringLicenses(v => !v)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition flex items-center gap-1.5 ${
                    onlyExpiringLicenses
                      ? 'bg-amber-600 border-amber-400 text-white'
                      : 'bg-[#02180d] border-emerald-900 text-emerald-300 hover:bg-emerald-950'
                  }`}
                  title="Mostrar solo operadores con licencia vencida o por vencer (≤30 días)"
                >
                  <AlertCircle className="w-3 h-3" />
                  Licencias críticas
                </button>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="px-2.5 py-1.5 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5"
                  >
                    <FilterX className="w-3 h-3" />
                    Limpiar ({activeFiltersCount})
                  </button>
                )}

                <div className="relative" ref={exportMenuRef}>
                  <button
                    disabled={isExporting}
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 transition border border-emerald-500/50 shadow"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Exportar</span>
                      </>
                    )}
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-52 bg-[#002e14] border border-emerald-700 rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
                      <div className="p-2 border-b border-emerald-800 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        Selecciona el formato
                      </div>
                      <button onClick={() => handleExport('png')} className="w-full text-left px-3 py-2.5 text-emerald-100 hover:bg-emerald-800/80 flex items-center space-x-2 transition">
                        <ImageIcon className="w-4 h-4 text-emerald-400" />
                        <div><div className="font-bold">Imagen PNG</div></div>
                      </button>
                      <button onClick={() => handleExport('jpg')} className="w-full text-left px-3 py-2.5 text-emerald-100 hover:bg-emerald-800/80 flex items-center space-x-2 transition border-t border-emerald-900/60">
                        <FileImage className="w-4 h-4 text-amber-400" />
                        <div><div className="font-bold">Imagen JPG</div></div>
                      </button>
                      <button onClick={() => handleExport('pdf')} className="w-full text-left px-3 py-2.5 text-emerald-100 hover:bg-emerald-800/80 flex items-center space-x-2 transition border-t border-emerald-900/60">
                        <FileText className="w-4 h-4 text-red-400" />
                        <div><div className="font-bold">Documento PDF</div></div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <div className="bg-cyan-950/40 border border-cyan-700/40 rounded-lg px-3 py-1.5 flex items-center gap-2 text-[10px] text-cyan-200">
                <Filter className="w-3 h-3 text-cyan-300 shrink-0" />
                <span>
                  Mostrando <span className="font-bold">{filteredOperators.length}</span> de <span className="font-bold">{operators.length}</span> operadores
                  {activeFiltersCount > 1 && ` · ${activeFiltersCount} filtros activos`}
                </span>
              </div>
            )}

            <div
              ref={scheduleRef}
              className={`bg-[#002812] border rounded-2xl overflow-hidden shadow-2xl p-1 ${
                isHistoricalWeek ? 'border-slate-700/70 opacity-[0.97]' : 'border-emerald-800/80'
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[900px]">
                  <thead>
                    <tr className={`border-b ${isHistoricalWeek ? 'bg-slate-950/80 border-slate-700/70' : 'bg-[#001f0d] border-emerald-800/80'}`}>
                      <th className={`py-3 px-4 text-left text-xs font-bold uppercase w-64 ${isHistoricalWeek ? 'text-slate-300' : 'text-emerald-300'}`}>
                        Montacargista / Área
                      </th>
                      {weekDays.map(day => {
                        const isToday = day.dateStr === formatDateLocal(now);
                        return (
                          <th
                            key={day.dateStr}
                            className={`py-3 px-2 text-center border-l ${
                              isHistoricalWeek ? 'border-slate-800/60' : 'border-emerald-900/60'
                            } ${isToday && isCurrentWeek ? 'bg-emerald-900/40' : ''}`}
                          >
                            <div className={`text-xs font-bold uppercase ${isHistoricalWeek ? 'text-slate-300' : 'text-emerald-200'}`}>{day.dayName}</div>
                            <div className={`text-base font-extrabold ${day.isWeekend ? 'text-red-400' : 'text-white'}`}>{day.dayNumber}</div>
                            {isToday && isCurrentWeek && (
                              <div className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider mt-0.5">Hoy</div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/50">
                    {filteredOperators.map(op => (
                      <tr key={op.id} className="hover:bg-[#003517]/50">
                        <td className="py-3 px-4">
                          <div className="font-bold text-sm text-white">{op.name}</div>
                          <div className="text-xs text-emerald-400/80">{op.id} • {op.zone}</div>
                        </td>
                        {weekDays.map(day => {
                          const shiftCode = scheduleData[`${op.id}_${day.dateStr}`] || 'DES';
                          const shift = SHIFT_TYPES[shiftCode] || SHIFT_TYPES.DES;
                          const IconComp = shift.icon;
                          const cellKey = `${op.id}_${day.dateStr}`;
                          const isLockedByAbsence = lockedCells.has(cellKey);
                          const editable = canEditCell(op.id, day.dateStr);
                          const isToday = day.dateStr === formatDateLocal(now) && isCurrentWeek;
                          const isCurrentShiftForMe = isToday && shiftCode === activeShiftCode;
                          const isFlashing = flashCells.has(cellKey);

                          let tooltip = '';
                          if (isHistoricalWeek) tooltip = 'Semana histórica — solo lectura';
                          else if (isLockedByAbsence) tooltip = 'Bloqueado por ausencia. Clic para buscar reemplazo.';
                          else if (!canEditShifts) tooltip = 'No tienes permisos para editar turnos';

                          return (
                            <td
                              key={day.dateStr}
                              className={`p-1.5 text-center border-l border-emerald-900/40 ${isToday ? 'bg-emerald-950/30' : ''}`}
                            >
                              <button
                                disabled={!editable && !isLockedByAbsence}
                                onClick={() => {
                                  if (isLockedByAbsence && !isHistoricalWeek) {
                                    setReassignModal({ operatorId: op.id, dateStr: day.dateStr });
                                    setReassignShift('M');
                                  } else if (editable) {
                                    setSelectedCell({ operatorId: op.id, dateStr: day.dateStr, currentShift: shiftCode });
                                  }
                                }}
                                title={tooltip}
                                className={`relative w-full py-2 px-1 rounded-xl border text-xs font-bold flex flex-col items-center justify-center ${shift.color} ${
                                  !editable && !isLockedByAbsence
                                    ? 'cursor-not-allowed'
                                    : 'hover:scale-105 transition-transform'
                                } ${
                                  isLockedByAbsence && !isHistoricalWeek
                                    ? 'ring-2 ring-purple-400/60 shadow-purple-900/40 cursor-pointer'
                                    : ''
                                } ${
                                  isHistoricalWeek ? 'grayscale-[0.35] opacity-90' : ''
                                } ${
                                  isCurrentShiftForMe
                                    ? 'ring-2 ring-emerald-400/80 shadow-emerald-500/30 shadow-lg'
                                    : ''
                                } ${
                                  isFlashing
                                    ? 'ring-2 ring-white/80 shadow-white/40 shadow-lg animate-pulse'
                                    : ''
                                }`}
                              >
                                <IconComp className="w-3.5 h-3.5" />
                                <span>{shift.code}</span>
                                {(isLockedByAbsence || isHistoricalWeek) && (
                                  <Lock className={`w-2.5 h-2.5 absolute top-0.5 right-0.5 ${
                                    isLockedByAbsence ? 'text-purple-300' : 'text-slate-400'
                                  }`} />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {filteredOperators.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center">
                          {operators.length === 0 ? (
                            <>
                              <Users className="w-10 h-10 text-emerald-700 mx-auto mb-2" />
                              <p className="text-emerald-300 font-bold text-sm">No hay operadores registrados</p>
                            </>
                          ) : (
                            <>
                              <FilterX className="w-10 h-10 text-cyan-700 mx-auto mb-2" />
                              <p className="text-cyan-300 font-bold text-sm">Ningún operador coincide con los filtros</p>
                              <button
                                onClick={clearAllFilters}
                                className="mt-3 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                              >
                                <FilterX className="w-3.5 h-3.5" />
                                Limpiar filtros
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              {isCurrentWeek ? (
                <div className="relative flex items-center gap-2 rounded-lg border border-emerald-500/60 bg-gradient-to-r from-emerald-950/90 to-[#003818] px-2.5 py-1.5 shadow-md">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <ActiveShiftIcon className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 leading-none">En vivo</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-extrabold text-emerald-100 leading-none">{SHIFT_TYPES[activeShiftCode].label}</span>
                      <span className="text-[9px] text-emerald-400 font-mono leading-none">{formatTimeLocal(now)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/60 px-2.5 py-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">Resumen</div>
                    <div className="text-xs font-extrabold text-slate-200 leading-none mt-0.5">{statsDateLabel}</div>
                  </div>
                </div>
              )}

              <MiniIndicator icon={Sunrise} label="Mañana" value={shiftStats.M} accent="emerald" />
              <MiniIndicator icon={Sun} label="Tarde" value={shiftStats.T} accent="amber" />
              <MiniIndicator icon={Moon} label="Noche" value={shiftStats.N} accent="indigo" />
              <MiniIndicator icon={Coffee} label="Descanso" value={shiftStats.DES} accent="slate" />
              <MiniIndicator icon={AlertTriangle} label="Ausentes" value={shiftStats.absent} accent={shiftStats.absent > 0 ? 'red' : 'slate'} />
              <MiniIndicator icon={Users} label="Plantilla" value={shiftStats.total} accent="cyan" subtitle={`${shiftStats.active} act.`} />
            </div>
          </div>
        )}

        {activeTab === 'operators' && (
          <div className="space-y-5">
            {licenseAlerts.length > 0 && showLicenseAlerts && (
              <div className="bg-amber-950/60 border border-amber-700/60 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-amber-200">
                        {licenseAlerts.length} licencia(s) DC3 {licenseAlerts.some(a => a.expired) ? 'vencida(s) o ' : ''}por vencer
                      </h3>
                      <ul className="mt-2 space-y-1 text-xs text-amber-100/90">
                        {licenseAlerts.map(a => (
                          <li key={a.id}>
                            <span className="font-bold">{a.name}</span> ({a.id}) — {a.expired ? `vencida hace ${Math.abs(a.diffDays)} día(s)` : `vence en ${a.diffDays} día(s)`} ({a.licenseExpiry})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <button onClick={() => setShowLicenseAlerts(false)} className="text-amber-400 hover:text-amber-200 shrink-0"><X className="w-4 h-4" /></button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center bg-[#003818] border border-emerald-800/70 rounded-2xl p-4">
              <div>
                <h2 className="text-lg font-bold text-white">Plantilla de Montacargistas</h2>
                <p className="text-xs text-emerald-300">Roles y permisos: {currentUser.role}</p>
              </div>
              {canManageOperators && (
                <button onClick={() => {
                  setEditingOperator(null);
                  setNewOp({
                    name: '', zone: WAREHOUSE_ZONES[1], equipment: FORKLIFT_TYPES[0],
                    shiftPattern: 'Mañana', licenseExpiry: formatDateLocal(new Date())
                  });
                  setIsAddOperatorOpen(true);
                }} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition">
                  <Plus className="w-4 h-4"/><span>Nuevo Operador</span>
                </button>
              )}
            </div>

            {operators.length === 0 ? (
              <div className="bg-[#002812] border border-emerald-800/80 rounded-2xl p-12 text-center">
                <Users className="w-12 h-12 text-emerald-700 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">Sin personal registrado</h3>
                <p className="text-xs text-emerald-400/80 mb-4">Agrega el primer montacargista para comenzar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {operators.map(op => (
                  <div key={op.id} className="bg-[#002812] border border-emerald-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">{op.id}</span>
                          <h3 className="text-base font-bold text-white mt-1">{op.name}</h3>
                        </div>
                        {canManageOperators && (
                          <div className="flex space-x-1">
                            <button onClick={() => { setEditingOperator(op); setNewOp(op); setIsAddOperatorOpen(true); }} className="p-1.5 bg-emerald-900 hover:bg-emerald-700 text-emerald-200 rounded-lg transition"><Pencil className="w-3.5 h-3.5"/></button>
                            <button onClick={() => handleDeleteOperator(op.id)} className="p-1.5 bg-red-950 hover:bg-red-800 text-red-300 rounded-lg transition"><Trash2 className="w-3.5 h-3.5"/></button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5 text-xs text-emerald-200 border-t border-emerald-900/80 pt-3">
                        <div className="flex justify-between"><span>Zona:</span><span className="font-semibold text-white">{op.zone}</span></div>
                        <div className="flex justify-between"><span>Equipo:</span><span className="font-semibold text-white">{op.equipment}</span></div>
                        <div className="flex justify-between"><span>Turno Base:</span><span className="font-semibold text-white">{op.shiftPattern}</span></div>
                        <div className="flex justify-between items-center pt-1">
                          <span>Licencia DC3:</span>
                          <span className={`px-2 py-0.5 rounded border text-[11px] ${getLicenseStatusStyle(op.licenseExpiry)}`}>
                            {op.licenseExpiry || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'vacations' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center bg-[#003818] border border-emerald-800/70 rounded-2xl p-4">
              <h2 className="text-lg font-bold text-white">Solicitudes de Ausencia</h2>
              <button
                disabled={operators.length === 0}
                onClick={() => {
                  setVacDateError('');
                  setNewVac(prev => ({ ...prev, operatorId: operators[0]?.id || '' }));
                  setIsRequestVacationOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition"
              >
                <Plus className="w-4 h-4"/><span>Registrar Solicitud</span>
              </button>
            </div>

            <div className="bg-[#002812] border border-emerald-800/80 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#001f0d] text-emerald-300 font-bold uppercase border-b border-emerald-800/80">
                    <th className="p-3.5">Operador</th>
                    <th className="p-3.5">Tipo</th>
                    <th className="p-3.5">Periodo</th>
                    <th className="p-3.5">Motivo / Razón</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/50">
                  {vacationRequests.map(req => (
                    <tr key={req.id}>
                      <td className="p-3.5"><div className="font-bold text-white">{req.operatorName}</div><div className="text-[10px] text-emerald-400">{req.operatorId}</div></td>
                      <td className="p-3.5 font-semibold text-emerald-200">{req.type}</td>
                      <td className="p-3.5 text-emerald-200">{req.startDate} al {req.endDate}</td>
                      <td className="p-3.5 text-white/90 max-w-xs">{req.reason}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded font-bold inline-flex items-center gap-1 ${
                          req.status === 'Aprobado' ? 'bg-emerald-950 text-emerald-300' : 
                          req.status === 'Rechazado' ? 'bg-red-950 text-red-300' : 
                          'bg-amber-950 text-amber-300'
                        }`}>
                          {req.status === 'Aprobado' && <Lock className="w-3 h-3" />}
                          {req.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {req.status === 'Pendiente' && canApproveVacations ? (
                          <div className="flex justify-center space-x-1">
                            <button onClick={() => handleVacationStatus(req.id, 'Aprobado')} className="p-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition" title="Aprobar"><Check className="w-4 h-4"/></button>
                            <button onClick={() => handleVacationStatus(req.id, 'Rechazado')} className="p-1.5 bg-red-800 hover:bg-red-700 text-white rounded-lg transition" title="Rechazar"><X className="w-4 h-4"/></button>
                            <button onClick={() => handleCancelVacationRequest(req.id)} className="p-1.5 bg-[#011a0d] hover:bg-red-950 text-emerald-400 hover:text-red-300 border border-emerald-800 rounded-lg transition" title="Cancelar"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        ) : req.status === 'Aprobado' && canApproveVacations ? (
                          <button onClick={() => handleVacationStatus(req.id, 'Rechazado')} className="px-2 py-1 bg-red-900 hover:bg-red-800 text-red-100 rounded-lg transition text-[10px] font-bold flex items-center gap-1 mx-auto">
                            <Lock className="w-3 h-3" /> Revocar
                          </button>
                        ) : (
                          <span className="text-emerald-600 text-[10px]">Sin acciones</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {vacationRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center">
                        <CalendarIcon className="w-10 h-10 text-emerald-700 mx-auto mb-2" />
                        <p className="text-emerald-300 font-bold text-sm">Sin solicitudes</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ✅ NUEVO: Módulo de Horas / Nómina */}
        {activeTab === 'hours' && canViewHours && (
          <div className="space-y-5">
            <div className="bg-[#003818] border border-emerald-800/70 rounded-2xl p-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Módulo de Horas y Nómina</h2>
                    <p className="text-xs text-emerald-300">Cálculo de horas trabajadas por período</p>
                  </div>
                </div>
                <button
                  onClick={exportHoursCSV}
                  disabled={operators.length === 0}
                  className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-emerald-500/50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Exportar CSV
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-emerald-400 mb-1">Desde</label>
                  <input
                    type="date"
                    value={hoursStart}
                    onChange={(e) => setHoursStart(e.target.value)}
                    className="w-full bg-[#02180d] border border-emerald-900 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-emerald-400 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={hoursEnd}
                    min={hoursStart}
                    onChange={(e) => setHoursEnd(e.target.value)}
                    className="w-full bg-[#02180d] border border-emerald-900 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-emerald-400 mb-1">Zona</label>
                  <select
                    value={hoursZoneFilter}
                    onChange={(e) => setHoursZoneFilter(e.target.value)}
                    className="w-full bg-[#02180d] border border-emerald-900 rounded-lg px-3 py-1.5 text-xs text-emerald-200 focus:outline-none"
                  >
                    {WAREHOUSE_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-emerald-900/60 text-xs">
                <div className="text-emerald-400">
                  Período: <span className="font-bold text-white">{hoursStart}</span> al <span className="font-bold text-white">{hoursEnd}</span>
                </div>
                <div className="text-emerald-400">
                  Total: <span className="font-bold text-emerald-300">
                    {(() => {
                      const targetOps = hoursZoneFilter === 'Todas las zonas' ? operators : operators.filter(o => o.zone === hoursZoneFilter);
                      const sum = targetOps.reduce((acc, op) => acc + calcHoursInRange(op.id, hoursStart, hoursEnd, scheduleData).total, 0);
                      return sum.toFixed(1);
                    })()}h
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#002812] border border-emerald-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#001f0d] text-emerald-300 font-bold uppercase border-b border-emerald-800/80">
                      <th className="p-3">Operador</th>
                      <th className="p-3">Zona</th>
                      <th className="p-3 text-center">Días M</th>
                      <th className="p-3 text-center">Días T</th>
                      <th className="p-3 text-center">Días N</th>
                      <th className="p-3 text-center">DES</th>
                      <th className="p-3 text-center">VAC</th>
                      <th className="p-3 text-center">INC</th>
                      <th className="p-3 text-right">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/50">
                    {(hoursZoneFilter === 'Todas las zonas' ? operators : operators.filter(o => o.zone === hoursZoneFilter)).map(op => {
                      const stats = calcHoursInRange(op.id, hoursStart, hoursEnd, scheduleData);
                      const isHigh = stats.total > 48;
                      return (
                        <tr key={op.id} className="hover:bg-[#003517]/50">
                          <td className="p-3">
                            <div className="font-bold text-white">{op.name}</div>
                            <div className="text-[10px] text-emerald-400/70">{op.id}</div>
                          </td>
                          <td className="p-3 text-emerald-200 text-[11px]">{op.zone}</td>
                          <td className="p-3 text-center text-emerald-300 font-bold">{stats.days.M}</td>
                          <td className="p-3 text-center text-amber-300 font-bold">{stats.days.T}</td>
                          <td className="p-3 text-center text-indigo-300 font-bold">{stats.days.N}</td>
                          <td className="p-3 text-center text-slate-400">{stats.days.DES}</td>
                          <td className="p-3 text-center text-purple-300">{stats.days.VAC}</td>
                          <td className="p-3 text-center text-red-300">{stats.days.INC}</td>
                          <td className={`p-3 text-right font-extrabold text-sm ${isHigh ? 'text-red-400' : 'text-emerald-300'}`}>
                            {stats.total.toFixed(1)}h
                          </td>
                        </tr>
                      );
                    })}
                    {operators.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-12 text-center">
                          <DollarSign className="w-10 h-10 text-emerald-700 mx-auto mb-2" />
                          <p className="text-emerald-300 font-bold text-sm">Sin operadores registrados</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-[10px] text-emerald-500/70 text-center">
              <p>Reglas de cálculo: Mañana = 8h · Tarde = 8h · Noche = 8.5h · Descanso/Ausencia = 0h</p>
              <p>Un total semanal por encima de 48h se marca en rojo como advertencia.</p>
            </div>
          </div>
        )}

        {/* ✅ NUEVO: Módulo de Reportes */}
        {activeTab === 'reports' && canViewReports && (
          <div className="space-y-5">
            <div className="bg-[#003818] border border-emerald-800/70 rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Reportes Ejecutivos</h2>
                  <p className="text-xs text-emerald-300">KPIs de la semana actual y análisis de cobertura</p>
                </div>
              </div>
              <button
                onClick={handleExportExecutivePDF}
                disabled={isExporting}
                className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-emerald-500/50"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Exportar Reporte PDF
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(() => {
                let totalWorked = 0, totalAbsent = 0, totalSlots = 0;
                weekDays.forEach(day => {
                  operators.forEach(op => {
                    const code = scheduleData[`${op.id}_${day.dateStr}`] || 'DES';
                    totalSlots++;
                    if (['M', 'T', 'N'].includes(code)) totalWorked++;
                    if (['VAC', 'INC'].includes(code)) totalAbsent++;
                  });
                });
                const coverage = totalSlots > 0 ? Math.round((totalWorked / totalSlots) * 100) : 0;
                const absentPct = totalSlots > 0 ? Math.round((totalAbsent / totalSlots) * 100) : 0;
                const licenseOk = operators.filter(op => {
                  if (!op.licenseExpiry) return false;
                  const exp = new Date(op.licenseExpiry + 'T00:00:00');
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return exp >= today;
                }).length;

                return (
                  <>
                    <div className="rounded-2xl border border-emerald-700/60 bg-emerald-950/70 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                        <span className="text-[10px] font-bold uppercase text-emerald-300">Cobertura</span>
                      </div>
                      <div className="text-2xl font-extrabold text-emerald-100">{coverage}%</div>
                      <div className="text-[10px] text-emerald-400/70 mt-0.5">{totalWorked} de {totalSlots} slots</div>
                    </div>
                    <div className="rounded-2xl border border-red-700/60 bg-red-950/70 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-300" />
                        <span className="text-[10px] font-bold uppercase text-red-300">Ausentismo</span>
                      </div>
                      <div className="text-2xl font-extrabold text-red-100">{absentPct}%</div>
                      <div className="text-[10px] text-red-400/70 mt-0.5">{totalAbsent} ausencias</div>
                    </div>
                    <div className="rounded-2xl border border-cyan-700/60 bg-cyan-950/70 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
                        <span className="text-[10px] font-bold uppercase text-cyan-300">Licencias OK</span>
                      </div>
                      <div className="text-2xl font-extrabold text-cyan-100">{licenseOk}/{operators.length}</div>
                      <div className="text-[10px] text-cyan-400/70 mt-0.5">{operators.length - licenseOk} críticas</div>
                    </div>
                    <div className="rounded-2xl border border-purple-700/60 bg-purple-950/70 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Users2 className="w-3.5 h-3.5 text-purple-300" />
                        <span className="text-[10px] font-bold uppercase text-purple-300">Plantilla</span>
                      </div>
                      <div className="text-2xl font-extrabold text-purple-100">{operators.length}</div>
                      <div className="text-[10px] text-purple-400/70 mt-0.5">operadores registrados</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Cobertura por día */}
            <div className="bg-[#002812] border border-emerald-800/80 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-400" />
                Cobertura por día (semana actual)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="text-emerald-300 font-bold uppercase border-b border-emerald-800/80">
                      <th className="p-2">Día</th>
                      <th className="p-2 text-center">M</th>
                      <th className="p-2 text-center">T</th>
                      <th className="p-2 text-center">N</th>
                      <th className="p-2 text-center">DES</th>
                      <th className="p-2 text-center">VAC</th>
                      <th className="p-2 text-center">INC</th>
                      <th className="p-2 text-center">Cobertura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/50">
                    {weekDays.map(day => {
                      const counts = { M: 0, T: 0, N: 0, DES: 0, VAC: 0, INC: 0 };
                      operators.forEach(op => {
                        const code = scheduleData[`${op.id}_${day.dateStr}`] || 'DES';
                        if (counts[code] !== undefined) counts[code]++;
                      });
                      const worked = counts.M + counts.T + counts.N;
                      const total = operators.length || 1;
                      const pct = Math.round((worked / total) * 100);
                      const color = pct >= 80 ? 'text-emerald-300' : pct >= 60 ? 'text-amber-300' : 'text-red-300';
                      return (
                        <tr key={day.dateStr} className="hover:bg-[#003517]/50">
                          <td className="p-2 font-bold text-white">{day.dayName} {day.dayNumber}</td>
                          <td className="p-2 text-center text-emerald-300 font-bold">{counts.M}</td>
                          <td className="p-2 text-center text-amber-300 font-bold">{counts.T}</td>
                          <td className="p-2 text-center text-indigo-300 font-bold">{counts.N}</td>
                          <td className="p-2 text-center text-slate-400">{counts.DES}</td>
                          <td className="p-2 text-center text-purple-300">{counts.VAC}</td>
                          <td className="p-2 text-center text-red-300">{counts.INC}</
