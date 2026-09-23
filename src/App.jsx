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
Copy,
BarChart3,
RefreshCw,
Printer,
Sparkles
} from 'lucide-react';

// MOCK DE USUARIOS (Sustituir por autenticación de servidor para entorno de producción real)
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

const INITIAL_OPERATORS = [
{ id: 'M-101', name: 'Carlos Mendoza', zone: 'Pasillos Alta Montaña (Reach)', equipment: 'Hombre Parado (Reach)', shiftPattern: 'Mañana', licenseExpiry: '2026-11-15', status: 'Activo' },
{ id: 'M-102', name: 'Ricardo Salarmilla Osornio', zone: 'Materiales / Entrada a Línea', equipment: 'Hombre Sentado (Eléctrico)', shiftPattern: 'Mañana', licenseExpiry: '2026-08-31', status: 'Activo' },
{ id: 'M-103', name: 'Jesús León', zone: 'Materiales / Entrada a Línea', equipment: 'Hombre Sentado (Eléctrico)', shiftPattern: 'Mañana', licenseExpiry: '2026-09-25', status: 'Activo' },
{ id: 'M-104', name: 'Heleodoro Cervantes Arredondo', zone: 'Materiales / Entrada a Línea', equipment: 'Trilateral / Pasillo Angosto', shiftPattern: 'Mañana', licenseExpiry: '2025-12-01', status: 'Activo' },
{ id: 'M-105', name: 'José Manuel Sánchez Anguamea', zone: 'Materiales / Entrada a Línea', equipment: 'Hombre Parado (Reach)', shiftPattern: 'Mañana', licenseExpiry: '2027-05-20', status: 'Activo' },
{ id: 'M-106', name: 'Lauro Domínguez Morales', zone: 'Materiales / Entrada a Línea', equipment: 'Hombre Sentado (Eléctrico)', shiftPattern: 'Mañana', licenseExpiry: '2026-09-01', status: 'Activo' }
];

const INITIAL_VACATION_REQUESTS = [
{ id: 'v-1', operatorId: 'M-103', operatorName: 'Jesús León', startDate: '2026-09-10', endDate: '2026-09-18', type: 'Vacaciones', status: 'Pendiente', reason: 'Vacaciones anuales reglamentarias' },
{ id: 'v-2', operatorId: 'M-106', operatorName: 'Lauro Domínguez Morales', startDate: '2026-09-01', endDate: '2026-09-06', type: 'Día de Descanso Especial', status: 'Pendiente', reason: 'Asuntos Familiares' }
];

// Generador seguro de UUID con fallback
const generateId = () => {
if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
return ${Date.now()}-${Math.random().toString(36).slice(2, 9)};
};

