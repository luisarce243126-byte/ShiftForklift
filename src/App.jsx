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
  Share2,
  Package
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
  'Todas las áreas',
  'Almacén de Materiales Directos',
  'Almacén de PT'
];

const ASSIGNMENTS = [
  'Línea 10', 'Línea 20', 'Línea 30', 'Línea 40', 'Línea 50', 'Línea 60',
  'Embarque y Recepción'
];

const TE_BASE_HOURS = 208;
const TE_AREAS = WAREHOUSE_ZONES.slice(1);
const AREA_COLORS = {
  [WAREHOUSE_ZONES[1]]: '#3987e5',
  [WAREHOUSE_ZONES[2]]: '#d95926'
};
const shortArea = (zone) => zone.replace('Almacén de ', '');

const getMonthDates = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const total = new Date(y, m, 0).getDate();
  return Array.from({ length: total }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
};

const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const areaLabel = (op) => (TE_AREAS.includes(op.zone) ? op.zone : 'Sin área');

const shiftWeekStr = (startStr, days) => {
  const [y, m, d] = startStr.split('-').map(Number);
  return formatDateLocal(new Date(y, m - 1, d + days));
};

const buildWeekDays = (startStr) => {
  const [y, m, d] = startStr.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    return {
      dateStr: formatDateLocal(dt),
      dayName: dayNames[dt.getDay()],
      dayNumber: dt.getDate(),
      monthName: dt.toLocaleDateString('es-ES', { month: 'short' })
    };
  });
};

const FORKLIFT_TYPES = ['Sencillo', 'Doble'];

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

const LOAD_TIMEOUT_MS = 15000;
const POLL_TIMEOUT_MS = 8000;
const SLOW_LOAD_SECONDS = 4;

const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const OVERTIME_TYPES = ['Hora extra', 'Descanso trabajado', 'Día festivo'];
const OT_MAX_HOURS_PER_DAY = 3;
const OT_MAX_DAYS_PER_WEEK = 3;
const OT_WARN_HOURS = 3;
const OT_ALERT_HOURS = 9;
const WORK_CODES = ['M', 'T', 'N'];

const getWeekDatesFromDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  const dow = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - dow + (dow === 0 ? -6 : 1));
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    dates.push(formatDateLocal(dd));
  }
  return dates;
};

const sumOvertime = (requests, operatorId, dates, statuses = ['Aprobado']) =>
  (requests || [])
    .filter(r => r.operatorId === operatorId && dates.includes(r.date) && statuses.includes(r.status))
    .reduce((acc, r) => acc + (Number(r.hours) || 0), 0);

const sumOvertimeTotal = (requests, dates, statuses = ['Aprobado']) =>
  (requests || [])
    .filter(r => dates.includes(r.date) && statuses.includes(r.status))
    .reduce((acc, r) => acc + (Number(r.hours) || 0), 0);

const getOvertimeLevel = (hours) => {
  if (hours >= OT_ALERT_HOURS) return 'danger';
  if (hours >= OT_WARN_HOURS) return 'warning';
  return null;
};

const hasRestDay = (schedule, operatorId, dates) =>
  dates.some(d => !WORK_CODES.includes(schedule[`${operatorId}_${d}`]));

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

const fmtTE = (v, maxDecimals = 4) => {
  if (!isFinite(v)) return '0';
  if (v === 0) return '0.0000';
  const fixed = Number(v).toFixed(maxDecimals);
  const trimmed = fixed.replace(/(\.\d{2}\d*?)0+$/, '$1').replace(/\.$/, '.00');
  const [intPart, decPart = ''] = trimmed.split('.');
  return `${intPart}.${decPart.padEnd(2, '0')}`;
};

const fmtFTE = (v) => {
  if (!isFinite(v)) return '0.00';
  const s = Number(v).toFixed(4);
  if (s.endsWith('00')) return Number(v).toFixed(2);
  if (s.endsWith('0')) return Number(v).toFixed(3);
  return s;
};

