import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  RefreshCw
} from 'lucide-react';

// ⚠️ ADVERTENCIA DE SEGURIDAD:
// Esta lista de usuarios vive en el bundle de React y es visible para cualquiera
// que inspeccione el código del cliente (DevTools > Sources). Es válida solo para
// demos/prototipos. Para producción, reemplaza este login por autenticación real
// en el servidor (p. ej. NextAuth, Supabase Auth, Clerk, o un endpoint propio que
// verifique credenciales con hash bcrypt/argon2 y devuelva un token de sesión).
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

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 30000;

const formatDateLocal = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

  const reportSyncResult = (ok) => {
    setSyncStatus(ok ? 'saved' : 'error');
    if (syncStatusTimeoutRef.current) clearTimeout(syncStatusTimeoutRef.current);
    syncStatusTimeoutRef.current = setTimeout(() => setSyncStatus('idle'), ok ? 2000 : 4000);
  };

  const [showLicenseAlerts, setShowLicenseAlerts] = useState(true);
  const [vacDateError, setVacDateError] = useState('');

  const [activeTab, setActiveTab] = useState('scheduler');

  // ✅ Estados SIN seeds: arrancan vacíos y solo se llenan desde Redis.
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

  // Cuenta regresiva del bloqueo de acceso
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

  // Cierra el menú de exportación al hacer clic fuera
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

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

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
    } catch (error) {
      console.error('Error al exportar horario:', error);
      alert('No se pudo generar la descarga. Intente nuevamente.');
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

  // ✅ CARGA INICIAL SIN SEEDS
  // Solo se cargan los datos que existan en Redis. Si está vacío, la app
  // arranca sin operadores y tú los agregas manualmente.
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

  // Polling: solo arranca DESPUÉS de la carga inicial exitosa
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

  // Autollenado de turnos base: solo para operadores que existan en Redis.
  // No siembra operadores nuevos, solo rellena celdas vacías.
  useEffect(() => {
    if (!isLoaded || isUpdatingRef.current) return;
    if (operators.length === 0) return;

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
      redis.set('sf_scheduleData', newSchedule).catch(console.error);
    }
  }, [operators, weekDays, isLoaded]);

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
    return operators.filter(op => {
      const matchesSearch = op.name.toLowerCase().includes(searchQuery.toLowerCase()) || op.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesZone = selectedZone === 'Todas las zonas' || op.zone === selectedZone;
      return matchesSearch && matchesZone;
    });
  }, [operators, searchQuery, selectedZone]);

  const handleSetShift = async (operatorId, dateStr, shiftCode, isFullWeek = false) => {
    if (!canEditShifts) return;
    isUpdatingRef.current = true;
    setSyncStatus('saving');

    const updatedSchedule = { ...scheduleData };

    if (isFullWeek) {
      weekDays.forEach(day => {
        updatedSchedule[`${operatorId}_${day.dateStr}`] = shiftCode;
      });
    } else {
      updatedSchedule[`${operatorId}_${dateStr}`] = shiftCode;
    }

    setScheduleData(updatedSchedule);
    setSelectedCell(null);
    setApplyToFullWeek(false);

    try {
      await redis.set('sf_scheduleData', updatedSchedule);
      reportSyncResult(true);
    } catch (error) {
      console.error('Error al guardar turno:', error);
      reportSyncResult(false);
    } finally {
      setTimeout(() => { isUpdatingRef.current = false; }, 2500);
    }
  };

  const handleSaveOperator = async (e) => {
    e.preventDefault();
    if (!newOp.name || !canManageOperators) return;

    isUpdatingRef.current = true;
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
    } catch (error) {
      console.error('Error al guardar operador:', error);
      reportSyncResult(false);
    } finally {
      setTimeout(() => { isUpdatingRef.current = false; }, 2500);
    }
  };

  const handleDeleteOperator = async (operatorId) => {
    if (!canManageOperators) return;

    if (window.confirm('¿Estás seguro de que deseas eliminar este montacargista?')) {
      isUpdatingRef.current = true;
      setSyncStatus('saving');

      const updatedOps = operators.filter(op => op.id !== operatorId);
      setOperators(updatedOps);

      try {
        await redis.set('sf_operators', updatedOps);
        reportSyncResult(true);
      } catch (error) {
        console.error('Error al eliminar en la base de datos:', error);
        reportSyncResult(false);
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

    const updatedVac = [newReq, ...vacationRequests];
    setVacationRequests(updatedVac);
    setIsRequestVacationOpen(false);

    try {
      await redis.set('sf_vacations', updatedVac);
      reportSyncResult(true);
    } catch (error) {
      console.error('Error al guardar permiso:', error);
      reportSyncResult(false);
    } finally {
      setTimeout(() => { isUpdatingRef.current = false; }, 2500);
    }
  };

  const handleCancelVacationRequest = async (id) => {
    if (!canApproveVacations) return;
    if (!window.confirm('¿Cancelar esta solicitud de permiso?')) return;

    isUpdatingRef.current = true;
    setSyncStatus('saving');
    const updatedVac = vacationRequests.filter(r => r.id !== id);
    setVacationRequests(updatedVac);

    try {
      await redis.set('sf_vacations', updatedVac);
      reportSyncResult(true);
    } catch (error) {
      console.error('Error al cancelar permiso:', error);
      reportSyncResult(false);
    } finally {
      setTimeout(() => { isUpdatingRef.current = false; }, 2500);
    }
  };

  const handleVacationStatus = async (id, newStatus) => {
    if (!canApproveVacations) return;
    isUpdatingRef.current = true;
    setSyncStatus('saving');

    const req = vacationRequests.find(r => r.id === id);
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
    } catch (error) {
      console.error('Error al actualizar estado del permiso:', error);
      reportSyncResult(false);
    } finally {
      setTimeout(() => { isUpdatingRef.current = false; }, 2500);
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

  // ✅ Pantalla de carga: nada se muestra hasta que Redis responde
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

  // ✅ Pantalla de error si Redis no responde
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

  return (
    <div className="min-h-screen bg-[#021f12] text-emerald-50 font-sans pb-12">
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
            <button onClick={() => setActiveTab('scheduler')} className={`px-4 py-2 text-xs font-bold rounded-lg ${activeTab === 'scheduler' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>Matriz</button>
            <button onClick={() => setActiveTab('operators')} className={`px-4 py-2 text-xs font-bold rounded-lg ${activeTab === 'operators' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>Personal ({operators.length})</button>
            <button onClick={() => setActiveTab('vacations')} className={`px-4 py-2 text-xs font-bold rounded-lg ${activeTab === 'vacations' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>Permisos</button>
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
          <div className="space-y-5">
            <div className="bg-[#003818] border border-emerald-800/70 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <button onClick={() => {
                  const [y, m, d] = currentWeekStart.split('-').map(Number);
                  const prevWeek = new Date(y, m - 1, d - 7);
                  setCurrentWeekStart(formatDateLocal(prevWeek));
                }} className="p-2 bg-[#022415] hover:bg-emerald-900 rounded-xl text-emerald-200 border border-emerald-800/60 transition"><ChevronLeft className="w-5 h-5"/></button>

                <div className="text-xs sm:text-sm font-bold text-white bg-[#02180d] px-4 py-2 rounded-xl border border-emerald-900">
                  Plan Semanal: {weekDays[0].dayNumber} {weekDays[0].monthName} - {weekDays[6].dayNumber} {weekDays[6].monthName}
                </div>

                <button onClick={() => {
                  const [y, m, d] = currentWeekStart.split('-').map(Number);
                  const nextWeek = new Date(y, m - 1, d + 7);
                  setCurrentWeekStart(formatDateLocal(nextWeek));
                }} className="p-2 bg-[#022415] hover:bg-emerald-900 rounded-xl text-emerald-200 border border-emerald-800/60 transition"><ChevronRight className="w-5 h-5"/></button>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
                <input
                  type="text"
                  placeholder="Buscar operador..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#02180d] border border-emerald-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="bg-[#02180d] border border-emerald-900 rounded-xl px-3 py-2 text-xs text-emerald-200"
                >
                  {WAREHOUSE_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>

                <div className="relative" ref={exportMenuRef}>
                  <button
                    disabled={isExporting}
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-2 transition border border-emerald-500/50 shadow"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Exportar Horario</span>
                      </>
                    )}
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-52 bg-[#002e14] border border-emerald-700 rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
                      <div className="p-2 border-b border-emerald-800 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        Selecciona el formato
                      </div>
                      <button
                        onClick={() => handleExport('png')}
                        className="w-full text-left px-3 py-2.5 text-emerald-100 hover:bg-emerald-800/80 flex items-center space-x-2 transition"
                      >
                        <ImageIcon className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="font-bold">Imagen PNG</div>
                          <div className="text-[10px] text-emerald-400/80">Alta calidad con transparencia</div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleExport('jpg')}
                        className="w-full text-left px-3 py-2.5 text-emerald-100 hover:bg-emerald-800/80 flex items-center space-x-2 transition border-t border-emerald-900/60"
                      >
                        <FileImage className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="font-bold">Imagen JPG</div>
                          <div className="text-[10px] text-emerald-400/80">Formato ligero ideal para compartir</div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleExport('pdf')}
                        className="w-full text-left px-3 py-2.5 text-emerald-100 hover:bg-emerald-800/80 flex items-center space-x-2 transition border-t border-emerald-900/60"
                      >
                        <FileText className="w-4 h-4 text-red-400" />
                        <div>
                          <div className="font-bold">Documento PDF</div>
                          <div className="text-[10px] text-emerald-400/80">Listo para imprimir en hoja A4</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div ref={scheduleRef} className="bg-[#002812] border border-emerald-800/80 rounded-2xl overflow-hidden shadow-2xl p-1">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-[#001f0d] border-b border-emerald-800/80">
                      <th className="py-3.5 px-4 text-left text-xs font-bold text-emerald-300 uppercase w-64">Montacargista / Área</th>
                      {weekDays.map(day => (
                        <th key={day.dateStr} className="py-3.5 px-2 text-center border-l border-emerald-900/60">
                          <div className="text-xs font-bold text-emerald-200 uppercase">{day.dayName}</div>
                          <div className={`text-base font-extrabold ${day.isWeekend ? 'text-red-400' : 'text-white'}`}>{day.dayNumber}</div>
                        </th>
                      ))}
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
                          return (
                            <td key={day.dateStr} className="p-1.5 text-center border-l border-emerald-900/40">
                              <button
                                disabled={!canEditShifts}
                                onClick={() => setSelectedCell({ operatorId: op.id, dateStr: day.dateStr, currentShift: shiftCode })}
                                className={`w-full py-2 px-1 rounded-xl border text-xs font-bold flex flex-col items-center justify-center ${shift.color} ${!canEditShifts ? 'cursor-default opacity-90' : 'hover:scale-105 transition-transform'}`}
                              >
                                <IconComp className="w-3.5 h-3.5" />
                                <span>{shift.code}</span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {filteredOperators.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center">
                          <Users className="w-10 h-10 text-emerald-700 mx-auto mb-2" />
                          <p className="text-emerald-300 font-bold text-sm">No hay operadores registrados</p>
                          <p className="text-emerald-500 text-xs mt-1">
                            {canManageOperators ? 'Ve a la pestaña "Personal" para agregar el primero.' : 'Pídele a un administrador que registre personal.'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
                    name: '',
                    zone: WAREHOUSE_ZONES[1],
                    equipment: FORKLIFT_TYPES[0],
                    shiftPattern: 'Mañana',
                    licenseExpiry: formatDateLocal(new Date())
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
                <p className="text-xs text-emerald-400/80 mb-4">
                  {canManageOperators ? 'Agrega el primer montacargista para comenzar a planear turnos.' : 'Pídele a un administrador que registre personal.'}
                </p>
                {canManageOperators && (
                  <button
                    onClick={() => {
                      setEditingOperator(null);
                      setNewOp({
                        name: '',
                        zone: WAREHOUSE_ZONES[1],
                        equipment: FORKLIFT_TYPES[0],
                        shiftPattern: 'Mañana',
                        licenseExpiry: formatDateLocal(new Date())
                      });
                      setIsAddOperatorOpen(true);
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center space-x-2 transition"
                  >
                    <Plus className="w-4 h-4"/><span>Agregar primer operador</span>
                  </button>
                )}
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
                        <span className={`px-2 py-0.5 rounded font-bold ${req.status === 'Aprobado' ? 'bg-emerald-950 text-emerald-300' : req.status === 'Rechazado' ? 'bg-red-950 text-red-300' : 'bg-amber-950 text-amber-300'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {req.status === 'Pendiente' && canApproveVacations ? (
                          <div className="flex justify-center space-x-1">
                            <button onClick={() => handleVacationStatus(req.id, 'Aprobado')} className="p-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition" title="Aprobar"><Check className="w-4 h-4"/></button>
                            <button onClick={() => handleVacationStatus(req.id, 'Rechazado')} className="p-1.5 bg-red-800 hover:bg-red-700 text-white rounded-lg transition" title="Rechazar"><X className="w-4 h-4"/></button>
                            <button onClick={() => handleCancelVacationRequest(req.id)} className="p-1.5 bg-[#011a0d] hover:bg-red-950 text-emerald-400 hover:text-red-300 border border-emerald-800 rounded-lg transition" title="Cancelar solicitud"><Trash2 className="w-4 h-4"/></button>
                          </div>
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
                        <p className="text-emerald-500 text-xs mt-1">Aún no hay permisos registrados.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {selectedCell && canEditShifts && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#002e14] border border-emerald-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Cambiar Turno</h3>
                <p className="text-xs text-emerald-300 font-semibold">{selectedOperator?.name || ''}</p>
                <p className="text-[11px] text-emerald-400/80">Día seleccionado: {selectedCell.dateStr}</p>
              </div>
              <button onClick={() => { setSelectedCell(null); setApplyToFullWeek(false); }} className="text-emerald-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            <div className="mb-4 bg-[#011a0d] p-3 rounded-xl border border-emerald-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-200">Aplicar a toda la semana (Lun - Dom)</span>
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

      {isAddOperatorOpen && canManageOperators && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#002e14] border border-emerald-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">{editingOperator ? 'Editar Operador' : 'Registrar Operador'}</h3>
            <form onSubmit={handleSaveOperator} className="space-y-3 text-xs">
              <div>
                <label className="block text-emerald-300 font-bold mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={newOp.name}
                  onChange={(e) => setNewOp({ ...newOp, name: e.target.value })}
                  className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-emerald-300 font-bold mb-1">Zona de Trabajo</label>
                <select
                  value={newOp.zone}
                  onChange={(e) => setNewOp({ ...newOp, zone: e.target.value })}
                  className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  {WAREHOUSE_ZONES.filter(z => z !== 'Todas las zonas').map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-emerald-300 font-bold mb-1">Tipo de Equipo</label>
                <select
                  value={newOp.equipment}
                  onChange={(e) => setNewOp({ ...newOp, equipment: e.target.value })}
                  className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  {FORKLIFT_TYPES.map(eq => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-emerald-300 font-bold mb-1">Turno Base</label>
                <select
                  value={newOp.shiftPattern}
                  onChange={(e) => setNewOp({ ...newOp, shiftPattern: e.target.value })}
                  className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noche">Noche</option>
                </select>
              </div>

              <div>
                <label className="block text-emerald-300 font-bold mb-1">Vencimiento Licencia DC3</label>
                <input
                  type="date"
                  required
                  value={newOp.licenseExpiry}
                  onChange={(e) => setNewOp({ ...newOp, licenseExpiry: e.target.value })}
                  className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#002e14] border border-emerald-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
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
                <select value={newVac.operatorId} onChange={(e) => setNewVac({ ...newVac, operatorId: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2 text-white focus:outline-none">
                  {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-emerald-300 font-bold mb-1">Tipo de Ausencia</label>
                <select value={newVac.type} onChange={(e) => setNewVac({ ...newVac, type: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2 text-white focus:outline-none">
                  {ABSENCE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-emerald-300 font-bold mb-1">Fecha Inicio</label>
                  <input type="date" value={newVac.startDate} onChange={(e) => setNewVac({ ...newVac, startDate: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2 text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-emerald-300 font-bold mb-1">Fecha Fin</label>
                  <input type="date" min={newVac.startDate} value={newVac.endDate} onChange={(e) => setNewVac({ ...newVac, endDate: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2 text-white focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-emerald-300 font-bold mb-1">Motivo / Razón</label>
                <textarea rows={3} placeholder="Escribe la razón detallada..." value={newVac.reason} onChange={(e) => setNewVac({ ...newVac, reason: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2 text-white focus:outline-none" />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => { setIsRequestVacationOpen(false); setVacDateError(''); }} className="px-4 py-2 bg-emerald-950 text-emerald-300 rounded-xl font-bold hover:bg-emerald-900 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition">Enviar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
