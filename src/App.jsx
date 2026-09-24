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
  ArrowRightLeft,
  BarChart3,
  TrendingUp,
  CalendarDays,
  Users2,
  ShieldCheck,
  Share2
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
  if (diffDays < 0) return 'bg-red-950 text-red-300 border-red-700/80 font-bold';
  if (diffDays <= 30) return 'bg-amber-950 text-amber-300 border-amber-600/80 font-bold';
  return 'bg-emerald-950 text-emerald-300 border-emerald-800';
};

const INDICATOR_ACCENTS = {
  emerald: { bg: 'bg-emerald-950/70', border: 'border-emerald-700/60', text: 'text-emerald-300', value: 'text-emerald-100' },
  amber:   { bg: 'bg-amber-950/70',   border: 'border-amber-700/60',   text: 'text-amber-300',   value: 'text-amber-100' },
  indigo:  { bg: 'bg-indigo-950/70',  border: 'border-indigo-700/60',  text: 'text-indigo-300',  value: 'text-indigo-100' },
  slate:   { bg: 'bg-slate-900/70',   border: 'border-slate-700/60',   text: 'text-slate-300',   value: 'text-slate-100' },
  red:     { bg: 'bg-red-950/70',     border: 'border-red-700/60',     text: 'text-red-300',     value: 'text-red-100' },
  cyan:    { bg: 'bg-cyan-950/70',    border: 'border-cyan-700/60',    text: 'text-cyan-300',    value: 'text-cyan-100' }
};