// Utilidad para persistencia resiliente (Redis + Fallback LocalStorage)
const safeStorage = {
async get(key, fallback) {
try {
const data = await redis.get(key);
if (data !== null && data !== undefined) return data;
} catch (e) {
console.warn([Redis offline] Leyendo ${key} desde LocalStorage);
}
try {
const local = localStorage.getItem(key);
return local ? JSON.parse(local) : fallback;
} catch {
return fallback;
}
},
async set(key, value) {
try {
localStorage.setItem(key, JSON.stringify(value));
} catch (e) {
console.error('Error guardando en LocalStorage:', e);
}
try {
await redis.set(key, value);
} catch (e) {
console.warn([Redis offline] No se pudo guardar ${key} en servidor);
}
}
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 30000;

const formatDateLocal = (date) => {
const y = date.getFullYear();
const m = String(date.getMonth() + 1).padStart(2, '0');
const d = String(date.getDate()).padStart(2, '0');
return ${y}-${m}-${d};
};

const getMondayOfCurrentWeek = (refDate = new Date()) => {
const d = new Date(refDate);
const day = d.getDay();
const diff = d.getDate() - day + (day === 0 ? -6 : 1);
d.setDate(diff);
return formatDateLocal(d);
};

const getLicenseStatusInfo = (expiryDateStr) => {
if (!expiryDateStr) return { style: 'bg-emerald-950 text-emerald-300 border-emerald-800', days: 999, expired: false, warning: false };

const today = new Date();
today.setHours(0, 0, 0, 0);

const expiryDate = new Date(expiryDateStr + 'T00:00:00');
const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

if (diffDays < 0) {
return { style: 'bg-red-950 text-red-300 border-red-700/80 font-bold', days: diffDays, expired: true, warning: true };
} else if (diffDays <= 30) {
return { style: 'bg-amber-950 text-amber-300 border-amber-600/80 font-bold', days: diffDays, expired: false, warning: true };
} else {
return { style: 'bg-emerald-950 text-emerald-300 border-emerald-800', days: diffDays, expired: false, warning: false };
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

// Estado global de sincronización
const [syncStatus, setSyncStatus] = useState('idle');
const syncStatusTimeoutRef = useRef(null);

const reportSyncResult = (ok) => {
setSyncStatus(ok ? 'saved' : 'error');
if (syncStatusTimeoutRef.current) clearTimeout(syncStatusTimeoutRef.current);
syncStatusTimeoutRef.current = setTimeout(() => setSyncStatus('idle'), ok ? 2000 : 4000);
};

const [showLicenseAlerts, setShowLicenseAlerts] = useState(true);
const [showStatsDashboard, setShowStatsDashboard] = useState(true);
const [vacDateError, setVacDateError] = useState('');

const [activeTab, setActiveTab] = useState('scheduler');

const [operators, setOperators] = useState(INITIAL_OPERATORS);
const [scheduleData, setScheduleData] = useState({});
const [vacationRequests, setVacationRequests] = useState(INITIAL_VACATION_REQUESTS);
const [isLoaded, setIsLoaded] = useState(false);

const isUpdatingRef = useRef(false);
const scheduleRef = useRef(null);

const [currentWeekStart, setCurrentWeekStart] = useState(() => getMondayOfCurrentWeek());
const [applyToFullWeek, setApplyToFullWeek] = useState(false);

// Estados de exportación
const [showExportMenu, setShowExportMenu] = useState(false);
const [isExporting, setIsExporting] = useState(false);
const exportMenuRef = useRef(null);

// Filtros adicionales
const [searchQuery, setSearchQuery] = useState('');
const [selectedZone, setSelectedZone] = useState('Todas las zonas');
const [licenseFilter, setLicenseFilter] = useState('all'); // all | warning | expired

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
operatorId: INITIAL_OPERATORS[0]?.id || 'M-101',
startDate: formatDateLocal(new Date()),
endDate: formatDateLocal(new Date(Date.now() + 86400000 * 5)),
type: 'Vacaciones',
reason: ''
});

// Cuenta regresiva de bloqueo por contraseña errónea
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

// Cerrar menú de exportación al hacer clic fuera
useEffect(() => {
const handleClickOutside = (event) => {
if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
setShowExportMenu(false);
}
};
document.addEventListener('mousedown', handleClickOutside);
return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

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

// Cargar librerías CDN para PDF e imágenes
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
    const dateRangeText = `Plan Semanal: ${weekDays[0].dayNumber} ${weekDays[0].monthName} - ${weekDays[6].dayNumber} ${weekDays[6].monthName} | Zona: ${selectedZone}`;
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
    pdf.text(`Generado el: ${new Date().toLocaleString('es-MX')} por ${currentUser?.name || 'Usuario'}`, 12, pdfHeight - 5);

    pdf.save(`${fileName}.pdf`);
  }
} catch (error) {
  console.error('Error al exportar horario:', error);
  alert('No se pudo generar el archivo de descarga. Intente de nuevo.');
} finally {
  setIsExporting(false);
}


};