// ✅ Formato con separador de miles para valores de productividad
const fmtNum = (v, decimals = 2) => {
  if (!isFinite(v)) return '0';
  return Number(v).toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

function MiniIndicator({ icon: Icon, label, value, accent = 'emerald', subtitle = null }) {
  const c = INDICATOR_ACCENTS[accent] || INDICATOR_ACCENTS.emerald;
  return (
    <div className={`flex items-center gap-2 rounded-lg border ${c.bg} ${c.border} px-2 py-1.5`}>
      <Icon className={`w-3.5 h-3.5 ${c.text} shrink-0`} />
      <div className="min-w-0 flex-1">
        <div className={`text-[9px] font-bold uppercase tracking-wider ${c.text} leading-none`}>{label}</div>
        <div className="flex items-baseline gap-1">
          <span className={`text-sm font-extrabold ${c.value} leading-none`}>{value}</span>
          {subtitle && <span className={`text-[9px] ${c.text} opacity-70 leading-none`}>{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

const computeTeStats = (ym, operators, scheduleData, assignments, overtimeRequests) => {
  const dates = getMonthDates(ym);
  const otMap = {};
  overtimeRequests.forEach(r => {
    if (r.status !== 'Aprobado' || typeof r.date !== 'string' || !r.date.startsWith(ym)) return;
    const key = `${r.operatorId}_${r.date}`;
    otMap[key] = (otMap[key] || 0) + (Number(r.hours) || 0);
  });

  const areaAgg = {};
  const lineAgg = {};
  const unassigned = {};
  TE_AREAS.forEach(z => {
    areaAgg[z] = { ops: 0, hours: 0 };
    unassigned[z] = 0;
    lineAgg[z] = {};
    ASSIGNMENTS.forEach(a => { lineAgg[z][a] = { hours: 0, ops: new Set() }; });
  });

  const perOp = {};
  let totalHours = 0;
  let outsideAreas = 0;

  operators.forEach(op => {
    let hours = 0;
    const zoneOk = areaAgg[op.zone] !== undefined;
    dates.forEach(d => {
      const key = `${op.id}_${d}`;
      const dayHours = otMap[key] || 0;
      if (!dayHours) return;
      hours += dayHours;
      if (zoneOk) {
        const a = assignments[key];
        if (a && lineAgg[op.zone][a]) {
          lineAgg[op.zone][a].hours += dayHours;
          lineAgg[op.zone][a].ops.add(op.id);
        } else {
          unassigned[op.zone] += dayHours;
        }
      }
    });
    perOp[op.id] = { hours, te: hours / TE_BASE_HOURS };
    totalHours += hours;
    if (zoneOk) {
      areaAgg[op.zone].ops += 1;
      areaAgg[op.zone].hours += hours;
    } else {
      outsideAreas += 1;
    }
  });

  const areas = TE_AREAS.map(z => ({
    zone: z,
    ops: areaAgg[z].ops,
    hours: areaAgg[z].hours,
    te: areaAgg[z].hours / TE_BASE_HOURS
  }));

  const lines = {};
  TE_AREAS.forEach(z => {
    lines[z] = ASSIGNMENTS.map(a => {
      const l = lineAgg[z][a];
      const n = l.ops.size;
      return { assignment: a, hours: l.hours, ops: n, te: l.hours / TE_BASE_HOURS };
    });
  });

  const avg = totalHours / TE_BASE_HOURS;

  return { perOp, areas, lines, unassigned, outsideAreas, avg, totalHours };
};

const TE_PLOT_H = 180;

function TEBarChart({ title, subtitle, color = null, bars, firstColumnLabel = 'Detalle', barWidth = 24 }) {
  const [showTable, setShowTable] = useState(false);
  const [hover, setHover] = useState(null);

  const maxVal = Math.max(0.0001, ...bars.map(b => b.value));

  let step, decimals;
  if (maxVal <= 0.005)       { step = 0.0005; decimals = 4; }
  else if (maxVal <= 0.01)   { step = 0.001;  decimals = 4; }
  else if (maxVal <= 0.025)  { step = 0.0025; decimals = 4; }
  else if (maxVal <= 0.05)   { step = 0.005;  decimals = 3; }
  else if (maxVal <= 0.1)    { step = 0.01;   decimals = 3; }
  else if (maxVal <= 0.25)   { step = 0.025;  decimals = 3; }
  else if (maxVal <= 0.5)    { step = 0.05;   decimals = 2; }
  else if (maxVal <= 1)      { step = 0.1;    decimals = 2; }
  else if (maxVal <= 2)      { step = 0.2;    decimals = 2; }
  else if (maxVal <= 5)      { step = 0.5;    decimals = 2; }
  else                       { step = 1;      decimals = 1; }

  const top = Math.ceil((maxVal * 1.15) / step) * step;
  const ticks = [];
  for (let i = 0; i * step <= top + 1e-9; i++) {
    ticks.push(Number((i * step).toFixed(6)));
  }
  const hasData = bars.some(b => b.hours > 0);
  const fmt = (v) => v.toFixed(decimals);
  const showRefLine = top >= 1;

  const tooltipPos = (i) => {
    if (bars.length < 3) return 'left-1/2 -translate-x-1/2';
    if (i < bars.length / 3) return 'left-0';
    if (i >= (bars.length * 2) / 3) return 'right-0';
    return 'left-1/2 -translate-x-1/2';
  };

  return (
    <div className="bg-[#002812] border border-emerald-800/80 rounded-2xl p-3 sm:p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            {color && <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />}
            <span className="min-w-0">{title}</span>
          </h3>
          {subtitle && <p className="text-[11px] text-emerald-300 mt-0.5">{subtitle}</p>}
        </div>
        <button
          onClick={() => setShowTable(v => !v)}
          className="shrink-0 px-2 py-1 rounded-lg border border-emerald-800 bg-[#02180d] hover:bg-emerald-950 text-[10px] font-bold text-emerald-300 transition"
        >
          {showTable ? 'Ver gráfica' : 'Ver tabla'}
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        {showTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[360px]">
              <thead>
                <tr className="text-emerald-300 font-bold uppercase border-b border-emerald-800/80">
                  <th className="p-2">{firstColumnLabel}</th>
                  <th className="p-2 text-right">H. extra</th>
                  <th className="p-2 text-right">Operadores</th>
                  <th className="p-2 text-right">T.E</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/50">
                {bars.map(b => (
                  <tr key={b.label}>
                    <td className="p-2 font-bold text-white">{b.label}</td>
                    <td className="p-2 text-right text-emerald-200">{b.hours.toFixed(1)}</td>
                    <td className="p-2 text-right text-emerald-200">{b.ops}</td>
                    <td className="p-2 text-right font-extrabold text-emerald-100">{fmt(b.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: TE_PLOT_H + 60 }}>
            <BarChart3 className="w-9 h-9 text-emerald-700 mb-2" />
            <p className="text-emerald-300 font-bold text-sm">Sin horas extra registradas en este mes</p>
          </div>
        ) : (
          <div className="relative pl-9 pt-5">
            <div className="absolute left-0 right-0 pointer-events-none" style={{ top: 20, height: TE_PLOT_H }}>
              {ticks.map(t => (
                <div key={t} className="absolute left-0 right-0 h-0" style={{ bottom: `${(t / top) * 100}%` }}>
                  <span className="absolute left-0 w-8 text-right text-[9px] leading-none text-emerald-500" style={{ bottom: 0, transform: 'translateY(50%)' }}>{fmt(t)}</span>
                  <div className="absolute left-9 right-0 top-0 border-t border-emerald-900/70" />
                </div>
              ))}
              {showRefLine && (
                <div className="absolute left-9 right-0 h-0 border-t border-dashed border-emerald-200/60" style={{ bottom: `${(1 / top) * 100}%` }}>
                  <span className="absolute right-0 -top-3.5 text-[9px] text-emerald-200">208 h = 1.00</span>
                </div>
              )}
            </div>

            <div className="relative flex gap-1 sm:gap-2">
              {bars.map((b, i) => {
                const h = (b.value / top) * 100;
                return (
                  <div
                    key={b.label}
                    className="flex-1 min-w-0 flex flex-col items-center cursor-default"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setHover(hover === i ? null : i)}
                  >
                    <div className="relative w-full flex flex-col items-center justify-end" style={{ height: TE_PLOT_H }}>
                      {hover === i && (
                        <div className={`absolute z-20 -top-1 -translate-y-full whitespace-nowrap rounded-lg border border-emerald-600 bg-[#011a0d] px-2.5 py-1.5 text-[11px] text-emerald-50 shadow-xl pointer-events-none ${tooltipPos(i)}`}>
                          <div className="font-bold text-white">{b.fullLabel || b.label}</div>
                          <div>T.E <span className="font-extrabold">{fmt(b.value)}</span></div>
                          <div className="text-emerald-300">{b.hours.toFixed(1)} h extra ÷ 208</div>
                        </div>
                      )}
                      <span className="text-[11px] font-extrabold text-white mb-0.5 leading-none">{fmt(b.value)}</span>
                      <div
                        className="rounded-t-[4px]"
                        style={{ width: barWidth, height: `${h}%`, minHeight: b.value > 0 ? 2 : 0, background: b.color || color || '#3987e5' }}
                      />
                    </div>
                    <div className="mt-1.5 text-[10px] font-semibold text-emerald-100 text-center leading-tight break-words w-full">{b.label}</div>
                    <div className="text-[9px] text-emerald-500 text-center leading-tight">{b.hours.toFixed(1)} h OT · {b.ops} op.</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HCvsFTEChart({ hc, fte, otWeek, subtitle = null }) {
  const [showTable, setShowTable] = useState(false);
  const [hover, setHover] = useState(null);

  const bars = [
    { key: 'hc',  label: 'H.C',  fullLabel: 'Headcount (personas registradas)', value: hc,  color: '#3987e5' },
    { key: 'fte', label: 'F.T.E', fullLabel: 'Full Time Equivalent',             value: fte, color: '#d95926' }
  ];

  const maxVal = Math.max(0.0001, ...bars.map(b => b.value));
  const top = Math.ceil(maxVal * 1.15);
  const step = top <= 5 ? 1 : top <= 20 ? 2 : top <= 50 ? 5 : 10;
  const ticks = [];
  for (let i = 0; i * step <= top + 1e-9; i++) ticks.push(i * step);

  return (
    <div className="bg-[#002812] border border-emerald-800/80 rounded-2xl p-3 sm:p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="min-w-0">H.C y F.T.E · Reporte semanal</span>
          </h3>
          <p className="text-[11px] text-emerald-300 mt-0.5">
            {subtitle || `F.T.E = personas registradas + horas extra aprobadas de la semana ÷ 208`}
          </p>
        </div>
        <button
          onClick={() => setShowTable(v => !v)}
          className="shrink-0 px-2 py-1 rounded-lg border border-emerald-800 bg-[#02180d] hover:bg-emerald-950 text-[10px] font-bold text-emerald-300 transition"
        >
          {showTable ? 'Ver gráfica' : 'Ver tabla'}
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        {showTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[300px]">
              <thead>
                <tr className="text-emerald-300 font-bold uppercase border-b border-emerald-800/80">
                  <th className="p-2">Métrica</th>
                  <th className="p-2 text-right">Valor</th>
                  <th className="p-2 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/50">
                <tr>
                  <td className="p-2 font-bold text-white">H.C</td>
                  <td className="p-2 text-right font-extrabold text-blue-300">{fmtFTE(hc)}</td>
                  <td className="p-2 text-right text-emerald-300">{hc} persona{hc === 1 ? '' : 's'}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-white">F.T.E</td>
                  <td className="p-2 text-right font-extrabold text-orange-300">{fmtFTE(fte)}</td>
                  <td className="p-2 text-right text-emerald-300">{otWeek.toFixed(1)} h OT ÷ 208</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-emerald-200">Δ (F.T.E − H.C)</td>
                  <td className="p-2 text-right font-extrabold text-amber-300">{fmtFTE(fte - hc)}</td>
                  <td className="p-2 text-right text-emerald-400">T.E de la semana</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="relative pl-9 pt-5">
            <div className="absolute left-0 right-0 pointer-events-none" style={{ top: 20, height: TE_PLOT_H }}>
              {ticks.map(t => (
                <div key={t} className="absolute left-0 right-0 h-0" style={{ bottom: `${(t / top) * 100}%` }}>
                  <span className="absolute left-0 w-8 text-right text-[9px] leading-none text-emerald-500" style={{ bottom: 0, transform: 'translateY(50%)' }}>{t}</span>
                  <div className="absolute left-9 right-0 top-0 border-t border-emerald-900/70" />
                </div>
              ))}
            </div>

            <div className="relative flex gap-3">
              {bars.map((b, i) => {
                const h = (b.value / top) * 100;
                return (
                  <div
                    key={b.key}
                    className="flex-1 min-w-0 flex flex-col items-center cursor-default"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setHover(hover === i ? null : i)}
                  >
                    <div className="relative w-full flex flex-col items-center justify-end" style={{ height: TE_PLOT_H }}>
                      {hover === i && (
                        <div className="absolute z-20 -top-1 -translate-y-full whitespace-nowrap rounded-lg border border-emerald-600 bg-[#011a0d] px-2.5 py-1.5 text-[11px] text-emerald-50 shadow-xl pointer-events-none left-1/2 -translate-x-1/2">
                          <div className="font-bold text-white">{b.fullLabel}</div>
                          <div>Valor <span className="font-extrabold">{fmtFTE(b.value)}</span></div>
                          {b.key === 'fte' && <div className="text-emerald-300">{otWeek.toFixed(1)} h OT ÷ 208 = {fmtFTE(fte - hc)}</div>}
                        </div>
                      )}
                      <span className="text-[12px] font-extrabold text-white mb-0.5 leading-none">{fmtFTE(b.value)}</span>
                      <div
                        className="rounded-t-[4px]"
                        style={{ width: 88, height: `${h}%`, minHeight: b.value > 0 ? 2 : 0, background: b.color }}
                      />
                    </div>
                    <div className="mt-1.5 text-[11px] font-semibold text-emerald-100 text-center leading-tight">{b.label}</div>
                    {b.key === 'fte' && (
                      <div className="text-[9px] text-emerald-500 text-center leading-tight">{otWeek.toFixed(1)} h OT · Δ {fmtFTE(fte - hc)}</div>
                    )}
                    {b.key === 'hc' && (
                      <div className="text-[9px] text-emerald-500 text-center leading-tight">{hc} personas</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ✅ NUEVO: gráfica de productividad (esperada vs real)
function ProductivityBarChart({ title, subtitle, bars }) {
  const [showTable, setShowTable] = useState(false);
  const [hover, setHover] = useState(null);

  const maxVal = Math.max(0.0001, ...bars.map(b => b.value));
  const top = Math.ceil(maxVal * 1.15);
  const step = top <= 5 ? 1 : top <= 20 ? 2 : top <= 50 ? 5 : top <= 100 ? 10 : top <= 500 ? 50 : top <= 1000 ? 100 : 200;
  const ticks = [];
  for (let i = 0; i * step <= top + 1e-9; i++) ticks.push(i * step);

  const PLOT_H = 220;

  return (
    <div className="bg-[#002812] border border-emerald-800/80 rounded-2xl p-3 sm:p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            <span className="min-w-0">{title}</span>
          </h3>
          {subtitle && <p className="text-[11px] text-emerald-300 mt-0.5">{subtitle}</p>}
        </div>
        <button
          onClick={() => setShowTable(v => !v)}
          className="shrink-0 px-2 py-1 rounded-lg border border-emerald-800 bg-[#02180d] hover:bg-emerald-950 text-[10px] font-bold text-emerald-300 transition"
        >
          {showTable ? 'Ver gráfica' : 'Ver tabla'}
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        {showTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[280px]">
              <thead>
                <tr className="text-emerald-300 font-bold uppercase border-b border-emerald-800/80">
                  <th className="p-2">Métrica</th>
                  <th className="p-2 text-right">hL / F.T.E</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/50">
                {bars.map(b => (
                  <tr key={b.label}>
                    <td className="p-2 font-bold text-white">{b.label}</td>
                    <td className="p-2 text-right font-extrabold text-emerald-100">{fmtNum(b.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="relative pl-14 pt-5">
            <div className="absolute left-0 right-0 pointer-events-none" style={{ top: 20, height: PLOT_H }}>
              {ticks.map(t => (
                <div key={t} className="absolute left-0 right-0 h-0" style={{ bottom: `${(t / top) * 100}%` }}>
                  <span className="absolute left-0 w-12 text-right text-[9px] leading-none text-emerald-500" style={{ bottom: 0, transform: 'translateY(50%)' }}>{fmtNum(t, 0)}</span>
                  <div className="absolute left-14 right-0 top-0 border-t border-emerald-900/70" />
                </div>
              ))}
            </div>

            <div className="relative flex gap-4 justify-center">
              {bars.map((b, i) => {
                const h = (b.value / top) * 100;
                return (
                  <div
                    key={b.label}
                    className="flex-1 max-w-[220px] flex flex-col items-center cursor-default"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setHover(hover === i ? null : i)}
                  >
                    <div className="relative w-full flex flex-col items-center justify-end" style={{ height: PLOT_H }}>
                      {hover === i && (
                        <div className="absolute z-20 -top-1 -translate-y-full whitespace-nowrap rounded-lg border border-emerald-600 bg-[#011a0d] px-2.5 py-1.5 text-[11px] text-emerald-50 shadow-xl pointer-events-none left-1/2 -translate-x-1/2">
                          <div className="font-bold text-white">{b.label}</div>
                          <div>{fmtNum(b.value)} hL / F.T.E</div>
                          {b.detail && <div className="text-emerald-300">{b.detail}</div>}
                        </div>
                      )}
                      <span className="text-[13px] font-extrabold text-white mb-0.5 leading-none">{fmtNum(b.value)}</span>
                      <div
                        className="rounded-t-[4px]"
                        style={{ width: 110, height: `${h}%`, minHeight: b.value > 0 ? 2 : 0, background: b.color }}
                      />
                    </div>
                    <div className="mt-2 text-[11px] font-semibold text-emerald-100 text-center leading-tight">{b.label}</div>
                    {b.detail && <div className="text-[9px] text-emerald-500 text-center leading-tight">{b.detail}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
    try { link.click(); }
    catch (e) { window.open(url, '_blank'); }
    setTimeout(() => {
      try { document.body.removeChild(link); URL.revokeObjectURL(url); } catch (err) {}
    }, 1500);
  }, 50);
};

const dataURLtoBlob = (dataURL) => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
};

const getSuitableReplacements = (targetOperatorId, dateStr, shiftCode, operators, scheduleData, lockedCells, overtimeRequests = []) => {
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
      if (op.zone && op.zone === target.zone) { score += 50; reasons.push('Misma área'); }
      if (op.equipment && op.equipment === target.equipment) { score += 30; reasons.push('Mismo equipo'); }
      let weekHours = 0;
      weekDates.forEach(date => {
        const key = `${op.id}_${date}`;
        if (date === dateStr) weekHours += SHIFT_HOURS[shiftCode] || 0;
        else {
          const c = scheduleData[key];
          if (c && SHIFT_HOURS[c] !== undefined) weekHours += SHIFT_HOURS[c];
        }
      });
      weekHours += sumOvertime(overtimeRequests, op.id, weekDates);
      reasons.push(`${weekHours.toFixed(1)}h esta semana`);
      const wouldHaveRest = weekDates.some(date => date !== dateStr && !WORK_CODES.includes(scheduleData[`${op.id}_${date}`]));
      if (!wouldHaveRest) { score -= 40; reasons.push('Sin día de descanso'); }
      if (op.licenseExpiry) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const exp = new Date(op.licenseExpiry + 'T00:00:00');
        const days = Math.ceil((exp - today) / 86400000);
        if (days < 0) { score -= 100; reasons.push('Licencia vencida'); }
        else if (days <= 30) { score -= 15; reasons.push(`Licencia vence en ${days}d`); }
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
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    return id;
  }, []);

  const dismissToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

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
  const [overtimeRequests, setOvertimeRequests] = useState([]);
  const [assignments, setAssignments] = useState({});
  // ✅ NUEVO: datos de productividad
  const [productivityData, setProductivityData] = useState({});
  const [productivityDraft, setProductivityDraft] = useState({});
  const [productivityMonth, setProductivityMonth] = useState(() => formatDateLocal(new Date()).slice(0, 7));

  const [reportsView, setReportsView] = useState('summary');
  const [reportWeekStart, setReportWeekStart] = useState(() => getMondayOfCurrentWeek());
  const [teMonth, setTeMonth] = useState(() => formatDateLocal(new Date()).slice(0, 7));
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadSeconds, setLoadSeconds] = useState(0);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  const [pollFailed, setPollFailed] = useState(false);
  const isPollingRef = useRef(false);
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

  const [showIndicators, setShowIndicators] = useState(() => {
    try {
      const saved = localStorage.getItem('sf_showIndicators');
      return saved === null ? false : saved === 'true';
    } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('sf_showIndicators', String(showIndicators)); } catch (err) {}
  }, [showIndicators]);

  useEffect(() => {
    if (!lockoutUntil) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(remaining);
      if (remaining <= 0) { setLockoutUntil(null); setLoginAttempts(0); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) setShowExportMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadExportLibraries = async () => {
    if (!window.html2canvas) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve; script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    if (!window.jspdf) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve; script.onerror = reject;
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
        scale: 2, backgroundColor: '#002812', useCORS: true, logging: false,
        windowWidth: element.scrollWidth + 80
      });
      const baseName = `Horario_Semanal_${currentWeekStart}`;
      const mobile = isMobileDevice();
      if (format === 'png' || format === 'jpg') {
        const dataUrl = format === 'png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.95);
        const blob = dataURLtoBlob(dataUrl);
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const filename = `${baseName}.${format}`;
        if (mobile) setExportPreview({ format, blob, dataUrl, filename, mimeType, isPdf: false });
        else { forceDownload(blob, filename); pushToast('success', `Horario ${format.toUpperCase()} descargado`); }
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
        if (imgHeight <= maxHeight) pdf.addImage(imgData, 'PNG', 12, positionY, imgWidth, imgHeight);
        else {
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
        if (mobile) setExportPreview({ format: 'pdf', blob: pdfBlob, dataUrl: null, filename, mimeType: 'application/pdf', isPdf: true });
        else { forceDownload(pdfBlob, filename); pushToast('success', 'PDF descargado'); }
      }
    } catch (error) {
      console.error('Error al exportar horario:', error);
      pushToast('error', 'No se pudo generar el archivo.');
    } finally { setIsExporting(false); }
  };

  const lastActualMondayRef = useRef(getMondayOfCurrentWeek());
  useEffect(() => {
    const checkWeekChange = () => {
      const actualMonday = getMondayOfCurrentWeek();
      const previousMonday = lastActualMondayRef.current;
      if (actualMonday === previousMonday) return;
      lastActualMondayRef.current = actualMonday;
      setCurrentWeekStart(prev => (prev === previousMonday ? actualMonday : prev));
      setReportWeekStart(prev => (prev === previousMonday ? actualMonday : prev));
    };
    const interval = setInterval(checkWeekChange, 60000);
    window.addEventListener('focus', checkWeekChange);
    return () => { clearInterval(interval); window.removeEventListener('focus', checkWeekChange); };
  }, []);

  const loadCloudData = async () => {
    setIsLoaded(false);
    setLoadError('');
    try {
      const [savedOps, savedSchedule, savedVac, savedOt, savedAssign, savedProd] = await withTimeout(Promise.all([
        redis.get('sf_operators'), redis.get('sf_scheduleData'), redis.get('sf_vacations'),
        redis.get('sf_overtime'), redis.get('sf_assignments'), redis.get('sf_productivity'),
      ]), LOAD_TIMEOUT_MS);
      setPollFailed(false);
      setAssignments(savedAssign && typeof savedAssign === 'object' && !Array.isArray(savedAssign) ? savedAssign : {});
      setOvertimeRequests(Array.isArray(savedOt) ? savedOt : []);
      setOperators(Array.isArray(savedOps) ? savedOps : []);
      setScheduleData(savedSchedule && typeof savedSchedule === 'object' ? savedSchedule : {});
      setVacationRequests(Array.isArray(savedVac) ? savedVac : []);
      const prod = savedProd && typeof savedProd === 'object' && !Array.isArray(savedProd) ? savedProd : {};
      setProductivityData(prod);
      setProductivityDraft(prod);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      if (typeof navigator !== 'undefined' && navigator.onLine === false) setLoadError('Sin conexión a internet. Conéctate a una red e intenta de nuevo.');
      else if (error && error.message === 'timeout') setLoadError('El servidor tardó demasiado en responder. Puede ser tu conexión o el servicio; intenta de nuevo en unos segundos.');
      else setLoadError('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
    } finally { setIsLoaded(true); }
  };

  useEffect(() => { loadCloudData(); }, []);

  useEffect(() => {
    if (isLoaded) { setLoadSeconds(0); return; }
    const t = setInterval(() => setLoadSeconds(sec => sec + 1), 1000);
    return () => clearInterval(t);
  }, [isLoaded]);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => { setIsOffline(false); setPollFailed(false); };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, []);

  useEffect(() => {
    if (!isLoaded || loadError) return;
    const interval = setInterval(async () => {
      if (isUpdatingRef.current || isPollingRef.current) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      isPollingRef.current = true;
      try {
        const [savedOps, savedSchedule, savedVac, savedOt, savedAssign, savedProd] = await withTimeout(Promise.all([
          redis.get('sf_operators'), redis.get('sf_scheduleData'), redis.get('sf_vacations'),
          redis.get('sf_overtime'), redis.get('sf_assignments'), redis.get('sf_productivity'),
        ]), POLL_TIMEOUT_MS);
        setPollFailed(false);
        if (!isUpdatingRef.current) {
          if (savedAssign && typeof savedAssign === 'object' && !Array.isArray(savedAssign)) setAssignments(savedAssign);
          if (Array.isArray(savedOt)) setOvertimeRequests(savedOt);
          if (Array.isArray(savedOps)) setOperators(savedOps);
          if (savedSchedule && typeof savedSchedule === 'object') setScheduleData(savedSchedule);
          if (Array.isArray(savedVac)) setVacationRequests(savedVac);
          if (savedProd && typeof savedProd === 'object' && !Array.isArray(savedProd)) {
            setProductivityData(savedProd);
            setProductivityDraft(savedProd);
          }
        }
      } catch (err) { console.error('Error en sincronización continua:', err); setPollFailed(true); }
      finally { isPollingRef.current = false; }
    }, 3000);
    return () => clearInterval(interval);
  }, [isLoaded, loadError]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('Todas las áreas');
  const [selectedEquipment, setSelectedEquipment] = useState('Todos los equipos');
  const [onlyExpiringLicenses, setOnlyExpiringLicenses] = useState(false);
  const [isAddOperatorOpen, setIsAddOperatorOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState(null);
  const [isRequestVacationOpen, setIsRequestVacationOpen] = useState(false);
  const [isOvertimeOpen, setIsOvertimeOpen] = useState(false);
  const [otError, setOtError] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [cellAssignment, setCellAssignment] = useState('');

  useEffect(() => {
    if (selectedCell) setCellAssignment(assignments[`${selectedCell.operatorId}_${selectedCell.dateStr}`] || '');
  }, [selectedCell]);

  const [newOp, setNewOp] = useState({ name: '', socioNumber: '', zone: '', equipment: '', licenseExpiry: '2027-12-31' });
  const [newVac, setNewVac] = useState({
    operatorId: '', startDate: formatDateLocal(new Date()),
    endDate: formatDateLocal(new Date(Date.now() + 86400000 * 5)), type: 'Vacaciones', reason: ''
  });
  const [newOt, setNewOt] = useState({
    operatorId: '', date: formatDateLocal(new Date()), hours: 2, type: OVERTIME_TYPES[0], reason: ''
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
        dateStr: formatDateLocal(d), dayName: dayNames[d.getDay()],
        dayNumber: d.getDate(),
        monthName: d.toLocaleDateString('es-ES', { month: 'short' }),
        isWeekend: d.getDay() === 0 || d.getDay() === 6
      });
    }
    return days;
  }, [currentWeekStart]);

  useEffect(() => {
    const isInCurrentView = weekDays.some(d => d.dateStr === selectedMobileDay);
    if (!isInCurrentView) setSelectedMobileDay(weekDays[0].dateStr);
  }, [currentWeekStart, weekDays, selectedMobileDay]);

  const isHistoricalWeek = useMemo(() => currentWeekStart < getMondayOfCurrentWeek(), [currentWeekStart]);
  const isCurrentWeek = useMemo(() => currentWeekStart === getMondayOfCurrentWeek(), [currentWeekStart]);
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
    vacationRequests.filter(r => r.status === 'Aprobado').forEach(req => {
      const [sY, sM, sD] = req.startDate.split('-').map(Number);
      const [eY, eM, eD] = req.endDate.split('-').map(Number);
      let curr = new Date(sY, sM - 1, sD);
      const end = new Date(eY, eM - 1, eD);
      while (curr <= end) { locked.add(`${req.operatorId}_${formatDateLocal(curr)}`); curr.setDate(curr.getDate() + 1); }
    });
    return locked;
  }, [vacationRequests]);

  const overtimeByCell = useMemo(() => {
    const map = {};
    overtimeRequests.forEach(r => {
      if (r.status === 'Rechazado') return;
      const key = `${r.operatorId}_${r.date}`;
      if (!map[key]) map[key] = { approved: 0, pending: 0 };
      if (r.status === 'Aprobado') map[key].approved += Number(r.hours) || 0;
      else map[key].pending += Number(r.hours) || 0;
    });
    return map;
  }, [overtimeRequests]);

  const otWarnings = useMemo(() => {
    const warnings = [];
    if (!isOvertimeOpen || !newOt.operatorId || !newOt.date) return warnings;
    const hours = Number(newOt.hours);
    if (!hours || hours <= 0) return warnings;
    const active = ['Pendiente', 'Aprobado'];
    const mine = overtimeRequests.filter(r => r.operatorId === newOt.operatorId && active.includes(r.status));
    const weekDates = getWeekDatesFromDate(newOt.date);
    if (newOt.type === 'Hora extra') {
      const dayTotal = mine.filter(r => r.date === newOt.date).reduce((a, r) => a + (Number(r.hours) || 0), 0) + hours;
      if (dayTotal > OT_MAX_HOURS_PER_DAY) warnings.push({ level: 'warning', text: `Ese día sumaría ${dayTotal}h extra (máximo legal: ${OT_MAX_HOURS_PER_DAY}h por día).` });
      const days = new Set(mine.filter(r => r.type === 'Hora extra' && weekDates.includes(r.date)).map(r => r.date));
      days.add(newOt.date);
      if (days.size > OT_MAX_DAYS_PER_WEEK) warnings.push({ level: 'warning', text: `Serían ${days.size} días con horas extra en la semana (máximo legal: ${OT_MAX_DAYS_PER_WEEK}).` });
    }
    const weekOt = mine.filter(r => weekDates.includes(r.date)).reduce((a, r) => a + (Number(r.hours) || 0), 0) + hours;
    const level = getOvertimeLevel(weekOt);
    if (level === 'danger') warnings.push({ level, text: `ALERTA: la semana quedaría en ${weekOt}h extra (alerta desde ${OT_ALERT_HOURS}h).` });
    else if (level === 'warning') warnings.push({ level, text: `La semana quedaría en ${weekOt}h extra (señal desde ${OT_WARN_HOURS}h).` });
    return warnings;
  }, [isOvertimeOpen, newOt, overtimeRequests]);

  const lockedCellsInView = useMemo(() => {
    let count = 0;
    operators.forEach(op => { weekDays.forEach(day => { if (lockedCells.has(`${op.id}_${day.dateStr}`)) count++; }); });
    return count;
  }, [operators, weekDays, lockedCells]);

  const operatorsWithoutRest = useMemo(() => {
    const set = new Set();
    if (isHistoricalWeek) return set;
    const dates = weekDays.map(d => d.dateStr);
    operators.forEach(op => { if (!hasRestDay(scheduleData, op.id, dates)) set.add(op.id); });
    return set;
  }, [operators, scheduleData, weekDays, isHistoricalWeek]);

  const teStats = useMemo(
    () => computeTeStats(teMonth, operators, scheduleData, assignments, overtimeRequests),
    [teMonth, operators, scheduleData, assignments, overtimeRequests]
  );
  const reportWeekDays = useMemo(() => buildWeekDays(reportWeekStart), [reportWeekStart]);
  const reportTeMonth = reportWeekDays[3].dateStr.slice(0, 7);
  const weekTeStats = useMemo(
    () => computeTeStats(reportTeMonth, operators, scheduleData, assignments, overtimeRequests),
    [reportTeMonth, operators, scheduleData, assignments, overtimeRequests]
  );

  const hcVsFte = useMemo(() => {
    const weekDates = reportWeekDays.map(d => d.dateStr);
    const hc = operators.length;
    const otWeek = sumOvertimeTotal(overtimeRequests, weekDates);
    const fte = hc + otWeek / TE_BASE_HOURS;
    return { hc, fte, otWeek };
  }, [operators, overtimeRequests, reportWeekDays]);

  // Productividad: historial mensual con edición permitida solo para el mes actual y el anterior.
  const currentYm = useMemo(() => formatDateLocal(now).slice(0, 7), [now]);
  const prevYm = useMemo(() => shiftMonth(currentYm, -1), [currentYm]);
  const canEditProductivityMonth = productivityMonth === currentYm || productivityMonth === prevYm;

  const productivityStats = useMemo(() => {
    const ym = productivityMonth;
    const monthOt = overtimeRequests
      .filter(r => r.status === 'Aprobado' && typeof r.date === 'string' && r.date.startsWith(ym))
      .reduce((a, r) => a + (Number(r.hours) || 0), 0);
    const hc = operators.length;
    const fte = hc + monthOt / TE_BASE_HOURS;
    const entry = productivityData[ym] || {};
    const expectedHL = Number(entry.expectedHL) || 0;
    const realHL = Number(entry.realHL) || 0;
    const expectedProd = fte > 0 ? expectedHL / fte : 0;
    const realProd = fte > 0 ? realHL / fte : 0;
    const diff = realProd - expectedProd;
    const cumplimiento = expectedProd > 0 ? (realProd / expectedProd) * 100 : 0;
    return { ym, hc, otMonth: monthOt, fte, expectedHL, realHL, expectedProd, realProd, diff, cumplimiento };
  }, [operators, overtimeRequests, productivityData, productivityMonth]);

  // ✅ Handlers para inputs de productividad
  const handleProductivityInput = (ym, field, value) => {
    setProductivityDraft(prev => ({
      ...prev,
      [ym]: { ...(prev[ym] || {}), [field]: value }
    }));
  };

  const handleProductivityBlur = async (ym, field) => {
    if (ym !== currentYm && ym !== prevYm) return;
    const raw = productivityDraft[ym]?.[field];
    const num = (raw === '' || raw === undefined || raw === null) ? 0 : Number(raw) || 0;
    const updated = {
      ...productivityData,
      [ym]: { ...(productivityData[ym] || {}), [field]: num }
    };
    const previous = productivityData;
    setProductivityData(updated);
    setProductivityDraft(updated);
    isUpdatingRef.current = true;
    setSyncStatus('saving');
    try {
      await withTimeout(redis.set('sf_productivity', updated), LOAD_TIMEOUT_MS);
      reportSyncResult(true);
    } catch (error) {
      console.error('Error al guardar productividad:', error);
      setProductivityData(previous);
      setProductivityDraft(previous);
      reportSyncResult(false);
      pushToast('error', 'Error al guardar productividad. Cambio revertido.');
    } finally {
      setTimeout(() => { isUpdatingRef.current = false; }, 1500);
    }
  };

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
        if (consecutiveN > 5) conflicts.push(`${op?.name || operatorId} tendría ${consecutiveN} noches consecutivas (máximo recomendado: 5).`);
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
          if (idx === 5 || idx === 6) newSchedule[key] = 'DES';
          else {
            if (op.shiftPattern === 'Mañana') newSchedule[key] = 'M';
            else if (op.shiftPattern === 'Tarde') newSchedule[key] = 'T';
            else if (op.shiftPattern === 'Noche') newSchedule[key] = 'N';
            else return;
          }
          changed = true;
        }
      });
    });
    if (changed) { setScheduleData(newSchedule); redis.set('sf_scheduleData', newSchedule).catch(console.error); }
  }, [operators, weekDays, isLoaded, isHistoricalWeek, lockedCells]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (lockoutUntil && Date.now() < lockoutUntil) return;
    const email = loginEmail.trim().toLowerCase();
    const user = MOCK_USERS.find(u => u.email.toLowerCase() === email && u.pass === loginPass);
    if (user) {
      setCurrentUser(user); setLoginError(''); setLoginAttempts(0); setLoginPass('');
      try { sessionStorage.setItem('sf_session', JSON.stringify(user)); } catch (err) {}
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
  const canViewReports = currentUser && ['Admin', 'Supervisor'].includes(currentUser.role);

  const licenseAlerts = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return operators.map(op => {
      if (!op.licenseExpiry) return null;
      const expiry = new Date(op.licenseExpiry + 'T00:00:00');
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 30) return null;
      return { ...op, diffDays, expired: diffDays < 0 };
    }).filter(Boolean).sort((a, b) => a.diffDays - b.diffDays);
  }, [operators]);

  const filteredOperators = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return operators.filter(op => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = op.name.toLowerCase().includes(q) || op.id.toLowerCase().includes(q) || String(op.socioNumber || '').toLowerCase().includes(q);
      const matchesZone = selectedZone === 'Todas las áreas' || op.zone === selectedZone;
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
    if (selectedZone !== 'Todas las áreas') count++;
    if (selectedEquipment !== 'Todos los equipos') count++;
    if (onlyExpiringLicenses) count++;
    return count;
  }, [searchQuery, selectedZone, selectedEquipment, onlyExpiringLicenses]);

  const clearAllFilters = () => {
    setSearchQuery(''); setSelectedZone('Todas las áreas');
    setSelectedEquipment('Todos los equipos'); setOnlyExpiringLicenses(false);
    pushToast('info', 'Filtros limpiados');
  };

  const handleSetShift = async (operatorId, dateStr, shiftCode, isFullWeek = false, assignment = '') => {
    if (!canEditShifts) return;
    if (isHistoricalWeek) return;
    const clickedKey = `${operatorId}_${dateStr}`;
    if (lockedCells.has(clickedKey)) return;
    const conflicts = detectConflicts(operatorId, dateStr, shiftCode, isFullWeek);
    if (conflicts.length > 0) { pushToast('warning', conflicts[0], { duration: 5000 }); return; }
    const previousSchedule = { ...scheduleData };
    const previousAssignments = { ...assignments };
    const previousValue = scheduleData[clickedKey];
    const newValue = shiftCode;
    const newAssignment = ['M', 'T', 'N'].includes(shiftCode) ? assignment : '';
    if (previousValue === newValue && !isFullWeek && (assignments[clickedKey] || '') === newAssignment) {
      setSelectedCell(null); setApplyToFullWeek(false); return;
    }
    isUpdatingRef.current = true;
    setSyncStatus('saving');
    const updatedSchedule = { ...scheduleData };
    const affectedKeys = [];
    if (isFullWeek) {
      weekDays.forEach(day => {
        const key = `${operatorId}_${day.dateStr}`;
        if (!lockedCells.has(key)) { updatedSchedule[key] = shiftCode; affectedKeys.push(key); }
      });
    } else {
      updatedSchedule[clickedKey] = shiftCode; affectedKeys.push(clickedKey);
    }
    const updatedAssignments = { ...assignments };
    affectedKeys.forEach(key => {
      if (newAssignment) updatedAssignments[key] = newAssignment;
      else delete updatedAssignments[key];
    });
    setScheduleData(updatedSchedule);
    setAssignments(updatedAssignments);
    setSelectedCell(null);
    setApplyToFullWeek(false);
    triggerFlash(affectedKeys);
    try {
      await withTimeout(Promise.all([
        redis.set('sf_scheduleData', updatedSchedule),
        redis.set('sf_assignments', updatedAssignments)
      ]), LOAD_TIMEOUT_MS);
      reportSyncResult(true);
      const op = operators.find(o => o.id === operatorId);
      const dayLabel = isFullWeek ? 'toda la semana' : dateStr;
      const assignLabel = newAssignment ? ` · ${newAssignment}` : '';
      if (WORK_CODES.includes(shiftCode) && !hasRestDay(updatedSchedule, operatorId, weekDays.map(d => d.dateStr))) {
        pushToast('warning', `Recuerda asignar un día de descanso a ${op?.name || operatorId} esta semana.`, { duration: 7000 });
      }
      pushToast('success', `${op?.name || operatorId} → ${SHIFT_TYPES[shiftCode].label}${assignLabel} (${dayLabel})`, {
        undoAction: () => {
          setScheduleData(previousSchedule); setAssignments(previousAssignments);
          Promise.all([
            redis.set('sf_scheduleData', previousSchedule),
            redis.set('sf_assignments', previousAssignments)
          ]).then(() => pushToast('info', 'Cambio deshecho'))
            .catch(() => pushToast('error', 'No se pudo deshacer'));
        }
      });
    } catch (error) {
      console.error('Error al guardar turno:', error);
      setScheduleData(previousSchedule); setAssignments(previousAssignments);
      reportSyncResult(false);
      pushToast('error', 'Error al guardar. Cambio revertido.');
    } finally { setTimeout(() => { isUpdatingRef.current = false; }, 2500); }
  };

  const handleReassign = async (targetOperatorId) => {
    if (!reassignModal) return;
    const shiftCode = reassignShift;
    const newKey = `${targetOperatorId}_${reassignModal.dateStr}`;
    const previousSchedule = { ...scheduleData };
    const conflicts = detectConflicts(targetOperatorId, reassignModal.dateStr, shiftCode, false);
    if (conflicts.length > 0) { pushToast('warning', conflicts[0], { duration: 5000 }); return; }
    isUpdatingRef.current = true;
    setSyncStatus('saving');
    const updatedSchedule = { ...scheduleData, [newKey]: shiftCode };
    setScheduleData(updatedSchedule);
    setReassignModal(null);
    triggerFlash([newKey]);
    try {
      await withTimeout(redis.set('sf_scheduleData', updatedSchedule), LOAD_TIMEOUT_MS);
      reportSyncResult(true);
      const target = operators.find(o => o.id === targetOperatorId);
      const absent = operators.find(o => o.id === reassignModal.operatorId);
      pushToast('success', `${target?.name} cubrirá ${SHIFT_TYPES[shiftCode].label} de ${absent?.name} (${reassignModal.dateStr})`, {
        undoAction: () => {
          setScheduleData(previousSchedule);
          redis.set('sf_scheduleData', previousSchedule)
            .then(() => pushToast('info', 'Reasignación deshecha'))
            .catch(() => pushToast('error', 'No se pudo deshacer'));
        }
      });
      if (WORK_CODES.includes(shiftCode) && !hasRestDay(updatedSchedule, targetOperatorId, weekDays.map(d => d.dateStr))) {
        pushToast('warning', `Recuerda asignar un día de descanso a ${target?.name || targetOperatorId} esta semana.`, { duration: 7000 });
      }
    } catch (error) {
      console.error('Error al reasignar:', error);
      setScheduleData(previousSchedule);
      reportSyncResult(false);
      pushToast('error', 'Error al reasignar. Cambio revertido.');
    } finally { setTimeout(() => { isUpdatingRef.current = false; }, 2500); }
  };

  const handleSaveOperator = async (e) => {
    e.preventDefault();
    if (!newOp.name || !canManageOperators) return;
    if (!TE_AREAS.includes(newOp.zone)) { pushToast('warning', 'Selecciona el área de trabajo.'); return; }
    if (!FORKLIFT_TYPES.includes(newOp.equipment)) { pushToast('warning', 'Selecciona el tipo de equipo.'); return; }
    const socioNumber = String(newOp.socioNumber || '').trim();
    if (!socioNumber) { pushToast('warning', 'Escribe el # de socio.'); return; }
    const socioDuplicado = operators.find(op =>
      String(op.socioNumber || '').trim().toLowerCase() === socioNumber.toLowerCase() &&
      (!editingOperator || op.id !== editingOperator.id)
    );
    if (socioDuplicado) { pushToast('warning', `El # de socio ${socioNumber} ya pertenece a ${socioDuplicado.name}.`, { duration: 5000 }); return; }
    isUpdatingRef.current = true;
    const previousOps = operators;
    let updatedOps;
    if (editingOperator) updatedOps = operators.map(op => op.id === editingOperator.id ? { ...op, ...newOp, socioNumber } : op);
    else {
      const maxIdNum = operators.reduce((max, op) => {
        const num = parseInt(op.id.replace(/\D/g, ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 100);
      const newId = `M-${maxIdNum + 1}`;
      updatedOps = [...operators, { id: newId, ...newOp, socioNumber, status: 'Activo' }];
    }
    setOperators(updatedOps);
    setIsAddOperatorOpen(false); setEditingOperator(null);
    setSyncStatus('saving');
    try {
      await withTimeout(redis.set('sf_operators', updatedOps), LOAD_TIMEOUT_MS);
      reportSyncResult(true);
      pushToast('success', editingOperator ? 'Operador actualizado' : 'Operador registrado');
    } catch (error) {
      console.error('Error al guardar operador:', error);
      setOperators(previousOps);
      reportSyncResult(false);
      pushToast('error', 'Error al guardar operador. Cambio revertido.');
    } finally { setTimeout(() => { isUpdatingRef.current = false; }, 2500); }
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
        await withTimeout(redis.set('sf_operators', updatedOps), LOAD_TIMEOUT_MS);
        reportSyncResult(true);
        pushToast('success', 'Operador eliminado');
      } catch (error) {
        console.error('Error al eliminar en la base de datos:', error);
        setOperators(previousOps);
        reportSyncResult(false);
        pushToast('error', 'Error al eliminar. Cambio revertido.');
      } finally { setTimeout(() => { isUpdatingRef.current = false; }, 2500); }
    }
  };

  const handleCreateVacationRequest = async (e) => {
    e.preventDefault();
    const op = operators.find(o => o.id === newVac.operatorId);
    if (!op) { setVacDateError('Selecciona un operador válido.'); return; }
    if (!newVac.startDate || !newVac.endDate) { setVacDateError('Selecciona ambas fechas.'); return; }
    if (newVac.endDate < newVac.startDate) { setVacDateError('La fecha de fin no puede ser anterior a la fecha de inicio.'); return; }
    setVacDateError('');
    isUpdatingRef.current = true;
    setSyncStatus('saving');
    const newReq = {
      id: generateId(), operatorId: op.id, operatorName: op.name,
      startDate: newVac.startDate, endDate: newVac.endDate,
      type: newVac.type, status: 'Pendiente',
      reason: newVac.reason || 'Sin motivo especificado'
    };
    const previousVac = vacationRequests;
    const updatedVac = [newReq, ...vacationRequests];
    setVacationRequests(updatedVac);
    setIsRequestVacationOpen(false);
    try {
      await withTimeout(redis.set('sf_vacations', updatedVac), LOAD_TIMEOUT_MS);
      reportSyncResult(true);
      pushToast('success', 'Solicitud registrada');
    } catch (error) {
      console.error('Error al guardar permiso:', error);
      setVacationRequests(previousVac);
      reportSyncResult(false);
      pushToast('error', 'Error al registrar solicitud. Cambio revertido.');
    } finally { setTimeout(() => { isUpdatingRef.current = false; }, 2500); }
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
      await withTimeout(redis.set('sf_vacations', updatedVac), LOAD_TIMEOUT_MS);
      reportSyncResult(true);
      pushToast('success', 'Solicitud cancelada');
    } catch (error) {
      console.error('Error al cancelar permiso:', error);
      setVacationRequests(previousVac);
      reportSyncResult(false);
      pushToast('error', 'Error al cancelar. Cambio revertido.');
    } finally { setTimeout(() => { isUpdatingRef.current = false; }, 2500); }
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
      await withTimeout(redis.set('sf_vacations', updatedVac), LOAD_TIMEOUT_MS);
      if (newStatus === 'Aprobado' && req) await withTimeout(redis.set('sf_scheduleData', updatedSchedule), LOAD_TIMEOUT_MS);
      reportSyncResult(true);
      pushToast('success', `Solicitud marcada como ${newStatus}`);
    } catch (error) {
      console.error('Error al actualizar estado del permiso:', error);
      setVacationRequests(previousVac); setScheduleData(previousSchedule);
      reportSyncResult(false);
      pushToast('error', 'Error al actualizar. Cambio revertido.');
    } finally { setTimeout(() => { isUpdatingRef.current = false; }, 2500); }
  };

  const handleCreateOvertime = async (e) => {
    e.preventDefault();
    const op = operators.find(o => o.id === newOt.operatorId);
    const hours = Number(newOt.hours);
    if (!op) { setOtError('Selecciona un operador válido.'); return; }
    if (!newOt.date) { setOtError('Selecciona la fecha.'); return; }
    if (!hours || hours <= 0 || hours > 12) { setOtError('Las horas deben estar entre 0.5 y 12.'); return; }
    if (lockedCells.has(`${op.id}_${newOt.date}`)) { setOtError(`${op.name} tiene una ausencia aprobada ese día.`); return; }
    setOtError('');
    isUpdatingRef.current = true;
    setSyncStatus('saving');
    const newReq = {
      id: generateId(), operatorId: op.id, operatorName: op.name,
      date: newOt.date, hours, type: newOt.type,
      reason: newOt.reason.trim() || 'Sin motivo especificado',
      status: 'Pendiente',
      createdBy: currentUser?.name || '',
      createdAt: new Date().toISOString()
    };
    const previousOt = overtimeRequests;
    const updatedOt = [newReq, ...overtimeRequests];
    setOvertimeRequests(updatedOt);
    setIsOvertimeOpen(false);
    try {
      await withTimeout(redis.set('sf_overtime', updatedOt), LOAD_TIMEOUT_MS);
      reportSyncResult(true);
      pushToast('success', `Horas extras registradas: ${op.name} (+${hours}h)`);
    } catch (error) {
      console.error('Error al guardar horas extras:', error);
      setOvertimeRequests(previousOt);
      reportSyncResult(false);
      pushToast('error', 'Error al registrar horas extras. Cambio revertido.');
    } finally { setTimeout(() => { isUpdatingRef.current = false; }, 2500); }
  };

  const handleOvertimeStatus = async (id, newStatus) => {
    if (!canApproveVacations) return;
    const req = overtimeRequests.find(r => r.id === id);
    if (!req) return;
    isUpdatingRef.current = true;
    setSyncStatus('saving');
    const previousOt = overtimeRequests;
    const updatedOt = overtimeRequests.map(r => r.id === id
      ? { ...r, status: newStatus, reviewedBy: currentUser?.name || '', reviewedAt: new Date().toISOString() }
      : r);
    setOvertimeRequests(updatedOt);
    try {
      await withTimeout(redis.set('sf_overtime', updatedOt), LOAD_TIMEOUT_MS);
      reportSyncResult(true);
      pushToast('success', `Horas extras marcadas como ${newStatus}`);
      if (newStatus === 'Aprobado') {
        const weekDates = getWeekDatesFromDate(req.date);
        const total = sumOvertime(updatedOt, req.operatorId, weekDates);
        const level = getOvertimeLevel(total);
        if (level === 'danger') pushToast('error', `ALERTA: ${req.operatorName} llega a ${total.toFixed(1)}h extra en esa semana (alerta desde ${OT_ALERT_HOURS}h).`, { duration: 8000 });
        else if (level === 'warning') pushToast('warning', `${req.operatorName} llega a ${total.toFixed(1)}h extra en esa semana (señal desde ${OT_WARN_HOURS}h).`, { duration: 7000 });
      }
    } catch (error) {
      console.error('Error al actualizar horas extras:', error);
      setOvertimeRequests(previousOt);
      reportSyncResult(false);
      pushToast('error', 'Error al actualizar. Cambio revertido.');
    } finally { setTimeout(() => { isUpdatingRef.current = false; }, 2500); }
  };

  const handleDeleteOvertime = async (id) => {
    if (!canApproveVacations) return;
    if (!window.confirm('¿Eliminar este registro de horas extras?')) return;
    isUpdatingRef.current = true;
    setSyncStatus('saving');
    const previousOt = overtimeRequests;
    const updatedOt = overtimeRequests.filter(r => r.id !== id);
    setOvertimeRequests(updatedOt);
    try {
      await withTimeout(redis.set('sf_overtime', updatedOt), LOAD_TIMEOUT_MS);
      reportSyncResult(true);
      pushToast('success', 'Registro eliminado');
    } catch (error) {
      console.error('Error al eliminar horas extras:', error);
      setOvertimeRequests(previousOt);
      reportSyncResult(false);
      pushToast('error', 'Error al eliminar. Cambio revertido.');
    } finally { setTimeout(() => { isUpdatingRef.current = false; }, 2500); }
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
      pdf.text(`Semana del ${reportWeekDays[0].dayNumber} ${reportWeekDays[0].monthName} al ${reportWeekDays[6].dayNumber} ${reportWeekDays[6].monthName}`, 14, 19);
      const totalOps = operators.length;
      const licenseOk = operators.filter(op => {
        if (!op.licenseExpiry) return false;
        const exp = new Date(op.licenseExpiry + 'T00:00:00');
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return exp >= today;
      }).length;
      let totalWorked = 0, totalAbsent = 0, totalSlots = 0;
      reportWeekDays.forEach(day => {
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
      reportWeekDays.forEach(day => {
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
      pdf.text(`Horas extra por operador (semana actual) · T.E de ${formatMonthLabel(reportTeMonth)}`, 14, y);
      y += 6;
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Operador', 16, y);
      pdf.text('Área', 80, y);
      pdf.text('M', 130, y);
      pdf.text('T', 139, y);
      pdf.text('N', 148, y);
      pdf.text('Ext', 156, y);
      pdf.text('Total', 168, y);
      pdf.text('T.E', 185, y);
      y += 4;
      pdf.line(14, y, W - 14, y);
      y += 5;
      const sortedByHours = [...operators].map(op => {
        const weekDates = reportWeekDays.map(d => d.dateStr);
        let totalH = 0;
        const c = { M: 0, T: 0, N: 0 };
        weekDates.forEach(date => {
          const code = scheduleData[`${op.id}_${date}`];
          if (code && SHIFT_HOURS[code] !== undefined) {
            totalH += SHIFT_HOURS[code];
            if (['M', 'T', 'N'].includes(code)) c[code]++;
          }
        });
        const otH = sumOvertime(overtimeRequests, op.id, weekDates);
        return { ...op, totalH: totalH + otH, otH, c };
      }).sort((a, b) => b.totalH - a.totalH);
      sortedByHours.forEach(op => {
        if (y > H - 25) return;
        pdf.setTextColor(255, 255, 255);
        pdf.text(op.name.substring(0, 30), 16, y);
        pdf.setTextColor(148, 163, 184);
        pdf.text(areaLabel(op).substring(0, 25), 80, y);
        pdf.setTextColor(255, 255, 255);
        pdf.text(String(op.c.M), 130, y);
        pdf.text(String(op.c.T), 139, y);
        pdf.text(String(op.c.N), 148, y);
        if (op.otH >= OT_ALERT_HOURS) pdf.setTextColor(239, 68, 68);
        else if (op.otH >= OT_WARN_HOURS) pdf.setTextColor(251, 191, 36);
        else pdf.setTextColor(16, 185, 129);
        pdf.text(op.otH > 0 ? `${op.otH.toFixed(1)}h` : '-', 156, y);
        pdf.setTextColor(16, 185, 129);
        pdf.text(`${op.totalH.toFixed(1)}h`, 168, y);
        pdf.setTextColor(255, 255, 255);
        pdf.text(fmtTE(weekTeStats.perOp[op.id]?.te ?? 0), 185, y);
        y += 5.5;
      });
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Generado el ${new Date().toLocaleString('es-MX')} por ${currentUser?.name || 'Usuario'}`, 14, H - 8);
      const pdfBlob = pdf.output('blob');
      const filename = `Reporte_Ejecutivo_${reportWeekStart}.pdf`;
      if (isMobileDevice()) setExportPreview({ format: 'pdf', blob: pdfBlob, dataUrl: null, filename, mimeType: 'application/pdf', isPdf: true });
      else { forceDownload(pdfBlob, filename); pushToast('success', 'Reporte descargado'); }
    } catch (error) {
      console.error('Error al generar reporte:', error);
      pushToast('error', 'No se pudo generar el reporte');
    } finally { setIsExporting(false); }
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
            {loginError && <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-center font-bold">{loginError}</div>}
            <div>
              <label className="block text-emerald-300 font-bold mb-1">Correo Electrónico</label>
              <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm" />
            </div>
            <div>
              <label className="block text-emerald-300 font-bold mb-1">Contraseña</label>
              <div className="relative">
                <input type={showLoginPass ? 'text' : 'password'} required value={loginPass} onChange={(e) => setLoginPass(e.target.value)} disabled={!!lockoutUntil} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 pr-10 text-white focus:outline-none focus:border-emerald-500 text-sm disabled:opacity-50" />
                <button type="button" onClick={() => setShowLoginPass(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-200" tabIndex={-1}>
                  {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={!!lockoutUntil} className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition shadow-lg text-sm mt-2">
              {lockoutUntil ? `Bloqueado (${lockoutRemaining}s)` : 'Ingresar al Sistema'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    const isSlow = loadSeconds >= SLOW_LOAD_SECONDS;
    const progress = Math.min(100, Math.round((loadSeconds / (LOAD_TIMEOUT_MS / 1000)) * 100));
    return (
      <div className="min-h-screen bg-[#021f12] flex items-center justify-center p-4">
        <div className="w-full max-w-xs flex flex-col items-center gap-3 text-emerald-300 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center">
            {isOffline ? <CloudOff className="w-8 h-8 text-red-300" /> : <Truck className="w-8 h-8 text-emerald-300" />}
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-bold tracking-wide">Cargando datos…</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-emerald-950 overflow-hidden border border-emerald-900">
            <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${isSlow ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(progress, 6)}%` }} />
          </div>
          {isOffline ? (
            <p className="text-xs text-red-300 font-semibold">Sin conexión a internet. Esperando a que vuelva la señal…</p>
          ) : isSlow ? (
            <p className="text-xs text-amber-300 font-semibold">La conexión está lenta. Sigue intentando, {loadSeconds}s…</p>
          ) : (
            <p className="text-[11px] text-emerald-500">Sincronizando con la base de datos</p>
          )}
          {(isSlow || isOffline) && (
            <button onClick={loadCloudData} className="mt-1 px-4 py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 transition">
              <RefreshCw className="w-3.5 h-3.5" /> Reintentar ahora
            </button>
          )}
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
          <button onClick={loadCloudData} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
          <button onClick={handleLogout} className="w-full mt-2 py-2 bg-transparent hover:bg-red-950/60 text-red-300 font-bold rounded-xl transition text-xs border border-red-900/60">
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
    ? getSuitableReplacements(reassignModal.operatorId, reassignModal.dateStr, reassignShift, operators, scheduleData, lockedCells, overtimeRequests)
    : [];

  return (
    <div className="min-h-screen bg-[#021f12] text-emerald-50 font-sans pb-12">
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-2">
          {toasts.map(t => (
            <Toast key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} onUndo={() => { if (t.undoAction) t.undoAction(); dismissToast(t.id); }} />
          ))}
        </div>
      </div>

      <header className="border-b border-emerald-800/60 bg-[#00471f] sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#006029] to-[#003818] border border-emerald-500/30 flex items-center justify-center relative shadow-md">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200" />
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 fill-red-600 absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-bold text-white">ShiftForklift</h1>
              <p className="text-[10px] sm:text-xs text-emerald-300/80">Gestión de Turnos y Personal</p>
            </div>
          </div>
          <nav className="hidden md:flex space-x-1 bg-[#02180d] p-1 rounded-xl border border-emerald-900">
            <button onClick={() => setActiveTab('scheduler')} className={`px-3 py-2 text-xs font-bold rounded-lg ${activeTab === 'scheduler' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>Matriz</button>
            <button onClick={() => setActiveTab('operators')} className={`px-3 py-2 text-xs font-bold rounded-lg ${activeTab === 'operators' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>Personal ({operators.length})</button>
            <button onClick={() => setActiveTab('vacations')} className={`px-3 py-2 text-xs font-bold rounded-lg ${activeTab === 'vacations' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>Permisos</button>
            <button onClick={() => setActiveTab('overtime')} className={`px-3 py-2 text-xs font-bold rounded-lg ${activeTab === 'overtime' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>Horas extras</button>
            {canViewReports && (
              <button onClick={() => setActiveTab('reports')} className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${activeTab === 'reports' ? 'bg-emerald-600 text-white' : 'text-emerald-300'}`}>
                <BarChart3 className="w-3 h-3" /> Reportes
              </button>
            )}
          </nav>
          <div className="flex items-center space-x-2 sm:space-x-3">
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
              <button onClick={() => { setActiveTab('operators'); setShowLicenseAlerts(true); }} className="relative p-1.5 sm:p-2 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 rounded-lg sm:rounded-xl transition">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">{licenseAlerts.length}</span>
              </button>
            )}
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white truncate max-w-[100px]">{currentUser.name}</div>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${currentUser.role === 'Admin' ? 'bg-red-900 text-red-200' : currentUser.role === 'Supervisor' ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-950 text-amber-200'}`}>{currentUser.role}</span>
            </div>
            <button onClick={handleLogout} className="p-1.5 sm:p-2 bg-red-950/80 hover:bg-red-800 border border-red-800 text-red-200 rounded-lg sm:rounded-xl transition" title="Cerrar Sesión">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <nav className="md:hidden sticky top-14 z-20 bg-[#021f12] border-b border-emerald-900/60">
        <div className="flex gap-1.5 overflow-x-auto px-2.5 py-2">
          <button onClick={() => setActiveTab('scheduler')} className={`shrink-0 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition ${activeTab === 'scheduler' ? 'bg-emerald-600 text-white' : 'bg-[#02180d] text-emerald-300 border border-emerald-900'}`}>Matriz</button>
          <button onClick={() => setActiveTab('operators')} className={`shrink-0 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition ${activeTab === 'operators' ? 'bg-emerald-600 text-white' : 'bg-[#02180d] text-emerald-300 border border-emerald-900'}`}>Personal ({operators.length})</button>
          <button onClick={() => setActiveTab('vacations')} className={`shrink-0 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition ${activeTab === 'vacations' ? 'bg-emerald-600 text-white' : 'bg-[#02180d] text-emerald-300 border border-emerald-900'}`}>Permisos</button>
          <button onClick={() => setActiveTab('overtime')} className={`shrink-0 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition ${activeTab === 'overtime' ? 'bg-emerald-600 text-white' : 'bg-[#02180d] text-emerald-300 border border-emerald-900'}`}>Horas extras</button>
          {canViewReports && (
            <button onClick={() => setActiveTab('reports')} className={`shrink-0 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap flex items-center gap-1.5 transition ${activeTab === 'reports' ? 'bg-emerald-600 text-white' : 'bg-[#02180d] text-emerald-300 border border-emerald-900'}`}>
              <BarChart3 className="w-3 h-3" /> Reportes
            </button>
          )}
        </div>
      </nav>

      {(isOffline || pollFailed) && (
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 mt-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${isOffline ? 'bg-red-950/80 border-red-800 text-red-200' : 'bg-amber-950/80 border-amber-700/70 text-amber-200'}`}>
            <CloudOff className="w-4 h-4 shrink-0" />
            <span className="flex-1">
              {isOffline ? 'Sin conexión a internet. Lo que ves puede estar desactualizado y los cambios no se guardarán hasta que vuelva la señal.' : 'El servidor responde lento o no responde. Reintentando automáticamente; lo que ves puede estar desactualizado.'}
            </span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 mt-3 sm:mt-6">
        {activeTab === 'scheduler' && (
          <div className="space-y-2.5 sm:space-y-4">
            {isHistoricalWeek && (
              <div className="bg-slate-900/70 border border-slate-600/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-800 border border-slate-600/60 flex items-center justify-center shrink-0">
                  <History className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-100">Semana histórica — Solo lectura</h3>
                  <p className="text-[10px] sm:text-xs text-slate-300 mt-0.5">Esta semana ya pasó. Los turnos están bloqueados.</p>
                </div>
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
              </div>
            )}
            {!isHistoricalWeek && lockedCellsInView > 0 && (
              <div className="bg-purple-950/40 border border-purple-700/40 rounded-lg px-3 py-1.5 flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                <p className="text-[11px] text-purple-200 text-center leading-tight">
                  {lockedCellsInView} turno(s) bloqueado(s). <span className="text-purple-300">Toca para reasignar.</span>
                </p>
              </div>
            )}
            <div className="bg-[#003818] border border-emerald-800/70 rounded-xl p-2.5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => {
                    const [y, m, d] = currentWeekStart.split('-').map(Number);
                    setCurrentWeekStart(formatDateLocal(new Date(y, m - 1, d - 7)));
                  }} className="p-1.5 bg-[#022415] hover:bg-emerald-900 rounded-lg text-emerald-200 border border-emerald-800/60 transition"><ChevronLeft className="w-4 h-4"/></button>
                  <div className="text-[11px] sm:text-xs font-bold text-white bg-[#02180d] px-2.5 py-1.5 rounded-lg border border-emerald-900 flex items-center gap-1.5">
                    {isHistoricalWeek && <History className="w-3 h-3 text-slate-400" />}
                    {isCurrentWeek && <Activity className="w-3 h-3 text-emerald-400" />}
                    <span className="whitespace-nowrap">{weekDays[0].dayNumber} {weekDays[0].monthName} - {weekDays[6].dayNumber} {weekDays[6].monthName}</span>
                  </div>
                  <button onClick={() => {
                    const [y, m, d] = currentWeekStart.split('-').map(Number);
                    setCurrentWeekStart(formatDateLocal(new Date(y, m - 1, d + 7)));
                  }} className="p-1.5 bg-[#022415] hover:bg-emerald-900 rounded-lg text-emerald-200 border border-emerald-800/60 transition"><ChevronRight className="w-4 h-4"/></button>
                </div>
                <div className="flex items-center gap-1.5">
                  {!isCurrentWeek && (
                    <button onClick={() => setCurrentWeekStart(getMondayOfCurrentWeek())} className="px-2 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Hoy
                    </button>
                  )}
                  <div className="relative" ref={exportMenuRef}>
                    <button disabled={isExporting} onClick={() => setShowExportMenu(!showExportMenu)} className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition border border-emerald-500/50 shadow">
                      {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">Exportar</span>
                    </button>
                    {showExportMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-[#002e14] border border-emerald-700 rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
                        <div className="p-2 border-b border-emerald-800 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Formato</div>
                        <button onClick={() => handleExport('png')} className="w-full text-left px-3 py-2.5 text-emerald-100 hover:bg-emerald-800/80 flex items-center gap-2 transition">
                          <ImageIcon className="w-4 h-4 text-emerald-400" /><div className="font-bold">PNG</div>
                        </button>
                        <button onClick={() => handleExport('jpg')} className="w-full text-left px-3 py-2.5 text-emerald-100 hover:bg-emerald-800/80 flex items-center gap-2 transition border-t border-emerald-900/60">
                          <FileImage className="w-4 h-4 text-amber-400" /><div className="font-bold">JPG</div>
                        </button>
                        <button onClick={() => handleExport('pdf')} className="w-full text-left px-3 py-2.5 text-emerald-100 hover:bg-emerald-800/80 flex items-center gap-2 transition border-t border-emerald-900/60">
                          <FileText className="w-4 h-4 text-red-400" /><div className="font-bold">PDF</div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-none sm:w-56 lg:w-72">
                  <Search className="w-3.5 h-3.5 text-emerald-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input type="text" placeholder="Buscar nombre o # socio..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#02180d] border border-emerald-900 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-700" />
                </div>
                <select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} className="bg-[#02180d] border border-emerald-900 rounded-lg px-2 py-1.5 text-[11px] text-emerald-200 focus:outline-none max-w-[110px] sm:max-w-none">
                  {WAREHOUSE_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                <select value={selectedEquipment} onChange={(e) => setSelectedEquipment(e.target.value)} className="hidden sm:block bg-[#02180d] border border-emerald-900 rounded-lg px-2 py-1.5 text-[11px] text-emerald-200 focus:outline-none max-w-[160px]">
                  <option value="Todos los equipos">Todos los equipos</option>
                  {FORKLIFT_TYPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                </select>
                <button onClick={() => setOnlyExpiringLicenses(v => !v)} className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 shrink-0 ${
                  onlyExpiringLicenses ? 'bg-amber-600 border-amber-400 text-white' : 'bg-[#02180d] border-emerald-900 text-emerald-300'
                }`} title="Solo licencias críticas (≤30 días)">
                  <AlertCircle className="w-3.5 h-3.5" />
                </button>
                {activeFiltersCount > 0 && (
                  <button onClick={clearAllFilters} className="px-2 py-1.5 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shrink-0">
                    <FilterX className="w-3.5 h-3.5" /> {activeFiltersCount}
                  </button>
                )}
              </div>
              {activeFiltersCount > 0 && (
                <div className="bg-cyan-950/40 border border-cyan-700/40 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-[10px] text-cyan-200">
                  <Filter className="w-3 h-3 text-cyan-300 shrink-0" />
                  <span><span className="font-bold">{filteredOperators.length}</span> de <span className="font-bold">{operators.length}</span> operadores</span>
                </div>
              )}
            </div>

            <div className="md:hidden flex flex-col gap-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {weekDays.map(day => {
                  const isToday = day.dateStr === formatDateLocal(now) && isCurrentWeek;
                  const isSelected = day.dateStr === selectedMobileDay;
                  return (
                    <button key={day.dateStr} onClick={() => setSelectedMobileDay(day.dateStr)} className={`shrink-0 flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg border transition min-w-[50px] ${
                      isSelected ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                      : isToday ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                      : 'bg-[#02180d] border-emerald-900 text-emerald-300'
                    }`}>
                      <span className="text-[10px] font-bold uppercase">{day.dayName}</span>
                      <span className={`text-base font-extrabold ${day.isWeekend && !isSelected ? 'text-red-400' : ''}`}>{day.dayNumber}</span>
                      {isToday && <span className="text-[8px] font-bold uppercase tracking-wider">Hoy</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-col gap-1.5">
                {filteredOperators.map(op => {
                  const cellKey = `${op.id}_${selectedMobileDay}`;
                  const shiftCode = scheduleData[cellKey] || 'DES';
                  const shift = SHIFT_TYPES[shiftCode] || SHIFT_TYPES.DES;
                  const IconComp = shift.icon;
                  const isLockedByAbsence = lockedCells.has(cellKey);
                  const editable = canEditCell(op.id, selectedMobileDay);
                  return (
                    <button key={op.id} disabled={!editable && !isLockedByAbsence} onClick={() => {
                      if (isLockedByAbsence && !isHistoricalWeek && canEditShifts) { setReassignModal({ operatorId: op.id, dateStr: selectedMobileDay }); setReassignShift('M'); }
                      else if (editable) setSelectedCell({ operatorId: op.id, dateStr: selectedMobileDay, currentShift: shiftCode });
                    }} className={`w-full flex items-center gap-2.5 p-2 rounded-lg border text-left ${shift.color} ${isLockedByAbsence && !isHistoricalWeek ? 'ring-2 ring-purple-400/60' : ''} ${!editable && !isLockedByAbsence ? 'opacity-60' : ''}`} style={{ transform: 'translateZ(0)', WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}>
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${shift.color}`} style={{ transform: 'translateZ(0)' }}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[13px] break-words leading-tight">{op.name}</div>
                        <div className="text-[10px] opacity-80 break-words leading-tight">{op.socioNumber || op.id} · {areaLabel(op)}</div>
                        {operatorsWithoutRest.has(op.id) && (
                          <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/50 text-amber-300 border border-amber-500/50">Falta día de descanso</span>
                        )}
                        {assignments[cellKey] && ['M', 'T', 'N'].includes(shiftCode) && (
                          <span className="inline-block mt-1 text-[11px] font-bold px-1.5 py-0.5 rounded bg-black/30 border border-white/20">{assignments[cellKey]}</span>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        {overtimeByCell[cellKey] && (
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${overtimeByCell[cellKey].approved > 0 ? 'bg-amber-500/90 text-black' : 'border border-dashed border-amber-400 text-amber-300'}`}>
                            +{overtimeByCell[cellKey].approved > 0 ? overtimeByCell[cellKey].approved : overtimeByCell[cellKey].pending}h
                          </span>
                        )}
                        <span className="font-extrabold text-sm">{shift.code}</span>
                        {(isLockedByAbsence || isHistoricalWeek) && (
                          <Lock className={`w-3.5 h-3.5 ${isLockedByAbsence ? 'text-purple-300' : 'text-slate-400'}`} />
                        )}
                      </div>
                    </button>
                  );
                })}
                {filteredOperators.length === 0 && (
                  <div className="bg-[#002812] border border-emerald-800/80 rounded-xl p-8 text-center">
                    {operators.length === 0 ? (
                      <>
                        <Users className="w-10 h-10 text-emerald-700 mx-auto mb-2" />
                        <p className="text-emerald-300 font-bold text-sm">No hay operadores registrados</p>
                      </>
                    ) : (
                      <>
                        <FilterX className="w-10 h-10 text-cyan-700 mx-auto mb-2" />
                        <p className="text-cyan-300 font-bold text-sm">Ningún operador coincide</p>
                        <button onClick={clearAllFilters} className="mt-3 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5">
                          <FilterX className="w-3.5 h-3.5" /> Limpiar
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden md:block">
              <div ref={scheduleRef} className={`bg-[#002812] border rounded-2xl overflow-hidden shadow-2xl p-1 ${isHistoricalWeek ? 'border-slate-700/70 opacity-[0.97]' : 'border-emerald-800/80'}`}>
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
                            <div className="text-xs text-emerald-400/80">{op.socioNumber || op.id} • <span className={TE_AREAS.includes(op.zone) ? '' : 'text-amber-300 font-semibold'}>{areaLabel(op)}</span></div>
                            {operatorsWithoutRest.has(op.id) && (
                              <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/70 border border-amber-700/60 rounded px-1.5 py-0.5">
                                <AlertTriangle className="w-3 h-3" /> Falta día de descanso
                              </div>
                            )}
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
                                <button disabled={!editable && !isLockedByAbsence} onClick={() => {
                                  if (isLockedByAbsence && !isHistoricalWeek && canEditShifts) { setReassignModal({ operatorId: op.id, dateStr: day.dateStr }); setReassignShift('M'); }
                                  else if (editable) setSelectedCell({ operatorId: op.id, dateStr: day.dateStr, currentShift: shiftCode });
                                }} title={tooltip} className={`relative w-full py-2 px-1 rounded-xl border text-xs font-bold flex flex-col items-center justify-center ${shift.color} ${
                                  !editable && !isLockedByAbsence ? 'cursor-not-allowed' : 'hover:scale-105 transition-transform'
                                } ${isLockedByAbsence && !isHistoricalWeek ? 'ring-2 ring-purple-400/60 shadow-purple-900/40 cursor-pointer' : ''} ${
                                  isHistoricalWeek ? 'grayscale-[0.35] opacity-90' : ''
                                } ${isCurrentShiftForMe ? 'ring-2 ring-emerald-400/80 shadow-emerald-500/30 shadow-lg' : ''} ${
                                  isFlashing ? 'ring-2 ring-white/80 shadow-white/40 shadow-lg animate-pulse' : ''
                                }`}>
                                  <IconComp className="w-3.5 h-3.5" />
                                  <span>{shift.code}</span>
                                  {assignments[cellKey] && ['M', 'T', 'N'].includes(shiftCode) && (
                                    <span className="mt-0.5 text-[11px] leading-tight font-semibold text-center opacity-90 px-0.5">{assignments[cellKey]}</span>
                                  )}
                                  {overtimeByCell[cellKey] && (
                                    <span title={overtimeByCell[cellKey].approved > 0 ? 'Horas extras aprobadas' : 'Horas extras pendientes'} className={`absolute -top-1 -left-1 text-[9px] leading-none font-extrabold px-1 py-0.5 rounded ${overtimeByCell[cellKey].approved > 0 ? 'bg-amber-500 text-black' : 'bg-[#011a0d] border border-dashed border-amber-400 text-amber-300'}`}>
                                      +{overtimeByCell[cellKey].approved > 0 ? overtimeByCell[cellKey].approved : overtimeByCell[cellKey].pending}h
                                    </span>
                                  )}
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
                                <button onClick={clearAllFilters} className="mt-3 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5">
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

            {showIndicators ? (
              <div className="relative flex items-center justify-center gap-1.5 flex-wrap pt-1">
                <button onClick={() => setShowIndicators(false)} className="absolute -top-1 right-0 z-10 p-1 bg-[#02180d] hover:bg-emerald-950 border border-emerald-900 rounded-md text-emerald-400 hover:text-emerald-200 transition" title="Ocultar indicadores">
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
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
                        <span className="text-sm font-extrabold text-emerald-100 leading-none">{SHIFT_TYPES[activeShiftCode].label}</span>
                        <span className="text-[9px] text-emerald-400 font-mono leading-none hidden sm:inline">{formatTimeLocal(now)}</span>
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
            ) : (
              <div className="flex items-center justify-center pt-1">
                <button onClick={() => setShowIndicators(true)} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#02180d] hover:bg-emerald-950 border border-emerald-900 rounded-md text-emerald-400 hover:text-emerald-200 transition text-[11px] font-bold" title="Mostrar indicadores">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Mostrar indicadores</span>
                </button>
              </div>
            )}
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
                  setNewOp({ name: '', socioNumber: '', zone: '', equipment: '', licenseExpiry: formatDateLocal(new Date()) });
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
                            <button onClick={() => { setEditingOperator(op); setNewOp({ ...op, socioNumber: op.socioNumber || '', zone: TE_AREAS.includes(op.zone) ? op.zone : '', equipment: FORKLIFT_TYPES.includes(op.equipment) ? op.equipment : '' }); setIsAddOperatorOpen(true); }} className="p-1.5 bg-emerald-900 hover:bg-emerald-700 text-emerald-200 rounded-lg transition"><Pencil className="w-3.5 h-3.5"/></button>
                            <button onClick={() => handleDeleteOperator(op.id)} className="p-1.5 bg-red-950 hover:bg-red-800 text-red-300 rounded-lg transition"><Trash2 className="w-3.5 h-3.5"/></button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5 text-xs text-emerald-200 border-t border-emerald-900/80 pt-3">
                        <div className="flex justify-between gap-2"><span># Socio:</span><span className="font-semibold text-white text-right">{op.socioNumber || 'N/A'}</span></div>
                        <div className="flex justify-between gap-2"><span>Área:</span><span className={`font-semibold text-right ${TE_AREAS.includes(op.zone) ? 'text-white' : 'text-amber-300'}`}>{areaLabel(op)}</span></div>
                        <div className="flex justify-between gap-2"><span>Equipo:</span><span className={`font-semibold text-right ${FORKLIFT_TYPES.includes(op.equipment) ? 'text-white' : 'text-amber-300'}`}>{FORKLIFT_TYPES.includes(op.equipment) ? op.equipment : 'Sin registrar'}</span></div>
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
              <button disabled={operators.length === 0} onClick={() => {
                setVacDateError('');
                setNewVac(prev => ({ ...prev, operatorId: operators[0]?.id || '' }));
                setIsRequestVacationOpen(true);
              }} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition">
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

        {activeTab === 'overtime' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-[#003818] border border-emerald-800/70 rounded-2xl p-4 gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Horas Extras</h2>
                {(() => {
                  const weekDates = weekDays.map(d => d.dateStr);
                  const approved = overtimeRequests.filter(r => r.status === 'Aprobado' && weekDates.includes(r.date)).reduce((a, r) => a + (Number(r.hours) || 0), 0);
                  const pending = overtimeRequests.filter(r => r.status === 'Pendiente').length;
                  return (
                    <p className="text-[11px] text-emerald-300">
                      Semana visible: <span className="font-bold text-amber-300">{approved.toFixed(1)}h aprobadas</span>
                      {pending > 0 && <span> · {pending} pendiente{pending === 1 ? '' : 's'} de revisar</span>}
                    </p>
                  );
                })()}
              </div>
              <button disabled={operators.length === 0} onClick={() => {
                setOtError('');
                setNewOt(prev => ({ ...prev, operatorId: operators[0]?.id || '', date: formatDateLocal(new Date()) }));
                setIsOvertimeOpen(true);
              }} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition">
                <Plus className="w-4 h-4"/><span>Registrar Horas Extras</span>
              </button>
            </div>
            <div className="md:hidden space-y-2">
              {overtimeRequests.map(req => (
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
                      {req.status === 'Aprobado' && <Check className="w-2.5 h-2.5" />}
                      {req.status}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-200 space-y-1">
                    <div><span className="text-emerald-400">Fecha:</span> {req.date}</div>
                    <div><span className="text-emerald-400">Horas:</span> <span className="font-extrabold text-amber-300">+{req.hours}h</span> · {req.type}</div>
                    <div className="text-white/80 text-[11px]"><span className="text-emerald-400">Motivo:</span> {req.reason}</div>
                    {req.createdBy && <div className="text-[10px] text-emerald-500">Registró: {req.createdBy}</div>}
                  </div>
                  {canApproveVacations && (
                    <div className="flex justify-end space-x-1 mt-3 pt-3 border-t border-emerald-900/60">
                      {req.status === 'Pendiente' ? (
                        <>
                          <button onClick={() => handleOvertimeStatus(req.id, 'Aprobado')} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition"><Check className="w-3.5 h-3.5"/> Aprobar</button>
                          <button onClick={() => handleOvertimeStatus(req.id, 'Rechazado')} className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition"><X className="w-3.5 h-3.5"/> Rechazar</button>
                        </>
                      ) : req.status === 'Aprobado' ? (
                        <button onClick={() => handleOvertimeStatus(req.id, 'Rechazado')} className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-100 rounded-lg text-[10px] font-bold transition">Revocar</button>
                      ) : null}
                      <button onClick={() => handleDeleteOvertime(req.id)} className="px-2 py-1.5 bg-[#011a0d] hover:bg-red-950 text-emerald-400 hover:text-red-300 border border-emerald-800 rounded-lg transition"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                  )}
                </div>
              ))}
              {overtimeRequests.length === 0 && (
                <div className="bg-[#002812] border border-emerald-800/80 rounded-2xl p-8 text-center">
                  <Clock className="w-10 h-10 text-emerald-700 mx-auto mb-2" />
                  <p className="text-emerald-300 font-bold text-sm">Sin horas extras registradas</p>
                </div>
              )}
            </div>
            <div className="hidden md:block bg-[#002812] border border-emerald-800/80 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#001f0d] text-emerald-300 font-bold uppercase border-b border-emerald-800/80">
                    <th className="p-3.5">Operador</th>
                    <th className="p-3.5">Fecha</th>
                    <th className="p-3.5">Horas</th>
                    <th className="p-3.5">Tipo</th>
                    <th className="p-3.5">Motivo</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/50">
                  {overtimeRequests.map(req => (
                    <tr key={req.id}>
                      <td className="p-3.5"><div className="font-bold text-white">{req.operatorName}</div><div className="text-[10px] text-emerald-400">{req.operatorId}</div></td>
                      <td className="p-3.5 text-emerald-200 whitespace-nowrap">{req.date}</td>
                      <td className="p-3.5 font-extrabold text-amber-300">+{req.hours}h</td>
                      <td className="p-3.5 font-semibold text-emerald-200">{req.type}</td>
                      <td className="p-3.5 text-white/90 max-w-xs">
                        {req.reason}
                        {req.createdBy && <div className="text-[10px] text-emerald-500">Registró: {req.createdBy}</div>}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded font-bold inline-flex items-center gap-1 ${
                          req.status === 'Aprobado' ? 'bg-emerald-950 text-emerald-300' :
                          req.status === 'Rechazado' ? 'bg-red-950 text-red-300' :
                          'bg-amber-950 text-amber-300'
                        }`}>
                          {req.status === 'Aprobado' && <Check className="w-3 h-3" />}
                          {req.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {canApproveVacations ? (
                          <div className="flex justify-center space-x-1">
                            {req.status === 'Pendiente' && (
                              <>
                                <button title="Aprobar" onClick={() => handleOvertimeStatus(req.id, 'Aprobado')} className="p-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition"><Check className="w-4 h-4"/></button>
                                <button title="Rechazar" onClick={() => handleOvertimeStatus(req.id, 'Rechazado')} className="p-1.5 bg-red-800 hover:bg-red-700 text-white rounded-lg transition"><X className="w-4 h-4"/></button>
                              </>
                            )}
                            {req.status === 'Aprobado' && (
                              <button onClick={() => handleOvertimeStatus(req.id, 'Rechazado')} className="px-2 py-1 bg-red-900 hover:bg-red-800 text-red-100 rounded-lg transition text-[10px] font-bold">Revocar</button>
                            )}
                            <button title="Eliminar" onClick={() => handleDeleteOvertime(req.id)} className="p-1.5 bg-[#011a0d] hover:bg-red-950 text-emerald-400 hover:text-red-300 border border-emerald-800 rounded-lg transition"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        ) : (
                          <span className="text-emerald-600 text-[10px]">Sin acciones</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {overtimeRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center">
                        <Clock className="w-10 h-10 text-emerald-700 mx-auto mb-2" />
                        <p className="text-emerald-300 font-bold text-sm">Sin horas extras registradas</p>
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
                  <p className="text-xs text-emerald-300">{reportsView === 'summary' ? 'KPIs de la semana seleccionada' : reportsView === 'te' ? 'Historial mensual de horas extra' : 'Historial mensual de productividad'}</p>
                </div>
              </div>
              <button onClick={handleExportExecutivePDF} disabled={isExporting} className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition border border-emerald-500/50">
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Exportar PDF
              </button>
            </div>

            <div className="flex gap-1.5">
              <button onClick={() => setReportsView('summary')} className={`px-3 py-2 text-xs font-bold rounded-lg transition ${reportsView === 'summary' ? 'bg-emerald-600 text-white' : 'bg-[#02180d] text-emerald-300 border border-emerald-900'}`}>Resumen semanal</button>
              <button onClick={() => setReportsView('te')} className={`px-3 py-2 text-xs font-bold rounded-lg transition ${reportsView === 'te' ? 'bg-emerald-600 text-white' : 'bg-[#02180d] text-emerald-300 border border-emerald-900'}`}>Tiempo extra (T.E)</button>
              <button onClick={() => setReportsView('productivity')} className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${reportsView === 'productivity' ? 'bg-emerald-600 text-white' : 'bg-[#02180d] text-emerald-300 border border-emerald-900'}`}><Package className="w-3 h-3" /> Productividad</button>
            </div>

            {reportsView === 'summary' && (
            <>
            <div className="bg-[#003818] border border-emerald-800/70 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button onClick={() => setReportWeekStart(w => shiftWeekStr(w, -7))} className="p-1.5 bg-[#022415] hover:bg-emerald-900 rounded-lg text-emerald-200 border border-emerald-800/60 transition"><ChevronLeft className="w-4 h-4"/></button>
                <div className="text-xs font-bold text-white bg-[#02180d] px-3 py-1.5 rounded-lg border border-emerald-900 whitespace-nowrap">
                  {reportWeekDays[0].dayNumber} {reportWeekDays[0].monthName} - {reportWeekDays[6].dayNumber} {reportWeekDays[6].monthName}
                </div>
                <button onClick={() => setReportWeekStart(w => shiftWeekStr(w, 7))} className="p-1.5 bg-[#022415] hover:bg-emerald-900 rounded-lg text-emerald-200 border border-emerald-800/60 transition"><ChevronRight className="w-4 h-4"/></button>
                {reportWeekStart !== getMondayOfCurrentWeek() && (
                  <button onClick={() => setReportWeekStart(getMondayOfCurrentWeek())} className="px-2 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition">Semana actual</button>
                )}
              </div>
              <label className="flex items-center gap-2 text-[11px] text-emerald-300 font-bold">
                Ir a un mes
                <input type="month" max={formatDateLocal(new Date()).slice(0, 7)} value={reportTeMonth} onChange={(e) => {
                  if (!e.target.value) return;
                  const [yy, mm] = e.target.value.split('-').map(Number);
                  setReportWeekStart(getMondayOfCurrentWeek(new Date(yy, mm - 1, 1)));
                }} className="bg-[#02180d] border border-emerald-900 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-700" />
              </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(() => {
                let totalWorked = 0, totalAbsent = 0, totalSlots = 0;
                reportWeekDays.forEach(day => {
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
                  const today = new Date(); today.setHours(0, 0, 0, 0);
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
                    <div className="col-span-2 md:col-span-1 rounded-2xl border border-indigo-700/60 bg-indigo-950/70 p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-300" />
                        <span className="text-[10px] font-bold uppercase text-indigo-300">T.E promedio</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-extrabold text-indigo-100">{fmtTE(weekTeStats.avg)}</div>
                      <div className="text-[10px] text-indigo-400/70 mt-0.5">horas extra ÷ 208 · {formatMonthLabel(reportTeMonth)}</div>
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
                    {reportWeekDays.map(day => {
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
              {(() => {
                const weekDates = reportWeekDays.map(d => d.dateStr);
                const approved = overtimeRequests.filter(r => r.status === 'Aprobado' && weekDates.includes(r.date)).reduce((a, r) => a + (Number(r.hours) || 0), 0);
                const pending = overtimeRequests.filter(r => r.status === 'Pendiente' && weekDates.includes(r.date)).reduce((a, r) => a + (Number(r.hours) || 0), 0);
                return (
                  <p className="text-[11px] text-emerald-300 mb-3">
                    Horas extras de la semana: <span className="font-bold text-amber-300">{approved.toFixed(1)}h aprobadas</span>
                    {pending > 0 && <span className="text-amber-400/80"> · {pending.toFixed(1)}h pendientes</span>}
                  </p>
                );
              })()}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[520px]">
                  <thead>
                    <tr className="text-emerald-300 font-bold uppercase border-b border-emerald-800/80">
                      <th className="p-2">Operador</th>
                      <th className="p-2">Área</th>
                      <th className="p-2 text-center">M</th>
                      <th className="p-2 text-center">T</th>
                      <th className="p-2 text-center">N</th>
                      <th className="p-2 text-right">Extras</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-right">T.E mes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/50">
                    {operators.map(op => {
                      const weekDates = reportWeekDays.map(d => d.dateStr);
                      let totalH = 0;
                      const c = { M: 0, T: 0, N: 0 };
                      weekDates.forEach(date => {
                        const code = scheduleData[`${op.id}_${date}`];
                        if (code && SHIFT_HOURS[code] !== undefined) {
                          totalH += SHIFT_HOURS[code];
                          if (['M', 'T', 'N'].includes(code)) c[code]++;
                        }
                      });
                      const otH = sumOvertime(overtimeRequests, op.id, weekDates);
                      const grandH = totalH + otH;
                      const otLevel = getOvertimeLevel(otH);
                      return (
                        <tr key={op.id} className="hover:bg-[#003517]/50">
                          <td className="p-2 font-bold text-white whitespace-nowrap">{op.name}</td>
                          <td className="p-2 text-emerald-200 text-[11px]">{areaLabel(op)}</td>
                          <td className="p-2 text-center text-emerald-300">{c.M}</td>
                          <td className="p-2 text-center text-amber-300">{c.T}</td>
                          <td className="p-2 text-center text-indigo-300">{c.N}</td>
                          <td className={`p-2 text-right font-bold ${otLevel === 'danger' ? 'text-red-400' : otLevel === 'warning' ? 'text-amber-300' : otH > 0 ? 'text-emerald-300' : 'text-emerald-700'}`}>{otLevel && <AlertTriangle className="w-3 h-3 inline mr-1 -mt-0.5" />}{otH > 0 ? `+${otH.toFixed(1)}h` : '-'}</td>
                          <td className="p-2 text-right font-extrabold text-emerald-300">{grandH.toFixed(1)}h</td>
                          <td className="p-2 text-right font-extrabold text-indigo-300">{fmtTE(weekTeStats.perOp[op.id]?.te ?? 0)}</td>
                        </tr>
                      );
                    })}
                    {operators.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-emerald-400/70">Sin operadores</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </>
            )}

            {reportsView === 'te' && (
              <div className="space-y-5">
                <div className="bg-[#003818] border border-emerald-800/70 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setTeMonth(m => shiftMonth(m, -1))} className="p-1.5 bg-[#022415] hover:bg-emerald-900 rounded-lg text-emerald-200 border border-emerald-800/60 transition"><ChevronLeft className="w-4 h-4"/></button>
                    <div className="text-xs font-bold text-white bg-[#02180d] px-3 py-1.5 rounded-lg border border-emerald-900 min-w-[140px] text-center">{formatMonthLabel(teMonth)}</div>
                    <button onClick={() => setTeMonth(m => shiftMonth(m, 1))} className="p-1.5 bg-[#022415] hover:bg-emerald-900 rounded-lg text-emerald-200 border border-emerald-800/60 transition"><ChevronRight className="w-4 h-4"/></button>
                    {teMonth !== formatDateLocal(new Date()).slice(0, 7) && (
                      <button onClick={() => setTeMonth(formatDateLocal(new Date()).slice(0, 7))} className="px-2 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition">Mes actual</button>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-300">T.E = horas extra aprobadas del mes ÷ 208</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <HCvsFTEChart hc={hcVsFte.hc} fte={hcVsFte.fte} otWeek={hcVsFte.otWeek} />
                  <TEBarChart
                    title="T.E por área"
                    subtitle="Horas extra del almacén ÷ 208"
                    firstColumnLabel="Área"
                    barWidth={88}
                    bars={teStats.areas.map(a => ({
                      label: shortArea(a.zone),
                      fullLabel: a.zone,
                      value: a.te,
                      hours: a.hours,
                      ops: a.ops,
                      color: AREA_COLORS[a.zone]
                    }))}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {[WAREHOUSE_ZONES[2], WAREHOUSE_ZONES[1]].map(zone => (
                    <TEBarChart
                      key={zone}
                      title={`${zone} · T.E por línea`}
                      subtitle="Horas extra en cada asignación ÷ 208"
                      color={AREA_COLORS[zone]}
                      firstColumnLabel="Asignación"
                      bars={teStats.lines[zone].map(l => ({
                        label: l.assignment,
                        fullLabel: `${shortArea(zone)} · ${l.assignment}`,
                        value: l.te,
                        hours: l.hours,
                        ops: l.ops
                      }))}
                    />
                  ))}
                </div>

                <p className="text-[11px] text-emerald-400/80">
                  Horas extra sin línea asignada (no salen en las gráficas por línea): {TE_AREAS.map(z => `${shortArea(z)} ${teStats.unassigned[z].toFixed(1)} h`).join(' · ')}.
                  {teStats.outsideAreas > 0 && ` ${teStats.outsideAreas} operador(es) sin área registrada no se incluyen en las gráficas; edítalos en Personal para asignarles su área.`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Historial mensual de Productividad dentro de Reportes */}
        {activeTab === 'reports' && reportsView === 'productivity' && canViewReports && (
          <div className="mt-5 space-y-5">
            <div className="bg-[#003818] border border-emerald-800/70 rounded-2xl p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Historial de productividad</h3>
                  <p className="text-[11px] text-emerald-300">Consulta los meses anteriores; solo se editan el mes actual y el inmediato anterior.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setProductivityMonth(month => shiftMonth(month, -1))}
                  className="p-2 bg-[#02180d] hover:bg-emerald-950 rounded-lg text-emerald-200 border border-emerald-800/60 transition"
                  title="Mes anterior"
                  aria-label="Mes anterior"
                ><ChevronLeft className="w-4 h-4" /></button>
                <div className="min-w-[150px] text-center text-xs font-bold text-white bg-[#02180d] px-3 py-2 rounded-lg border border-emerald-900">
                  {formatMonthLabel(productivityMonth)}
                </div>
                <button
                  onClick={() => setProductivityMonth(month => month < currentYm ? shiftMonth(month, 1) : month)}
                  disabled={productivityMonth >= currentYm}
                  className="p-2 bg-[#02180d] hover:bg-emerald-950 rounded-lg text-emerald-200 border border-emerald-800/60 transition disabled:opacity-35 disabled:cursor-not-allowed"
                  title="Mes siguiente"
                  aria-label="Mes siguiente"
                ><ChevronRight className="w-4 h-4" /></button>
                <label className="flex items-center gap-2 text-[11px] text-emerald-300 font-bold">
                  Ir a un mes
                  <input
                    type="month"
                    max={currentYm}
                    value={productivityMonth}
                    onChange={e => { if (e.target.value && e.target.value <= currentYm) setProductivityMonth(e.target.value); }}
                    className="bg-[#02180d] border border-emerald-900 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-700"
                  />
                </label>
              </div>
            </div>

            <div className="bg-[#002812] border border-emerald-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-emerald-900/70 bg-[#001f0d]">
                <div className="font-bold text-emerald-200">Datos de {formatMonthLabel(productivityMonth)}</div>
                <span className={`text-[10px] font-bold rounded-lg border px-2.5 py-1 w-fit ${canEditProductivityMonth ? 'text-emerald-300 bg-emerald-950 border-emerald-800' : 'text-amber-300 bg-amber-950/60 border-amber-800/70'}`}>
                  {canEditProductivityMonth ? 'Editable' : 'Histórico · solo lectura'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[480px]">
                  <thead>
                    <tr className="bg-[#001f0d] text-emerald-300 font-bold uppercase border-b border-emerald-800/80">
                      <th className="p-3 w-1/2">Concepto</th>
                      <th className="p-3 text-center">{formatMonthLabel(productivityMonth)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/50">
                    <tr>
                      <td className="p-3">
                        <div className="font-bold text-white">Volumen esperado</div>
                        <div className="text-[10px] text-emerald-500">hectolitros (hL) — captura manual</div>
                      </td>
                      <td className="p-3">
                        <input
                          type="number" min="0" step="0.01" placeholder="0"
                          value={productivityDraft[productivityMonth]?.expectedHL ?? ''}
                          disabled={!canEditProductivityMonth}
                          onChange={e => handleProductivityInput(productivityMonth, 'expectedHL', e.target.value)}
                          onBlur={() => handleProductivityBlur(productivityMonth, 'expectedHL')}
                          className={`w-full bg-[#011a0d] border border-emerald-800 rounded-lg px-3 py-2 text-sm text-white text-center font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed ${canEditProductivityMonth ? '' : 'cursor-not-allowed'}`}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3">
                        <div className="font-bold text-white">Volumen real</div>
                        <div className="text-[10px] text-emerald-500">hectolitros (hL) — captura manual</div>
                      </td>
                      <td className="p-3">
                        <input
                          type="number" min="0" step="0.01" placeholder="0"
                          value={productivityDraft[productivityMonth]?.realHL ?? ''}
                          disabled={!canEditProductivityMonth}
                          onChange={e => handleProductivityInput(productivityMonth, 'realHL', e.target.value)}
                          onBlur={() => handleProductivityBlur(productivityMonth, 'realHL')}
                          className={`w-full bg-[#011a0d] border border-emerald-800 rounded-lg px-3 py-2 text-sm text-white text-center font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed ${canEditProductivityMonth ? '' : 'cursor-not-allowed'}`}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3">
                        <div className="font-bold text-emerald-200">F.T.E</div>
                        <div className="text-[10px] text-emerald-500">H.C + (horas extra aprobadas ÷ 208)</div>
                      </td>
                      <td className="p-3 text-center font-extrabold text-emerald-100 text-base">
                        {fmtFTE(productivityStats.fte)}
                        <div className="text-[10px] text-emerald-500 font-normal">{productivityStats.hc} HC · {productivityStats.otMonth.toFixed(1)} h extra</div>
                      </td>
                    </tr>
                    <tr className="bg-[#011a0d]">
                      <td className="p-3">
                        <div className="font-bold text-emerald-300">Productividad esperada</div>
                        <div className="text-[10px] text-emerald-500">volumen esperado ÷ F.T.E</div>
                      </td>
                      <td className="p-3 text-center font-extrabold text-emerald-200 text-lg">
                        {fmtNum(productivityStats.expectedProd)}
                        <div className="text-[10px] text-emerald-500 font-normal">{fmtNum(productivityStats.expectedHL)} hL ÷ {fmtFTE(productivityStats.fte)}</div>
                      </td>
                    </tr>
                    <tr className="bg-[#011a0d]">
                      <td className="p-3">
                        <div className="font-bold text-orange-300">Productividad real</div>
                        <div className="text-[10px] text-emerald-500">volumen real ÷ F.T.E</div>
                      </td>
                      <td className="p-3 text-center font-extrabold text-orange-200 text-lg">
                        {fmtNum(productivityStats.realProd)}
                        <div className="text-[10px] text-emerald-500 font-normal">{fmtNum(productivityStats.realHL)} hL ÷ {fmtFTE(productivityStats.fte)}</div>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-amber-300">Δ (Real − Esperado)</td>
                      <td className={`p-3 text-center font-extrabold text-base ${productivityStats.diff >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                        {productivityStats.diff >= 0 ? '+' : ''}{fmtNum(productivityStats.diff)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-emerald-200">Cumplimiento</td>
                      <td className={`p-3 text-center font-extrabold text-base ${productivityStats.cumplimiento >= 100 ? 'text-emerald-300' : productivityStats.cumplimiento >= 90 ? 'text-amber-300' : 'text-red-300'}`}>
                        {fmtNum(productivityStats.cumplimiento)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <ProductivityBarChart
              title={`Productividad · ${formatMonthLabel(productivityMonth)}`}
              subtitle="Volumen ÷ F.T.E (hL / F.T.E)"
              bars={[
                {
                  label: 'Esperada',
                  value: productivityStats.expectedProd,
                  color: '#3987e5',
                  detail: `${fmtNum(productivityStats.expectedHL)} hL ÷ ${fmtFTE(productivityStats.fte)}`
                },
                {
                  label: 'Real',
                  value: productivityStats.realProd,
                  color: '#d95926',
                  detail: `${fmtNum(productivityStats.realHL)} hL ÷ ${fmtFTE(productivityStats.fte)}`
                }
              ]}
            />

            <p className="text-[11px] text-emerald-400/80">
              F.T.E = plantilla registrada + horas extra aprobadas del mes ÷ 208. Los volúmenes se guardan automáticamente al salir del campo. Los meses anteriores al inmediato anterior quedan en solo lectura.
            </p>
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
              <input type="checkbox" id="applyWeekCheckbox" checked={applyToFullWeek} onChange={(e) => setApplyToFullWeek(e.target.checked)} className="w-4 h-4 accent-emerald-500 cursor-pointer" />
            </div>
            <div className="mb-4">
              <label className="block text-[10px] font-bold uppercase text-emerald-400 mb-1.5">Asignación (turnos M / T / N)</label>
              <select value={cellAssignment} onChange={(e) => setCellAssignment(e.target.value)} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500">
                <option value="">Sin asignación</option>
                {ASSIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <p className="text-[10px] text-emerald-500 mt-1">Elige la asignación y luego toca el turno para guardar.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SHIFT_TYPES).map(([code, config]) => (
                <button key={code} onClick={() => handleSetShift(selectedCell.operatorId, selectedCell.dateStr, code, applyToFullWeek, cellAssignment)} className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${config.color}`}>
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
                  <button key={code} onClick={() => setReassignShift(code)} className={`p-2 rounded-lg border text-xs font-bold transition ${
                    reassignShift === code ? SHIFT_TYPES[code].color + ' ring-2 ring-white/60'
                    : 'bg-[#011a0d] border-emerald-800 text-emerald-300 hover:bg-emerald-950'
                  }`}>
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
                      <button key={c.id} onClick={() => handleReassign(c.id)} className={`w-full text-left p-3 rounded-xl border ${borderColor} ${bgColor}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm">{c.name}</span>
                              {best && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-700 text-white">ÓPTIMO</span>}
                              {ok && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-700 text-white">ACEPTABLE</span>}
                              {bad && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-700 text-white">NO REC.</span>}
                            </div>
                            <div className="text-[10px] text-emerald-300/80 mt-0.5">{c.socioNumber || c.id} · {areaLabel(c)}</div>
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
                <label className="block text-emerald-300 font-bold mb-1"># de Socio</label>
                <input type="text" inputMode="numeric" required placeholder="Ej. 12345" value={newOp.socioNumber || ''} onChange={(e) => setNewOp({ ...newOp, socioNumber: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-emerald-300 font-bold mb-1">Área de Trabajo</label>
                <select required value={newOp.zone || ''} onChange={(e) => setNewOp({ ...newOp, zone: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none">
                  <option value="" disabled>Selecciona un área</option>
                  {TE_AREAS.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-emerald-300 font-bold mb-1">Tipo de Equipo</label>
                <select required value={newOp.equipment || ''} onChange={(e) => setNewOp({ ...newOp, equipment: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none">
                  <option value="" disabled>Selecciona el tipo</option>
                  {FORKLIFT_TYPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
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

      {isOvertimeOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#002e14] border border-emerald-700 rounded-t-2xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-4">Registrar Horas Extras</h3>
            <form onSubmit={handleCreateOvertime} className="space-y-3 text-xs">
              {otError && (
                <div className="p-2.5 bg-red-950/80 border border-red-800 rounded-xl text-red-200 font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{otError}</span>
                </div>
              )}
              {otWarnings.length > 0 && (() => {
                const hasDanger = otWarnings.some(w => w.level === 'danger');
                return (
                  <div className={`p-2.5 border rounded-xl space-y-1 ${hasDanger ? 'bg-red-950/80 border-red-700 text-red-200' : 'bg-amber-950/70 border-amber-700/70 text-amber-200'}`}>
                    {otWarnings.map((w, i) => (
                      <div key={i} className={`flex items-start gap-2 ${w.level === 'danger' ? 'font-bold text-red-300' : ''}`}>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{w.text}</span>
                      </div>
                    ))}
                    <div className={`text-[10px] pl-5 ${hasDanger ? 'text-red-400/80' : 'text-amber-400/80'}`}>Puedes registrarlo igual; quien apruebe decidirá.</div>
                  </div>
                );
              })()}
              <div>
                <label className="block text-emerald-300 font-bold mb-1">Operador</label>
                <select value={newOt.operatorId} onChange={(e) => setNewOt({ ...newOt, operatorId: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none">
                  {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-emerald-300 font-bold mb-1">Fecha</label>
                  <input type="date" value={newOt.date} onChange={(e) => setNewOt({ ...newOt, date: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-emerald-300 font-bold mb-1">Horas</label>
                  <input type="number" min="0.5" max="12" step="0.5" value={newOt.hours} onChange={(e) => setNewOt({ ...newOt, hours: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-emerald-300 font-bold mb-1">Tipo</label>
                <select value={newOt.type} onChange={(e) => setNewOt({ ...newOt, type: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none">
                  {OVERTIME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-emerald-300 font-bold mb-1">Motivo</label>
                <textarea rows={3} placeholder="Ej. Cobertura por ausencia, descarga de contenedor..." value={newOt.reason} onChange={(e) => setNewOt({ ...newOt, reason: e.target.value })} className="w-full bg-[#011a0d] border border-emerald-800 rounded-xl px-3 py-2.5 text-white focus:outline-none" />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => { setIsOvertimeOpen(false); setOtError(''); }} className="px-4 py-2 bg-emerald-950 text-emerald-300 rounded-xl font-bold hover:bg-emerald-900 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition">Registrar</button>
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
              <h3 className="text-white font-bold text-sm truncate">{exportPreview.isPdf ? 'Guardar PDF' : 'Guardar imagen'}</h3>
              <p className="text-[10px] text-emerald-300 truncate">{exportPreview.filename}</p>
            </div>
            <button onClick={() => setExportPreview(null)} className="p-1.5 text-emerald-400 hover:text-white shrink-0">
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
              <img src={exportPreview.dataUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
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
              <button onClick={async () => {
                if (navigator.share && navigator.canShare) {
                  try {
                    const file = new File([exportPreview.blob], exportPreview.filename, { type: exportPreview.mimeType });
                    if (navigator.canShare({ files: [file] })) {
                      await navigator.share({ files: [file], title: exportPreview.filename });
                      setExportPreview(null);
                      pushToast('success', 'Compartido');
                    } else pushToast('warning', 'Tu navegador no permite compartir este archivo');
                  } catch (err) {
                    if (err.name !== 'AbortError') pushToast('error', 'No se pudo compartir');
                  }
                } else pushToast('warning', 'Compartir no está disponible en este navegador');
              }} className="py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition">
                <Share2 className="w-4 h-4" />
                Compartir
              </button>
              <button onClick={() => {
                forceDownload(exportPreview.blob, exportPreview.filename);
                pushToast('info', 'Si no se descarga, mantén presionada la imagen');
                setExportPreview(null);
              }} className="py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition">
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