// ✅ MiniIndicator compacto
function MiniIndicator({ icon: Icon, label, value, accent = 'emerald', subtitle = null }) {
  const c = INDICATOR_ACCENTS[accent] || INDICATOR_ACCENTS.emerald;
  return (
    <div className={`flex items-center gap-1.5 rounded-md border ${c.bg} ${c.border} px-1.5 py-1`}>
      <Icon className={`w-3 h-3 ${c.text} shrink-0`} />
      <div className="min-w-0 flex-1">
        <div className={`text-[8px] font-bold uppercase tracking-wider ${c.text} leading-none`}>{label}</div>
        <div className="flex items-baseline gap-1">
          <span className={`text-xs font-extrabold ${c.value} leading-none`}>{value}</span>
          {subtitle && <span className={`text-[8px] ${c.text} opacity-70 leading-none`}>{subtitle}</span>}
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
        <button onClick={onUndo} className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition flex items-center gap-1">
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

const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
};

const forceDownload = (blob, filename) => {
  if (typeof navigator !== 'undefined' && navigator.msSaveBlob) {
    navigator.msSaveBlob(blob, filename);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.position = 'fixed';
  link.style.left = '-9999px';
  link.style.top = '-9999px';
  document.body.appendChild(link);

  setTimeout(() => {
    try {
      link.click();
    } catch (e) {
      console.warn('link.click falló, intentando window.open:', e);
      window.open(url, '_blank');
    }
    setTimeout(() => {
      try {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) { /* no-op */ }
    }, 1500);
  }, 50);
};

const dataURLtoBlob = (dataURL) => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

const getSuitableReplacements = (targetOperatorId, dateStr, shiftCode, operators, scheduleData, lockedCells) => {
  const target = operators.find(o => o.id === targetOperatorId);
  if (!target) return [];

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
      if (lockedCells.has(key)) return false;
      if (code && code !== 'DES') return false;
      return true;
    })
    .map(op => {
      let score = 0;
      const reasons = [];

      if (op.zone === target.zone) { score += 50; reasons.push('Misma zona'); }
      if (op.equipment === target.equipment) { score += 30; reasons.push('Mismo equipo'); }

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

      if (weekHours > 48) {
        score -= 40;
        reasons.push(`${weekHours.toFixed(1)}h excede 48h`);
      } else if (weekHours > 40) {
        score -= 10;
        reasons.push(`${weekHours.toFixed(1)}h esta semana`);
      } else {
        reasons.push(`${weekHours.toFixed(1)}h esta semana`);
      }

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

  const [exportPreview, setExportPreview] = useState(null);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(tick);
  }, []);

  const [reassignModal, setReassignModal] = useState(null);
  const [reassignShift, setReassignShift] = useState('M');
  const [selectedMobileDay, setSelectedMobileDay] = useState(() => formatDateLocal(new Date()));

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
      const baseName = `Horario_Semanal_${currentWeekStart}`;
      const mobile = isMobileDevice();

      if (format === 'png' || format === 'jpg') {
        const dataUrl = format === 'png'
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', 0.95);
        const blob = dataURLtoBlob(dataUrl);
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const filename = `${baseName}.${format}`;

        if (mobile) {
          setExportPreview({ format, blob, dataUrl, filename, mimeType, isPdf: false });
        } else {
          forceDownload(blob, filename);
          pushToast('success', `Horario ${format.toUpperCase()} descargado`);
        }
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

        const pdfBlob = pdf.output('blob');
        const filename = `${baseName}.pdf`;

        if (mobile) {
          setExportPreview({ format: 'pdf', blob: pdfBlob, dataUrl: null, filename, mimeType: 'application/pdf', isPdf: true });
        } else {
          forceDownload(pdfBlob, filename);
          pushToast('success', 'PDF descargado');
        }
      }
    } catch (error) {
      console.error('Error al exportar horario:', error);
      pushToast('error', 'No se pudo generar el archivo.');
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
    name: '', zone: WAREHOUSE_ZONES[1], equipment: FORKLIFT_TYPES[0],
    shiftPattern: 'Mañana', licenseExpiry: '2027-12-31'
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

  useEffect(() => {
    const isInCurrentView = weekDays.some(d => d.dateStr === selectedMobileDay);
    if (!isInCurrentView) {
      setSelectedMobileDay(weekDays[0].dateStr);
    }
  }, [currentWeekStart, weekDays, selectedMobileDay]);

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
      let newShiftHours = newShiftCode === 'N' ? 8.5 : 8;
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
          if (code === 'N') consecutiveN++; else break;
        }
        for (let i = currentIdx + 1; i < 7; i++) {
          const code = scheduleData[`${operatorId}_${weekDays[i].dateStr}`];
          if (code === 'N') consecutiveN++; else break;
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

  const handleReassign = async (targetOperatorId) => {
    if (!reassignModal) return;
    const shiftCode = reassignShift;
    const newKey = `${targetOperatorId}_${reassignModal.dateStr}`;
    const previousSchedule = { ...scheduleData };

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
    if (!op) { setVacDateError('Selecciona un operador válido.'); return; }
    if (!newVac.startDate || !newVac.endDate) { setVacDateError('Selecciona ambas fechas.'); return; }
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

  const handleExportExecutivePDF = async () => {
    setIsExporting(true);
    try {
      await loadExportLibraries();
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();

      pdf.setFillColor(2, 31, 18);
      pdf.rect(0, 0, W, H, 'F');

      pdf.setFillColor(0, 71, 31);
      pdf.rect(0, 0, W, 25, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text('ShiftForklift — Reporte Ejecutivo', 14, 12);
      pdf.setFontSize(9);
      pdf.setTextColor(167, 243, 208);
      pdf.text(`Semana del ${weekDays[0].dayNumber} ${weekDays[0].monthName} al ${weekDays[6].dayNumber} ${weekDays[6].monthName}`, 14, 19);

      const totalOps = operators.length;
      const licenseOk = operators.filter(op => {
        if (!op.licenseExpiry) return false;
        const exp = new Date(op.licenseExpiry + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return exp >= today;
      }).length;

      let totalWorked = 0, totalAbsent = 0, totalSlots = 0;
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
        { label: 'Licencias OK', value: `${licenseOk}/${totalOps}`, color: [59, 130, 246] },
        { label: 'Operadores', value: `${totalOps}`, color: [168, 85, 247] }
      ];

      const kpiY = 32;
      const kpiH = 20;
      const kpiW = (W - 28 - 9) / 4;
      kpis.forEach((kpi, i) => {
        const x = 14 + i * (kpiW + 3);
        pdf.setFillColor(2, 40, 18);
        pdf.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, 'F');
        pdf.setDrawColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, 'S');
        pdf.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        pdf.setFontSize(7);
        pdf.text(kpi.label.toUpperCase(), x + 3, kpiY + 5);
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.text(kpi.value, x + 3, kpiY + 15);
      });

      let y = kpiY + kpiH + 10;
      pdf.setTextColor(167, 243, 208);
      pdf.setFontSize(11);
      pdf.text('Cobertura por día', 14, y);
      y += 6;

      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Día', 16, y);
      pdf.text('M', 60, y);
      pdf.text('T', 85, y);
      pdf.text('N', 110, y);
      pdf.text('DES', 135, y);
      pdf.text('Ausencias', 165, y);
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
        pdf.text(String(counts.M), 60, y);
        pdf.text(String(counts.T), 85, y);
        pdf.text(String(counts.N), 110, y);
        pdf.text(String(counts.DES), 135, y);
        pdf.setTextColor(239, 68, 68);
        pdf.text(String(counts.VAC + counts.INC), 165, y);
        y += 6;
      });

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
      pdf.text('Total', 175, y);
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
        if (y > H - 25) return;
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

      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Generado el ${new Date().toLocaleString('es-MX')} por ${currentUser?.name || 'Usuario'}`, 14, H - 8);

      const pdfBlob = pdf.output('blob');
      const filename = `Reporte_Ejecutivo_${currentWeekStart}.pdf`;

      if (isMobileDevice()) {
        setExportPreview({ format: 'pdf', blob: pdfBlob, dataUrl: null, filename, mimeType: 'application/pdf', isPdf: true });
      } else {
        forceDownload(pdfBlob, filename);
        pushToast('success', 'Reporte descargado');
      }
    } catch (error) {
      console.error('Error al generar reporte:', error);
      pushToast('error', 'No se pudo generar el reporte');
    } finally {
      setIsExporting(false);
    }
  };

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
            <RefreshCw className="w-4 h-4" /> Reintentar
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

      {/* ✅ Header compacto */}
      <header className="border-b border-emerald-800/60 bg-[#00471f]/90 backdrop-blur sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-12 sm:h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#006029] to-[#003818] border border-emerald-500/30 flex items-center justify-center relative shadow-md">
              <Truck className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-200" />
              <Star className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-red-600 fill-red-600 absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white">ShiftForklift</h1>
              <p className="text-xs text-emerald-300/80">Gestión de Turnos y Personal</p>
            </div>
          </div>

          <nav className="hidden md:flex space-x-1 bg-[#02180d] p-1 rounded-xl border border-emerald-900">
            <button onClick={() => setActiveTab('scheduler')} className={`px-3 py-2 text-xs font-bold rounded-lg ${activeTab === 'scheduler' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>Matriz</button>
            <button onClick={() => setActiveTab('operators')} className={`px-3 py-2 text-xs font-bold rounded-lg ${activeTab === 'operators' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>Personal ({operators.length})</button>
            <button onClick={() => setActiveTab('vacations')} className={`px-3 py-2 text-xs font-bold rounded-lg ${activeTab === 'vacations' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>Permisos</button>
            {canViewReports && (
              <button onClick={() => setActiveTab('reports')} className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${activeTab === 'reports' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>
                <BarChart3 className="w-3 h-3" /> Reportes
              </button>
            )}
          </nav>

          <div className="flex items-center space-x-2">
            {syncStatus !== 'idle' && (
              <div className={`hidden sm:flex items-center space-x-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                syncStatus === 'saving' ? 'bg-amber-950 text-amber-300 border-amber-700/60' :
                syncStatus === 'saved' ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60' :
                'bg-red-950 text-red-300 border-red-700/60'
              }`}>
                {syncStatus === 'saving' && <><Loader2 className="w-3 h-3 animate-spin" /><span>Guardando...</span></>}
                {syncStatus === 'saved' && <><CheckCircle2 className="w-3 h-3" /><span>Guardado</span></>}
                {syncStatus === 'error' && <><CloudOff className="w-3 h-3" /><span>Error</span></>}
              </div>
            )}

            {licenseAlerts.length > 0 && (
              <button
                onClick={() => { setActiveTab('operators'); setShowLicenseAlerts(true); }}
                className="relative p-1.5 sm:p-2 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 rounded-lg sm:rounded-xl transition"
              >
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-extrabold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {licenseAlerts.length}
                </span>
              </button>
            )}

            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white truncate max-w-[100px]">{currentUser.name}</div>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${currentUser.role === 'Admin' ? 'bg-red-900 text-red-200' : currentUser.role === 'Supervisor' ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-950 text-amber-200'}`}>
                {currentUser.role}
              </span>
            </div>
            <button onClick={handleLogout} className="p-1.5 sm:p-2 bg-red-950/80 hover:bg-red-800 border border-red-800 text-red-200 rounded-lg sm:rounded-xl transition" title="Cerrar Sesión">
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ✅ Nav móvil compacto */}
      <nav className="md:hidden sticky top-12 z-20 bg-[#021f12]/95 backdrop-blur border-b border-emerald-900/60">
        <div className="flex gap-1 overflow-x-auto px-2 py-1.5 scrollbar-hide">
          <button onClick={() => setActiveTab('scheduler')} className={`shrink-0 px-2.5 py-1.5 text-[11px] font-bold rounded-md whitespace-nowrap transition ${activeTab === 'scheduler' ? 'bg-emerald-600 text-white' : 'bg-[#02180d] text-emerald-300 border border-emerald-900'}`}>Matriz</button>
          <button onClick={() => setActiveTab('operators')} className={`shrink-0 px-2.5 py-1.5 text-[11px] font-bold rounded-md whitespace-nowrap transition ${activeTab === 'operators' ? 'bg-emerald-600 text-white' : 'bg-[#02180d] text-emerald-300 border border-emerald-900'}`}>Personal ({operators.length})</button>
          <button onClick={() => setActiveTab('vacations')} className={`shrink-0 px-2.5 py-1.5 text-[11px] font-bold rounded-md whitespace-nowrap transition ${activeTab === 'vacations' ? 'bg-emerald-600 text-white' : 'bg-[#02180d] text-emerald-300 border border-emerald-900'}`}>Permisos</button>
          {canViewReports && (
            <button onClick={() => setActiveTab('reports')} className={`shrink-0 px-2.5 py-1.5 text-[11px] font-bold rounded-md whitespace-nowrap flex items-center gap-1 transition ${activeTab === 'reports' ? 'bg-emerald-600 text-white' : 'bg-[#02180d] text-emerald-300 border border-emerald-900'}`}>
              <BarChart3 className="w-3 h-3" /> Reportes
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 mt-2 sm:mt-6">
        {activeTab === 'scheduler' && (
          <div className="space-y-2 sm:space-y-4">
            {isHistoricalWeek && (
              <div className="bg-slate-900/70 border border-slate-600/60 rounded-lg sm:rounded-2xl p-2 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-md sm:rounded-xl bg-slate-800 border border-slate-600/60 flex items-center justify-center shrink-0">
                  <History className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[11px] sm:text-sm font-bold text-slate-100">Semana histórica — Solo lectura</h3>
                  <p className="text-[9px] sm:text-xs text-slate-300 mt-0.5 hidden sm:block">Esta semana ya pasó. Los turnos están bloqueados.</p>
                </div>
                <Lock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
              </div>
            )}

            {/* ✅ Banner bloqueos compacto */}
            {!isHistoricalWeek && lockedCellsInView > 0 && (
              <div className="bg-purple-950/40 border border-purple-700/40 rounded-lg px-2.5 py-1 flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3 text-purple-300 shrink-0" />
                <p className="text-[10px] text-purple-200 text-center leading-tight">
                  {lockedCellsInView} bloqueado(s). <span className="text-purple-300">Toca para reasignar.</span>
                </p>
              </div>
            )}

            {/* ✅ Barra de semana compacta */}
            <div className="bg-[#003818] border border-emerald-800/70 rounded-xl p-2 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => {
                    const [y, m, d] = currentWeekStart.split('-').map(Number);
                    const prevWeek = new Date(y, m - 1, d - 7);
                    setCurrentWeekStart(formatDateLocal(prevWeek));
                  }} className="p-1 bg-[#022415] hover:bg-emerald-900 rounded text-emerald-200 border border-emerald-800/60 transition"><ChevronLeft className="w-3.5 h-3.5"/></button>

                  <div className="text-[10px] sm:text-xs font-bold text-white bg-[#02180d] px-2 py-1 rounded border border-emerald-900 flex items-center gap-1">
                    {isHistoricalWeek && <History className="w-3 h-3 text-slate-400" />}
                    {isCurrentWeek && <Activity className="w-3 h-3 text-emerald-400" />}
                    <span className="whitespace-nowrap">{weekDays[0].dayNumber} {weekDays[0].monthName} - {weekDays[6].dayNumber} {weekDays[6].monthName}</span>
                  </div>

                  <button onClick={() => {
                    const [y, m, d] = currentWeekStart.split('-').map(Number);
                    const nextWeek = new Date(y, m - 1, d + 7);
                    setCurrentWeekStart(formatDateLocal(nextWeek));
                  }} className="p-1 bg-[#022415] hover:bg-emerald-900 rounded text-emerald-200 border border-emerald-800/60 transition"><ChevronRight className="w-3.5 h-3.5"/></button>
                </div>

                <div className="flex items-center gap-1">
                  {!isCurrentWeek && (
                    <button
                      onClick={() => setCurrentWeekStart(getMondayOfCurrentWeek())}
                      className="px-1.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-bold transition flex items-center gap-1"
                    >
                      <Activity className="w-3 h-3" />
                    </button>
                  )}

                  <div className="relative" ref={exportMenuRef}>
                    <button
                      disabled={isExporting}
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-2 py-1 rounded text-xs flex items-center gap-1 transition border border-emerald-500/50 shadow"
                    >
                      {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    </button>
                    {showExportMenu && (
                      <div className="absolute right-0 mt-2 w-44 bg-[#002e14] border border-emerald-700 rounded-lg shadow-2xl z-50 overflow-hidden text-xs">
                        <div className="p-1.5 border-b border-emerald-800 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Formato</div>
                        <button onClick={() => handleExport('png')} className="w-full text-left px-2.5 py-2 text-emerald-100 hover:bg-emerald-800/80 flex items-center gap-2 transition">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /><div className="font-bold text-[11px]">PNG</div>
                        </button>
                        <button onClick={() => handleExport('jpg')} className="w-full text-left px-2.5 py-2 text-emerald-100 hover:bg-emerald-800/80 flex items-center gap-2 transition border-t border-emerald-900/60">
                          <FileImage className="w-3.5 h-3.5 text-amber-400" /><div className="font-bold text-[11px]">JPG</div>
                        </button>
                        <button onClick={() => handleExport('pdf')} className="w-full text-left px-2.5 py-2 text-emerald-100 hover:bg-emerald-800/80 flex items-center gap-2 transition border-t border-emerald-900/60">
                          <FileText className="w-3.5 h-3.5 text-red-400" /><div className="font-bold text-[11px]">PDF</div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3 h-3 text-emerald-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#02180d] border border-emerald-900 rounded pl-6 pr-2 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-700"
                  />
                </div>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="bg-[#02180d] border border-emerald-900 rounded px-1.5 py-1 text-[10px] text-emerald-200 focus:outline-none max-w-[100px]"
                >
                  {WAREHOUSE_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                <button
                  onClick={() => setOnlyExpiringLicenses(v => !v)}
                  className={`px-1.5 py-1 rounded text-[10px] font-bold border transition flex items-center gap-0.5 shrink-0 ${
                    onlyExpiringLicenses
                      ? 'bg-amber-600 border-amber-400 text-white'
                      : 'bg-[#02180d] border-emerald-900 text-emerald-300'
                  }`}
                >
                  <AlertCircle className="w-3 h-3" />
                </button>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="px-1.5 py-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 rounded text-[10px] font-bold transition flex items-center gap-0.5 shrink-0"
                  >
                    <FilterX className="w-3 h-3" /> {activeFiltersCount}
                  </button>
                )}
              </div>

              {activeFiltersCount > 0 && (
                <div className="bg-cyan-950/40 border border-cyan-700/40 rounded px-2 py-0.5 flex items-center gap-1.5 text-[9px] text-cyan-200">
                  <Filter className="w-2.5 h-2.5 text-cyan-300 shrink-0" />
                  <span><span className="font-bold">{filteredOperators.length}</span> de <span className="font-bold">{operators.length}</span></span>
                </div>
              )}
            </div>

            {/* ✅ Vista móvil compacta */}
            <div className="md:hidden space-y-2">
              <div className="flex gap-1 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-hide">
                {weekDays.map(day => {
                  const isToday = day.dateStr === formatDateLocal(now) && isCurrentWeek;
                  const isSelected = day.dateStr === selectedMobileDay;
                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => setSelectedMobileDay(day.dateStr)}
                      className={`shrink-0 flex flex-col items-center justify-center px-2 py-1 rounded-lg border transition min-w-[44px] ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                          : isToday
                          ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                          : 'bg-[#02180d] border-emerald-900 text-emerald-300'
                      }`}
                    >
                      <span className="text-[9px] font-bold uppercase leading-tight">{day.dayName}</span>
                      <span className={`text-sm font-extrabold leading-tight ${day.isWeekend && !isSelected ? 'text-red-400' : ''}`}>{day.dayNumber}</span>
                      {isToday && <span className="text-[7px] font-bold uppercase tracking-wider leading-tight">Hoy</span>}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1">
                {filteredOperators.map(op => {
                  const cellKey = `${op.id}_${selectedMobileDay}`;
                  const shiftCode = scheduleData[cellKey] || 'DES';
                  const shift = SHIFT_TYPES[shiftCode] || SHIFT_TYPES.DES;
                  const IconComp = shift.icon;
                  const isLockedByAbsence = lockedCells.has(cellKey);
                  const editable = canEditCell(op.id, selectedMobileDay);

                  return (
                    <button
                      key={op.id}
                      disabled={!editable && !isLockedByAbsence}
                      onClick={() => {
                        if (isLockedByAbsence && !isHistoricalWeek && canEditShifts) {
                          setReassignModal({ operatorId: op.id, dateStr: selectedMobileDay });
                          setReassignShift('M');
                        } else if (editable) {
                          setSelectedCell({ operatorId: op.id, dateStr: selectedMobileDay, currentShift: shiftCode });
                        }
                      }}
                      className={`w-full flex items-center gap-2 p-1.5 rounded-lg border text-left transition ${shift.color} ${
                        isLockedByAbsence && !isHistoricalWeek ? 'ring-2 ring-purple-400/60' : ''
                      } ${!editable && !isLockedByAbsence ? 'opacity-60' : 'active:scale-[0.98]'}`}
                    >
                      <div className={`shrink-0 w-7 h-7 rounded flex items-center justify-center border ${shift.color}`}>
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[12px] truncate leading-tight">{op.name}</div>
                        <div className="text-[9px] opacity-80 truncate leading-tight">{op.id} · {op.zone}</div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        <span className="font-extrabold text-xs">{shift.code}</span>
                        {(isLockedByAbsence || isHistoricalWeek) && (
                          <Lock className={`w-3 h-3 ${isLockedByAbsence ? 'text-purple-300' : 'text-slate-400'}`} />
                        )}
                      </div>
                    </button>
                  );
                })}

                {filteredOperators.length === 0 && (
                  <div className="bg-[#002812] border border-emerald-800/80 rounded-xl p-6 text-center">
                    {operators.length === 0 ? (
                      <>
                        <Users className="w-8 h-8 text-emerald-700 mx-auto mb-2" />
                        <p className="text-emerald-300 font-bold text-xs">No hay operadores registrados</p>
                      </>
                    ) : (
                      <>
                        <FilterX className="w-8 h-8 text-cyan-700 mx-auto mb-2" />
                        <p className="text-cyan-300 font-bold text-xs">Ningún operador coincide</p>
                        <button
                          onClick={clearAllFilters}
                          className="mt-2 px-2.5 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[10px] font-bold transition inline-flex items-center gap-1"
                        >
                          <FilterX className="w-3 h-3" /> Limpiar
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden md:block">
              <div
                ref={scheduleRef}
                className={`bg-[#002812] border rounded-2xl overflow-hidden shadow-2xl p-1 ${isHistoricalWeek ? 'border-slate-700/70 opacity-[0.97]' : 'border-emerald-800/80'}`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[900px]">
                    <thead>
                      <tr className={`border-b ${isHistoricalWeek ? 'bg-slate-950/80 border-slate-700/70' : 'bg-[#001f0d] border-emerald-800/80'}`}>
                        <th className={`py-3 px-4 text-left text-xs font-bold uppercase w-64 ${isHistoricalWeek ? 'text-slate-300' : 'text-emerald-300'}`}>Montacargista / Área</th>
                        {weekDays.map(day => {
                          const isToday = day.dateStr === formatDateLocal(now);
                          return (
                            <th key={day.dateStr} className={`py-3 px-2 text-center border-l ${isHistoricalWeek ? 'border-slate-800/60' : 'border-emerald-900/60'} ${isToday && isCurrentWeek ? 'bg-emerald-900/40' : ''}`}>
                              <div className={`text-xs font-bold uppercase ${isHistoricalWeek ? 'text-slate-300' : 'text-emerald-200'}`}>{day.dayName}</div>
                              <div className={`text-base font-extrabold ${day.isWeekend ? 'text-red-400' : 'text-white'}`}>{day.dayNumber}</div>
                              {isToday && isCurrentWeek && <div className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider mt-0.5">Hoy</div>}
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
                              <td key={day.dateStr} className={`p-1.5 text-center border-l border-emerald-900/40 ${isToday ? 'bg-emerald-950/30' : ''}`}>
                                <button
                                  disabled={!editable && !isLockedByAbsence}
                                  onClick={() => {
                                    if (isLockedByAbsence && !isHistoricalWeek && canEditShifts) {
                                      setReassignModal({ operatorId: op.id, dateStr: day.dateStr });
                                      setReassignShift('M');
                                    } else if (editable) {
                                      setSelectedCell({ operatorId: op.id, dateStr: day.dateStr, currentShift: shiftCode });
                                    }
                                  }}
                                  title={tooltip}
                                  className={`relative w-full py-2 px-1 rounded-xl border text-xs font-bold flex flex-col items-center justify-center ${shift.color} ${
                                    !editable && !isLockedByAbsence ? 'cursor-not-allowed' : 'hover:scale-105 transition-transform'
                                  } ${isLockedByAbsence && !isHistoricalWeek ? 'ring-2 ring-purple-400/60 shadow-purple-900/40 cursor-pointer' : ''} ${
                                    isHistoricalWeek ? 'grayscale-[0.35] opacity-90' : ''
                                  } ${isCurrentShiftForMe ? 'ring-2 ring-emerald-400/80 shadow-emerald-500/30 shadow-lg' : ''} ${
                                    isFlashing ? 'ring-2 ring-white/80 shadow-white/40 shadow-lg animate-pulse' : ''
                                  }`}
                                >
                                  <IconComp className="w-3.5 h-3.5" />
                                  <span>{shift.code}</span>
                                  {(isLockedByAbsence || isHistoricalWeek) && (
                                    <Lock className={`w-2.5 h-2.5 absolute top-0.5 right-0.5 ${isLockedByAbsence ? 'text-purple-300' : 'text-slate-400'}`} />
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
                                  <FilterX className="w-3.5 h-3.5" /> Limpiar filtros
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
            </div>

            {/* ✅ Indicadores compactos */}
            <div className="flex items-center justify-center gap-1 flex-wrap">
              {isCurrentWeek ? (
                <div className="relative flex items-center gap-1.5 rounded-md border border-emerald-500/60 bg-gradient-to-r from-emerald-950/90 to-[#003818] px-1.5 py-1 shadow-md">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <ActiveShiftIcon className="w-3 h-3 text-emerald-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[8px] font-bold uppercase tracking-wider text-emerald-300 leading-none">En vivo</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-extrabold text-emerald-100 leading-none">{SHIFT_TYPES[activeShiftCode].label}</span>
                      <span className="text-[8px] text-emerald-400 font-mono leading-none hidden sm:inline">{formatTimeLocal(now)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-md border border-slate-700/60 bg-slate-900/60 px-1.5 py-1">
                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400 leading-none">Resumen</div>
                    <div className="text-[10px] font-extrabold text-slate-200 leading-none mt-0.5">{statsDateLabel}</div>
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
                          <li key={a.id}><span className="font-bold">{a.name}</span> ({a.id}) — {a.expired ? `vencida hace ${Math.abs(a.diffDays)} día(s)` : `vence en ${a.diffDays} día(s)`} ({a.licenseExpiry})</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <button onClick={() => setShowLicenseAlerts(false)} className="text-amber-400 hover:text-amber-200 shrink-0"><X className="w-4 h-4" /></button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-[#003818] border border-emerald-800/70 rounded-2xl p-4 gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Plantilla de Montacargistas</h2>
                <p className="text-xs text-emerald-300">Roles y permisos: {currentUser.role}</p>
              </div>
              {canManageOperators && (
                <button onClick={() => {
                  setEditingOperator(null);
                  setNewOp({ name: '', zone: WAREHOUSE_ZONES[1], equipment: FORKLIFT_TYPES[0], shiftPattern: 'Mañana', licenseExpiry: formatDateLocal(new Date()) });
                  setIsAddOperatorOpen(true);
                }} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {operators.map(op => (
                  <div key={op.id} className="bg-[#002812] border border-emerald-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">{op.id}</span>
                          <h3 className="text-base font-bold text-white mt-1">{op.name}</h3>
                        </div>
                        {canManageOperators && (
                          <div className="flex space-x-1 shrink-0">
                            <button onClick={() => { setEditingOperator(op); setNewOp(op); setIsAddOperatorOpen(true); }} className="p-1.5 bg-emerald-900 hover:bg-emerald-700 text-emerald-200 rounded-lg transition"><Pencil className="w-3.5 h-3.5"/></button>
                            <button onClick={() => handleDeleteOperator(op.id)} className="p-1.5 bg-red-950 hover:bg-red-800 text-red-300 rounded-lg transition"><Trash2 className="w-3.5 h-3.5"/></button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5 text-xs text-emerald-200 border-t border-emerald-900/80 pt-3">
                        <div className="flex justify-between gap-2"><span>Zona:</span><span className="font-semibold text-white text-right">{op.zone}</span></div>
                        <div className="flex justify-between gap-2"><span>Equipo:</span><span className="font-semibold text-white text-right">{op.equipment}</span></div>
                        <div className="flex justify-between gap-2"><span>Turno Base:</span><span className="font-semibold text-white">{op.shiftPattern}</span></div>
                        <div className="flex justify-between items-center pt-1 gap-2">
                          <span>Licencia DC3:</span>
                          <span className={`px-2 py-0.5 rounded border text-[11px] ${getLicenseStatusStyle(op.licenseExpiry)}`}>{op.licenseExpiry || 'N/A'}</span>
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-[#003818] border border-emerald-800/70 rounded-2xl p-4 gap-3">
              <h2 className="text-base sm:text-lg font-bold text-white">Solicitudes de Ausencia</h2>
              <button
                disabled={operators.length === 0}
                onClick={() => {
                  setVacDateError('');
                  setNewVac(prev => ({ ...prev, operatorId: operators[0]?.id || '' }));
                  setIsRequestVacationOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition"
              >
                <Plus className="w-4 h-4"/><span>Registrar Solicitud</span>
              </button>
            </div>

            <div className="md:hidden space-y-2">
              {vacationRequests.map(req => (
                <div key={req.id} className="bg-[#002812] border border-emerald-800/80 rounded-2xl p-3.5">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm">{req.operatorName}</div>
                      <div className="text-[10px] text-emerald-400">{req.operatorId}</div>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1 ${
                      req.status === 'Aprobado' ? 'bg-emerald-950 text-emerald-300' : 
                      req.status === 'Rechazado' ? 'bg-red-950 text-red-300' : 
                      'bg-amber-950 text-amber-300'
                    }`}>
                      {req.status === 'Aprobado' && <Lock className="w-2.5 h-2.5" />}
                      {req.status}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-200 space-y-1">
                    <div><span className="text-emerald-400">Tipo:</span> {req.type}</div>
                    <div><span className="text-emerald-400">Periodo:</span> {req.startDate} al {req.endDate}</div>
                    <div className="text-white/80 text-[11px]"><span className="text-emerald-400">Motivo:</span> {req.reason}</div>
                  </div>
                  {req.status === 'Pendiente' && canApproveVacations && (
                    <div className="flex justify-end space-x-1 mt-3 pt-3 border-t border-emerald-900/60">
                      <button onClick={() => handleVacationStatus(req.id, 'Aprobado')} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition"><Check className="w-3.5 h-3.5"/> Aprobar</button>
                      <button onClick={() => handleVacationStatus(req.id, 'Rechazado')} className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition"><X className="w-3.5 h-3.5"/> Rechazar</button>
                    </div>
                  )}
                </div>
              ))}
              {vacationRequests.length === 0 && (
                <div className="bg-[#002812] border border-emerald-800/80 rounded-2xl p-8 text-center">
                  <CalendarIcon className="w-10 h-10 text-emerald-700 mx-auto mb-2" />
                  <p className="text-emerald-300 font-bold text-sm">Sin solicitudes</p>
                </div>
              )}
            </div>

            <div className="hidden md:block bg-[#002812] border border-emerald-800/80 rounded-2xl overflow-hidden shadow-xl">
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
                            <button onClick={() => handleVacationStatus(req.id, 'Aprobado')} className="p-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition"><Check className="w-4 h-4"/></button>
                            <button onClick={() => handleVacationStatus(req.id, 'Rechazado')} className="p-1.5 bg-red-800 hover:bg-red-700 text-white rounded-lg transition"><X className="w-4 h-4"/></button>
                            <button onClick={() => handleCancelVacationRequest(req.id)} className="p-1.5 bg-[#011a0d] hover:bg-red-950 text-emerald-400 hover:text-red-300 border border-emerald-800 rounded-lg transition"><Trash2 className="w-4 h-4"/></button>
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

        {activeTab === 'reports' && canViewReports && (
          <div className="space-y-5">
            <div className="bg-[#003818] border border-emerald-800/70 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">Reportes Ejecutivos</h2>
                  <p className="text-xs text-emerald-300">KPIs de la semana actual</p>
                </div>
              </div>
              <button
                onClick={handleExportExecutivePDF}
                disabled={isExporting}
                className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition border border-emerald-500/50"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Exportar PDF
              </button>
            </div>

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
                    <div className="rounded-2xl border border-emerald-700/60 bg-emerald-950/70 p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                        <span className="text-[10px] font-bold uppercase text-emerald-300">Cobertura</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-extrabold text-emerald-100">{coverage}%</div>
                      <div className="text-[10px] text-emerald-400/70 mt-0.5">{totalWorked}/{totalSlots}</div>
                    </div>
                    <div className="rounded-2xl border border-red-700/60 bg-red-950/70 p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-300" />
                        <span className="text-[10px] font-bold uppercase text-red-300">Ausentismo</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-extrabold text-red-100">{absentPct}%</div>
                      <div className="text-[10px] text-red-400/70 mt-0.5">{totalAbsent} ausencias</div>
                    </div>
                    <div className="rounded-2xl border border-cyan-700/60 bg-cyan-950/70 p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
                        <span className="text-[10px] font-bold uppercase text-cyan-300">Licencias</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-extrabold text-cyan-100">{licenseOk}/{operators.length}</div>
                      <div className="text-[10px] text-cyan-400/70 mt-0.5">{operators.length - licenseOk} críticas</div>
                    </div>
                    <div className="rounded-2xl border border-purple-700/60 bg-purple-950/70 p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Users2 className="w-3.5 h-3.5 text-purple-300" />
                        <span className="text-[10px] font-bold uppercase text-purple-300">Plantilla</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-extrabold text-purple-100">{operators.length}</div>
                      <div className="text-[10px] text-purple-400/70 mt-0.5">operadores</div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="bg-[#002812] border border-emerald-800/80 rounded-2xl p-3 sm:p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-400" />
                Cobertura por día
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                  <thead>
                    <tr className="text-emerald-300 font-bold uppercase border-b border-emerald-800/80">
                      <th className="p-2">Día</th>
                      <th className="p-2 text-center">M</th>
                      <th className="p-2 text-center">T</th>
                      <th className="p-2 text-center">N</th>
                      <th className="p-2 text-center">DES</th>
                      <th className="p-2 text-center">VAC</th>
                      <th className="p-2 text-center">INC</th>
                      <th className="p-2 text-center">%</th>
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
                          <td className="p-2 font-bold text-white whitespace-nowrap">{day.dayName} {day.dayNumber}</td>
                          <td className="p-2 text-center text-emerald-300 font-bold">{counts.M}</td>
                          <td className="p-2 text-center text-amber-300 font-bold">{counts.T}</td>
                          <td className="p-2 text-center text-indigo-300 font-bold">{counts.N}</td>
                          <td className="p-2 text-center text-slate-400">{counts.DES}</td>
                          <td className="p-2 text-center text-purple-300">{counts.VAC}</td>
                          <td className="p-2 text-center text-red-300">{counts.INC}</td>
                          <td className={`p-2 text-center font-extrabold ${color}`}>{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#002812] border border-emerald-800/80 rounded-2xl p-3 sm:p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Horas por operador
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[450px]">
                  <thead>
                    <tr className="text-emerald-300 font-bold uppercase border-b border-emerald-800/80">
                      <th className="p-2">Operador</th>
                      <th className="p-2">Zona</th>
                      <th className="p-2 text-center">M</th>
                      <th className="p-2 text-center">T</th>
                      <th className="p-2 text-center">N</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/50">
                    {operators.map(op => {
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
                      const isHigh = totalH > 48;
                      return (
                        <tr key={op.id} className="hover:bg-[#003517]/50">
                          <td className="p-2 font-bold text-white whitespace-nowrap">{op.name}</td>
                          <td className="p-2 text-emerald-200 text-[11px]">{op.zone}</td>
                          <td className="p-2 text-center text-emerald-300">{c.M}</td>
                          <td className="p-2 text-center text-amber-300">{c.T}</td>
                          <td className="p-2 text-center text-indigo-300">{c.N}</td>
                          <td className={`p-2 text-right font-extrabold ${isHigh ? 'text-red-400' : 'text-emerald-300'}`}>{totalH.toFixed(1)}h</td>
                        </tr>
                      );
                    })}
                    {operators.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-emerald-400/70">Sin operadores</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {selectedCell && canEditShifts && !isHistoricalWeek && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#002e14] border border-emerald-700 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Cambiar Turno</h3>
                <p className="text-xs text-emerald-300 font-semibold">{selectedOperator?.name || ''}</p>
                <p className="text-[11px] text-emerald-400/80">Día: {selectedCell.dateStr}</p>
              </div>
              <button onClick={() => { setSelectedCell(null); setApplyToFullWeek(false); }} className="text-emerald-400 hover:text-white p-1"><X className="w-5 h-5"/></button>
            </div>

            <div className="mb-4 bg-[#011a0d] p-3 rounded-xl border border-emerald-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-200">Aplicar a toda la semana</span>
              </div>
              <input
                type="checkbox"
                id="applyWeekCheckbox"
                checked={applyToFullWeek}
                onChange={(e) => setApplyToFullWeek(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SHIFT_TYPES).map(([code, config]) => (
                <button
                  key={code}
                  onClick={() => handleSetShift(selectedCell.operatorId, selectedCell.dateStr, code, applyToFullWeek)}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${config.color}`}
                >
                  {code}: {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {reassignModal && reassignTarget && canEditShifts && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#002e14] border border-purple-700 rounded-t-2xl sm:rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-purple-400" />
                  Reasignación Inteligente
                </h3>
                <p className="text-xs text-purple-300 font-semibold mt-1">{reassignTarget.name} — {reassignModal.dateStr}</p>
              </div>
              <button onClick={() => setReassignModal(null)} className="text-emerald-400 hover:text-white p-1"><X className="w-5 h-5"/></button>
            </div>

            <div className="mb-3">
              <label className="block text-[10px] font-bold uppercase text-emerald-400 mb-1.5">Turno a cubrir</label>
              <div className="grid grid-cols-3 gap-2">
                {['M', 'T', 'N'].map(code => (
                  <button
                    key={code}
                    onClick={() => setReassignShift(code)}
                    className={`p-2 rounded-lg border text-xs font-bold transition ${
                      reassignShift === code
                        ? SHIFT_TYPES[code].color + ' ring-2 ring-white/60'
                        : 'bg-[#011a0d] border-emerald-800 text-emerald-300 hover:bg-emerald-950'
                    }`}
                  >
                    {SHIFT_TYPES[code].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border-t border-emerald-900/60 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase text-emerald-400">Candidatos ({reassignCandidates.length})</span>
              </div>

              {reassignCandidates.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-amber-300 font-bold text-xs">No hay candidatos disponibles</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reassignCandidates.map(c => {
                    const best = c.score >= 60;
                    const ok = c.score >= 0 && c.score < 60;
                    const bad = c.score < 0;
                    const borderColor = best ? 'border-emerald-600/60' : ok ? 'border-amber-600/60' : 'border-red-600/60';
                    const bgColor = best ? 'bg-emerald-950/60' : ok ? 'bg-amber-950/40' : 'bg-red-950/40';
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleReassign(c.id)}
                        className={`w-full text-left p-3 rounded-xl border ${borderColor} ${bgColor} hover:scale-[1.01] active:scale-[0.99] transition-all`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm truncate">{c.name}</span>
                              {best && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-700 text-white">ÓPTIMO</span>}
                              {ok && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-700 text-white">ACEPTABLE</span>}
                              {bad && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-700 text-white">NO REC.</span>}
                            </div>
                            <div className="text-[10px] text-emerald-300/80 mt-0.5">{c.id} · {c.zone}</div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {c.reasons.map((r, i) => (
                                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">{r}</span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-lg font-extrabold ${best ? 'text-emerald-300' : ok ? 'text-amber-300' : 'text-red-300'}`}>{c.score}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-emerald-900/60 flex justify-end">
              <button onClick={() => setReassignModal(null)} className="px-4 py-2 bg-emerald-950 text-emerald-300 rounded-xl font-bold text-xs hover:bg-emerald-900 transition">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {isAddOperatorOpen && canManageOperators && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#002e14] border border-emerald-700 rounded-t-2xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-4">{editingOperator ? 'Editar Operador' : 'Registrar Operador'}</h3>
            <form onSubmit={handleSaveOperator} className="space-y-3 text-xs">
              <div>
                <label className="block text-emerald-300 font-bold mb-1">Nombre Completo</label>
                <input type="text" required placeholder="Ej. Juan Pérez" value={newOp.name} onChange={(e) => setNewOp({ ...newOp, name: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-emerald-300 font-bold mb-1">Zona de Trabajo</label>
                <select value={newOp.zone} onChange={(e) => setNewOp({ ...newOp, zone: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none">
                  {WAREHOUSE_ZONES.filter(z => z !== 'Todas las zonas').map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-emerald-300 font-bold mb-1">Tipo de Equipo</label>
                <select value={newOp.equipment} onChange={(e) => setNewOp({ ...newOp, equipment: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none">
                  {FORKLIFT_TYPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-emerald-300 font-bold mb-1">Turno Base</label>
                <select value={newOp.shiftPattern} onChange={(e) => setNewOp({ ...newOp, shiftPattern: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none">
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noche">Noche</option>
                </select>
              </div>
              <div>
                <label className="block text-emerald-300 font-bold mb-1">Vencimiento Licencia DC3</label>
                <input type="date" required value={newOp.licenseExpiry} onChange={(e) => setNewOp({ ...newOp, licenseExpiry: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none" />
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button type="button" onClick={() => setIsAddOperatorOpen(false)} className="px-4 py-2 bg-emerald-950 text-emerald-300 rounded-xl font-bold hover:bg-emerald-900 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRequestVacationOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#002e14] border border-emerald-700 rounded-t-2xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-4">Registrar Solicitud de Permiso</h3>
            <form onSubmit={handleCreateVacationRequest} className="space-y-3 text-xs">
              {vacDateError && (
                <div className="p-2.5 bg-red-950/80 border border-red-800 rounded-xl text-red-200 font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{vacDateError}</span>
                </div>
              )}
              <div>
                <label className="block text-emerald-300 font-bold mb-1">Operador</label>
                <select value={newVac.operatorId} onChange={(e) => setNewVac({ ...newVac, operatorId: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none">
                  {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-emerald-300 font-bold mb-1">Tipo de Ausencia</label>
                <select value={newVac.type} onChange={(e) => setNewVac({ ...newVac, type: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none">
                  {ABSENCE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-emerald-300 font-bold mb-1">Fecha Inicio</label>
                  <input type="date" value={newVac.startDate} onChange={(e) => setNewVac({ ...newVac, startDate: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-emerald-300 font-bold mb-1">Fecha Fin</label>
                  <input type="date" min={newVac.startDate} value={newVac.endDate} onChange={(e) => setNewVac({ ...newVac, endDate: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-emerald-300 font-bold mb-1">Motivo / Razón</label>
                <textarea rows={3} placeholder="Escribe la razón..." value={newVac.reason} onChange={(e) => setNewVac({ ...newVac, reason: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none" />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => { setIsRequestVacationOpen(false); setVacDateError(''); }} className="px-4 py-2 bg-emerald-950 text-emerald-300 rounded-xl font-bold hover:bg-emerald-900 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition">Enviar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {exportPreview && (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col">
          <div className="p-3 bg-[#003818] border-b border-emerald-700 flex justify-between items-center shrink-0">
            <div className="min-w-0">
              <h3 className="text-white font-bold text-sm truncate">
                {exportPreview.isPdf ? 'Guardar PDF' : 'Guardar imagen'}
              </h3>
              <p className="text-[10px] text-emerald-300 truncate">{exportPreview.filename}</p>
            </div>
            <button
              onClick={() => setExportPreview(null)}
              className="p-1.5 text-emerald-400 hover:text-white shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-3 bg-[#021f12]">
            {exportPreview.isPdf ? (
              <div className="text-center px-4">
                <div className="w-20 h-20 rounded-2xl bg-red-950 border border-red-700/60 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-red-300" />
                </div>
                <p className="text-white font-bold text-base mb-1">PDF generado</p>
                <p className="text-emerald-300 text-xs break-all">{exportPreview.filename}</p>
                <p className="text-emerald-500 text-[11px] mt-4 max-w-xs mx-auto">
                  Toca <span className="font-bold text-emerald-300">"Compartir"</span> abajo para guardarlo en Archivos, o compartirlo por WhatsApp/correo.
                </p>
              </div>
            ) : (
              <img
                src={exportPreview.dataUrl}
                alt="Preview"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-auto"
                style={{ WebkitTouchCallout: 'default', WebkitUserSelect: 'auto' }}
              />
            )}
          </div>

          <div className="p-3 bg-[#003818] border-t border-emerald-700 space-y-2 shrink-0">
            {!exportPreview.isPdf && (
              <div className="bg-emerald-950/60 border border-emerald-700/60 rounded-lg px-3 py-2 text-center">
                <p className="text-[11px] text-emerald-200 leading-snug">
                  💡 <span className="font-bold">Mantén presionada la imagen</span> para guardarla en tu galería
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={async () => {
                  if (navigator.share && navigator.canShare) {
                    try {
                      const file = new File([exportPreview.blob], exportPreview.filename, { type: exportPreview.mimeType });
                      if (navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: exportPreview.filename });
                        setExportPreview(null);
                        pushToast('success', 'Compartido');
                      } else {
                        pushToast('warning', 'Tu navegador no permite compartir este archivo');
                      }
                    } catch (err) {
                      if (err.name !== 'AbortError') {
                        pushToast('error', 'No se pudo compartir');
                      }
                    }
                  } else {
                    pushToast('warning', 'Compartir no está disponible en este navegador');
                  }
                }}
                className="py-3 bg-emerald-700 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Share2 className="w-4 h-4" />
                Compartir
              </button>

              <button
                onClick={() => {
                  forceDownload(exportPreview.blob, exportPreview.filename);
                  pushToast('info', 'Si no se descarga, mantén presionada la imagen');
                  setExportPreview(null);
                }}
                className="py-3 bg-emerald-700 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                Descargar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