// Carga inicial de datos desde Redis / SafeStorage
useEffect(() => {
const loadCloudData = async () => {
try {
const savedOps = await safeStorage.get('sf_operators', INITIAL_OPERATORS);
const savedSchedule = await safeStorage.get('sf_scheduleData', {});
const savedVac = await safeStorage.get('sf_vacations', INITIAL_VACATION_REQUESTS);

    if (Array.isArray(savedOps) && savedOps.length > 0) setOperators(savedOps);
    if (typeof savedSchedule === 'object') setScheduleData(savedSchedule);
    if (Array.isArray(savedVac)) setVacationRequests(savedVac);
  } catch (error) {
    console.error("Error al cargar datos:", error);
  } finally {
    setIsLoaded(true);
  }
};

loadCloudData();


}, []);

// Relleno automático por defecto para semanas vacías
useEffect(() => {
if (!isLoaded || isUpdatingRef.current) return;
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
  safeStorage.set('sf_scheduleData', newSchedule);
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
  try { sessionStorage.setItem('sf_session', JSON.stringify(user)); } catch (err) {}
} else {
  const attempts = loginAttempts + 1;
  setLoginAttempts(attempts);
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    setLockoutUntil(Date.now() + LOCKOUT_MS);
    setLoginError(`Demasiados intentos. Bloqueado durante ${LOCKOUT_MS / 1000}s.`);
  } else {
    setLoginError(`Credenciales incorrectas (${MAX_LOGIN_ATTEMPTS - attempts} intento(s) restante(s)).`);
  }
}


};

const handleLogout = () => {
setCurrentUser(null);
try { sessionStorage.removeItem('sf_session'); } catch (err) {}
};

useEffect(() => {
try {
const saved = sessionStorage.getItem('sf_session');
if (saved) {
const parsed = JSON.parse(saved);
const stillValid = MOCK_USERS.some(u => u.id === parsed.id && u.email === parsed.email);
if (stillValid) setCurrentUser(parsed);
}
} catch (err) {}
}, []);

const canEditShifts = currentUser && ['Admin', 'Supervisor'].includes(currentUser.role);
const canManageOperators = currentUser && currentUser.role === 'Admin';
const canApproveVacations = currentUser && ['Admin', 'Supervisor'].includes(currentUser.role);

// Lista de alertas de licencias por vencer
const licenseAlerts = useMemo(() => {
return operators
.map(op => {
const info = getLicenseStatusInfo(op.licenseExpiry);
if (!info.warning) return null;
return { ...op, diffDays: info.days, expired: info.expired };
})
.filter(Boolean)
.sort((a, b) => a.diffDays - b.diffDays);
}, [operators]);

// Lista de operadores filtrada
const filteredOperators = useMemo(() => {
return operators.filter(op => {
const matchesSearch = op.name.toLowerCase().includes(searchQuery.toLowerCase()) || op.id.toLowerCase().includes(searchQuery.toLowerCase());
const matchesZone = selectedZone === 'Todas las zonas' || op.zone === selectedZone;
const licenseInfo = getLicenseStatusInfo(op.licenseExpiry);

  let matchesLicense = true;
  if (licenseFilter === 'warning') matchesLicense = licenseInfo.warning;
  if (licenseFilter === 'expired') matchesLicense = licenseInfo.expired;

  return matchesSearch && matchesZone && matchesLicense;
});


}, [operators, searchQuery, selectedZone, licenseFilter]);

// Resumen Estadístico Semanal por Turno
const weeklyShiftStats = useMemo(() => {
const stats = { M: 0, T: 0, N: 0, DES: 0, VAC: 0, INC: 0 };
filteredOperators.forEach(op => {
weekDays.forEach(day => {
const code = scheduleData[${op.id}_${day.dateStr}] || 'DES';
if (stats[code] !== undefined) stats[code]++;
});
});
return stats;
}, [filteredOperators, weekDays, scheduleData]);

// Acción: Copiar horario de la semana previa
const handleCopyPreviousWeek = async () => {
if (!canEditShifts) return;
if (!window.confirm('¿Deseas copiar la programación exacta de la semana anterior a esta semana?')) return;

isUpdatingRef.current = true;
setSyncStatus('saving');

const [y, m, d] = currentWeekStart.split('-').map(Number);
const prevMonday = new Date(y, m - 1, d - 7);
const newSchedule = { ...scheduleData };

operators.forEach(op => {
  for (let i = 0; i < 7; i++) {
    const srcDate = new Date(prevMonday);
    srcDate.setDate(prevMonday.getDate() + i);
    const srcDateStr = formatDateLocal(srcDate);

    const targetDateStr = weekDays[i].dateStr;
    const prevCode = scheduleData[`${op.id}_${srcDateStr}`] || op.shiftPattern[0];

    newSchedule[`${op.id}_${targetDateStr}`] = prevCode;
  }
});

setScheduleData(newSchedule);
try {
  await safeStorage.set('sf_scheduleData', newSchedule);
  reportSyncResult(true);
} catch (e) {
  reportSyncResult(false);
} finally {
  setTimeout(() => { isUpdatingRef.current = false; }, 1500);
}


};

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
  await safeStorage.set('sf_scheduleData', updatedSchedule);
  reportSyncResult(true);
} catch (error) {
  reportSyncResult(false);
} finally {
  setTimeout(() => { isUpdatingRef.current = false; }, 1500);
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
  await safeStorage.set('sf_operators', updatedOps);
  reportSyncResult(true);
} catch (error) {
  reportSyncResult(false);
} finally {
  setTimeout(() => { isUpdatingRef.current = false; }, 1500);
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
    await safeStorage.set('sf_operators', updatedOps);
    reportSyncResult(true);
  } catch (error) {
    reportSyncResult(false);
  } finally {
    setTimeout(() => { isUpdatingRef.current = false; }, 1500);
  }
}


};

const handleCreateVacationRequest = async (e) => {
e.preventDefault();
const op = operators.find(o => o.id === newVac.operatorId);
if (!op) return;

if (!newVac.startDate || !newVac.endDate) {
  setVacDateError('Selecciona ambas fechas.');
  return;
}
if (newVac.endDate < newVac.startDate) {
  setVacDateError('La fecha de fin no puede ser anterior a la de inicio.');
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
  await safeStorage.set('sf_vacations', updatedVac);
  reportSyncResult(true);
} catch (error) {
  reportSyncResult(false);
} finally {
  setTimeout(() => { isUpdatingRef.current = false; }, 1500);
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
  await safeStorage.set('sf_vacations', updatedVac);
  if (newStatus === 'Aprobado' && req) {
    await safeStorage.set('sf_scheduleData', updatedSchedule);
  }
  reportSyncResult(true);
} catch (error) {
  reportSyncResult(false);
} finally {
  setTimeout(() => { isUpdatingRef.current = false; }, 1500);
}


};

// VISTA DE LOGIN
if (!currentUser) {
return (







ShiftForklift
Control de Turnos e Incidencias de Montacargas


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

const selectedOperator = selectedCell ? operators.find(o => o.id === selectedCell.operatorId) : null;

return (

{/* ENCABEZADO PRINCIPAL */}








ShiftForklift
Gestión Operativa de Montacargas



      <nav className="hidden md:flex space-x-1 bg-[#02180d] p-1 rounded-xl border border-emerald-900">
        <button onClick={() => setActiveTab('scheduler')} className={`px-4 py-2 text-xs font-bold rounded-lg ${activeTab === 'scheduler' ? 'bg-emerald-600 text-white' : 'text-emerald-300 hover:text-white'}`}>Matriz</button>
        <button onClick={() => setActiveTab('operators')} className={`px-4 py-2 text-xs font-bold rounded-lg ${activeTab === 'operators' ? 'bg-emerald-600 text-white' : 'text-emerald-300 hover:text-white'}`}>Personal ({operators.length})</button>
        <button onClick={() => setActiveTab('vacations')} className={`px-4 py-2 text-xs font-bold rounded-lg ${activeTab === 'vacations' ? 'bg-emerald-600 text-white' : 'text-emerald-300 hover:text-white'}`}>Permisos</button>
      </nav>

      <div className="flex items-center space-x-3">
        {syncStatus !== 'idle' && (
          <div className={`hidden sm:flex items-center space-x-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
            syncStatus === 'saving' ? 'bg-amber-950 text-amber-300 border-amber-700/60' :
            syncStatus === 'saved' ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60' :
            'bg-red-950 text-red-300 border-red-700/60'
          }`}>
            {syncStatus === 'saving' && <><Loader2 className="w-3 h-3 animate-spin" /><span>Sincronizando...</span></>}
            {syncStatus === 'saved' && <><CheckCircle2 className="w-3 h-3" /><span>Guardado</span></>}
            {syncStatus === 'error' && <><CloudOff className="w-3 h-3" /><span>Error red</span></>}
          </div>
        )}

        {licenseAlerts.length > 0 && (
          <button
            onClick={() => { setActiveTab('operators'); setShowLicenseAlerts(true); }}
            className="relative p-2 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 rounded-xl transition"
            title="Licencias DC3 requeridas"
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

  {/* CONTENIDO PRINCIPAL */}
  <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
    {/* Pestaña: MATRIZ DE HORARIOS */}
    {activeTab === 'scheduler' && (
      <div className="space-y-5">
        {/* PANEL DASHBOARD DE MÉTRICAS / COBERTURA */}
        {showStatsDashboard && (
          <div className="bg-[#003316] border border-emerald-800/80 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-emerald-800/60 pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-200">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Balance y Cobertura Semanal por Turno</span>
              </div>
              <button onClick={() => setShowStatsDashboard(false)} className="text-emerald-400 hover:text-emerald-100 text-xs">Ocultar</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-[#011a0d] border border-emerald-800 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-emerald-400 font-bold uppercase">Turno Mañana</div>
                <div className="text-lg font-extrabold text-emerald-200">{weeklyShiftStats.M} <span className="text-[10px] font-normal text-emerald-400">asignaciones</span></div>
              </div>
              <div className="bg-[#011a0d] border border-emerald-800 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-amber-400 font-bold uppercase">Turno Tarde</div>
                <div className="text-lg font-extrabold text-amber-200">{weeklyShiftStats.T} <span className="text-[10px] font-normal text-amber-400">asignaciones</span></div>
              </div>
              <div className="bg-[#011a0d] border border-emerald-800 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-indigo-400 font-bold uppercase">Turno Noche</div>
                <div className="text-lg font-extrabold text-indigo-200">{weeklyShiftStats.N} <span className="text-[10px] font-normal text-indigo-400">asignaciones</span></div>
              </div>
              <div className="bg-[#011a0d] border border-emerald-800 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-emerald-500 font-bold uppercase">Descansos</div>
                <div className="text-lg font-extrabold text-emerald-400">{weeklyShiftStats.DES}</div>
              </div>
              <div className="bg-[#011a0d] border border-emerald-800 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-purple-400 font-bold uppercase">Vacaciones</div>
                <div className="text-lg font-extrabold text-purple-200">{weeklyShiftStats.VAC}</div>
              </div>
              <div className="bg-[#011a0d] border border-emerald-800 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-red-400 font-bold uppercase">Incapacidades</div>
                <div className="text-lg font-extrabold text-red-200">{weeklyShiftStats.INC}</div>
              </div>
            </div>
          </div>
        )}

        {/* BARRA SUPERIOR DE HERRAMIENTAS Y NAVEGACIÓN */}
        <div className="bg-[#003818] border border-emerald-800/70 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => {
              const [y, m, d] = currentWeekStart.split('-').map(Number);
              const prevWeek = new Date(y, m - 1, d - 7);
              setCurrentWeekStart(formatDateLocal(prevWeek));
            }} className="p-2 bg-[#022415] hover:bg-emerald-900 rounded-xl text-emerald-200 border border-emerald-800/60 transition" title="Semana Anterior"><ChevronLeft className="w-5 h-5"/></button>

            <div className="text-xs sm:text-sm font-bold text-white bg-[#02180d] px-4 py-2 rounded-xl border border-emerald-900 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-400" />
              <span>Semana: {weekDays[0].dayNumber} {weekDays[0].monthName} - {weekDays[6].dayNumber} {weekDays[6].monthName}</span>
            </div>

            <button onClick={() => {
              const [y, m, d] = currentWeekStart.split('-').map(Number);
              const nextWeek = new Date(y, m - 1, d + 7);
              setCurrentWeekStart(formatDateLocal(nextWeek));
            }} className="p-2 bg-[#022415] hover:bg-emerald-900 rounded-xl text-emerald-200 border border-emerald-800/60 transition" title="Semana Siguiente"><ChevronRight className="w-5 h-5"/></button>

            {canEditShifts && (
              <button
                onClick={handleCopyPreviousWeek}
                className="p-2 bg-[#022415] hover:bg-emerald-900 text-emerald-300 rounded-xl border border-emerald-800/60 transition flex items-center space-x-1 text-xs font-bold"
                title="Copiar turnos de la semana anterior"
              >
                <Copy className="w-4 h-4 text-emerald-400" />
                <span className="hidden xl:inline">Copiar Previa</span>
              </button>
            )}
          </div>

          {/* CONTROLES DE FILTRADO Y BÚSQUEDA */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar operador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#02180d] border border-emerald-900 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none w-full"
              />
            </div>

            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-[#02180d] border border-emerald-900 rounded-xl px-3 py-2 text-xs text-emerald-200"
            >
              {WAREHOUSE_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>

            <select
              value={licenseFilter}
              onChange={(e) => setLicenseFilter(e.target.value)}
              className="bg-[#02180d] border border-emerald-900 rounded-xl px-3 py-2 text-xs text-emerald-200"
            >
              <option value="all">Todas las licencias DC3</option>
              <option value="warning">Por Vencer / Vencidas</option>
              <option value="expired">Solo Vencidas</option>
            </select>

            {/* BOTÓN EXPORTAR */}
            <div className="relative" ref={exportMenuRef}>
              <button
                disabled={isExporting}
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-2 transition border border-emerald-500/50 shadow"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>Exportar</span>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-[#002e14] border border-emerald-700 rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
                  <div className="p-2 border-b border-emerald-800 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Formato de Exportación
                  </div>
                  <button onClick={() => handleExport('png')} className="w-full text-left px-3 py-2.5 text-emerald-100 hover:bg-emerald-800/80 flex items-center space-x-2 transition">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <div><div className="font-bold">Imagen PNG</div><div className="text-[10px] text-emerald-400/80">Alta resolución HD</div></div>
                  </button>
                  <button onClick={() => handleExport('jpg')} className="w-full text-left px-3 py-2.5 text-emerald-100 hover:bg-emerald-800/80 flex items-center space-x-2 transition border-t border-emerald-900/60">
                    <FileImage className="w-4 h-4 text-amber-400" />
                    <div><div className="font-bold">Imagen JPG</div><div className="text-[10px] text-emerald-400/80">Formato liviano</div></div>
                  </button>
                  <button onClick={() => handleExport('pdf')} className="w-full text-left px-3 py-2.5 text-emerald-100 hover:bg-emerald-800/80 flex items-center space-x-2 transition border-t border-emerald-900/60">
                    <FileText className="w-4 h-4 text-red-400" />
                    <div><div className="font-bold">Documento PDF</div><div className="text-[10px] text-emerald-400/80">Para impresión A4</div></div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TABLA HORARIOS */}
        <div ref={scheduleRef} className="bg-[#002812] border border-emerald-800/80 rounded-2xl overflow-hidden shadow-2xl p-1">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#001f0d] border-b border-emerald-800/80">
                  <th className="py-3.5 px-4 text-left text-xs font-bold text-emerald-300 uppercase w-64">Montacargista / Zona</th>
                  {weekDays.map(day => (
                    <th key={day.dateStr} className="py-3.5 px-2 text-center border-l border-emerald-900/60">
                      <div className="text-xs font-bold text-emerald-200 uppercase">{day.dayName}</div>
                      <div className={`text-base font-extrabold ${day.isWeekend ? 'text-red-400' : 'text-white'}`}>{day.dayNumber}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/50">
                {filteredOperators.map(op => {
                  const licInfo = getLicenseStatusInfo(op.licenseExpiry);
                  return (
                    <tr key={op.id} className="hover:bg-[#003517]/50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-white">{op.name}</span>
                          {licInfo.warning && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" title={`Licencia DC3: ${licInfo.expired ? 'Vencida' : 'Por vencer'}`} />
                          )}
                        </div>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* Pestaña: PERSONAL */}
    {activeTab === 'operators' && (
      <div className="space-y-5">
        {licenseAlerts.length > 0 && showLicenseAlerts && (
          <div className="bg-amber-950/60 border border-amber-700/60 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-amber-200">
                    {licenseAlerts.length} licencia(s) DC3 requieren atención
                  </h3>
                  <ul className="mt-2 space-y-1 text-xs text-amber-100/90">
                    {licenseAlerts.map(a => (
                      <li key={a.id}>
                        <span className="font-bold">{a.name}</span> ({a.id}) — {a.expired ? `Vencida hace ${Math.abs(a.diffDays)} día(s)` : `Vence en ${a.diffDays} día(s)`} ({a.licenseExpiry})
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
            <p className="text-xs text-emerald-300">Nivel de acceso: {currentUser.role}</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {operators.map(op => {
            const licInfo = getLicenseStatusInfo(op.licenseExpiry);
            return (
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
                      <span className={`px-2 py-0.5 rounded border text-[11px] ${licInfo.style}`}>
                        {op.licenseExpiry || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Pestaña: PERMISOS Y SOLICITUDES */}
    {activeTab === 'vacations' && (
      <div className="space-y-5">
        <div className="flex justify-between items-center bg-[#003818] border border-emerald-800/70 rounded-2xl p-4">
          <h2 className="text-lg font-bold text-white">Solicitudes de Permiso y Ausencia</h2>
          <button onClick={() => { setVacDateError(''); setIsRequestVacationOpen(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition">
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
                      </div>
                    ) : (
                      <span className="text-emerald-600 text-[10px]">Sin acciones</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </main>

  {/* MODAL: CAMBIAR TURNO */}
  {selectedCell && canEditShifts && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#002e14] border border-emerald-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Cambiar Asignación de Turno</h3>
            <p className="text-xs text-emerald-300 font-semibold">{selectedOperator?.name || ''}</p>
            <p className="text-[11px] text-emerald-400/80">Fecha: {selectedCell.dateStr}</p>
          </div>
          <button onClick={() => { setSelectedCell(null); setApplyToFullWeek(false); }} className="text-emerald-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>

        <div className="mb-4 bg-[#011a0d] p-3 rounded-xl border border-emerald-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-200">Aplicar a toda la semana</span>
          </div>
          <input 
            type="checkbox" 
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

  {/* MODAL: REGISTRAR OPERADOR */}
  {isAddOperatorOpen && canManageOperators && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#002e14] border border-emerald-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <h3 className="text-base font-bold text-white mb-4">{editingOperator ? 'Editar Operador' : 'Registrar Nuevo Operador'}</h3>
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
            <label className="block text-emerald-300 font-bold mb-1">Tipo de Montacargas</label>
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
            <label className="block text-emerald-300 font-bold mb-1">Turno Base Habitual</label>
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

  {/* MODAL: REGISTRAR PERMISO */}
  {isRequestVacationOpen && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#002e14] border border-emerald-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <h3 className="text-base font-bold text-white mb-4">Registrar Solicitud de Ausencia</h3>
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
