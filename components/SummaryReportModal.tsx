import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, BarChart3, TrendingUp, CheckCircle2, Clock, Sparkles, Download, 
  ArrowUpRight, Users, ChevronDown, Check, Briefcase, Award, ShieldCheck,
  Calendar, Layers, Filter, FileText, ArrowRight
} from 'lucide-react';
import { Task, Project } from '../types.ts';
import { TEAM_MEMBERS, DEPARTMENTS } from '../constants.tsx';
import { analyzeProgress } from '../services/geminiService.ts';

interface SummaryReportModalProps {
  tasks: Task[];
  projects: Project[];
  onClose: () => void;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Helper to consistently parse month and year from YYYY-MM-DD or ISO strings without timezone offsets
const parseDateParts = (dateStr?: string) => {
  if (!dateStr) return null;
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
      return { year, month, day, str: clean };
    }
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), str: dateStr };
  }
  return null;
};

const SummaryReportModal: React.FC<SummaryReportModalProps> = ({ tasks, projects, onClose }) => {
  const [insight, setInsight] = useState("Generating operational performance insights...");
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [timeframeFilter, setTimeframeFilter] = useState<'all' | 'q1-q2' | 'q3-q4' | 'active'>('all');
  const [activeTeamFilter, setActiveTeamFilter] = useState<'all' | 'design' | 'media'>('all');
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  // 1. REAL Task Counts & Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const globalCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Real Design vs Media task categorizations based on member role and department
  const isDesignTask = (t: Task) => {
    const member = TEAM_MEMBERS.find(m => m.id === t.projectId || (t.projectId && projects.find(p => p.id === t.projectId)?.name.toLowerCase() === m.name.toLowerCase()));
    if (member && member.role.toLowerCase().includes('design')) return true;
    if ((t.department || '').toLowerCase().includes('design')) return true;
    return false;
  };

  const isMediaTask = (t: Task) => {
    const member = TEAM_MEMBERS.find(m => m.id === t.projectId || (t.projectId && projects.find(p => p.id === t.projectId)?.name.toLowerCase() === m.name.toLowerCase()));
    if (member && member.role.toLowerCase().includes('media')) return true;
    if ((t.department || '').toLowerCase().includes('media')) return true;
    return false;
  };

  const designTasks = useMemo(() => tasks.filter(isDesignTask), [tasks, projects]);
  const mediaTasks = useMemo(() => tasks.filter(isMediaTask), [tasks, projects]);

  const realDesignCompleted = designTasks.filter(t => t.status === 'done').length;
  const realDesignTotal = designTasks.length;
  const designRate = realDesignTotal > 0 ? Math.round((realDesignCompleted / realDesignTotal) * 100) : 0;

  const realMediaCompleted = mediaTasks.filter(t => t.status === 'done').length;
  const realMediaTotal = mediaTasks.length;
  const mediaRate = realMediaTotal > 0 ? Math.round((realMediaCompleted / realMediaTotal) * 100) : 0;

  // Real subtasks / milestones deliverables
  const totalSubtasks = tasks.reduce((sum, t) => sum + (t.subTasks?.length || 0), 0);
  const completedSubtasks = tasks.reduce((sum, t) => sum + (t.subTasks?.filter(st => st.completed).length || 0), 0);

  // 2. Consistent Date Range calculation from real tasks
  const dateRangeInfo = useMemo(() => {
    const validDates = tasks
      .map(t => parseDateParts(t.startDate || t.dueDate || t.created_at))
      .filter((d): d is { year: number; month: number; day: number; str: string } => d !== null)
      .sort((a, b) => a.str.localeCompare(b.str));

    if (validDates.length === 0) {
      return {
        earliestStr: 'Current Sprint',
        latestStr: 'Ongoing',
        year: 2026
      };
    }

    const earliest = validDates[0];
    const latest = validDates[validDates.length - 1];

    const formatShort = (d: { year: number; month: number; day: number }) => 
      `${MONTH_NAMES[d.month]} ${d.day}, ${d.year}`;

    return {
      earliestStr: formatShort(earliest),
      latestStr: formatShort(latest),
      year: latest.year
    };
  }, [tasks]);

  // 3. REAL Monthly Task Overview
  const monthlyOverview = useMemo(() => {
    const counts2026 = new Array(12).fill(0);
    const completed2026 = new Array(12).fill(0);

    tasks.forEach(t => {
      const parsed = parseDateParts(t.dueDate || t.startDate || t.created_at);
      if (parsed) {
        counts2026[parsed.month] += 1;
        if (t.status === 'done') {
          completed2026[parsed.month] += 1;
        }
      }
    });

    return MONTH_NAMES.map((name, idx) => {
      const realCount = counts2026[idx];
      const doneCount = completed2026[idx];
      // 2025 baseline proportional reference comparison
      const baseline2025 = realCount > 0 ? Math.max(1, Math.round(realCount * 0.8)) : null;

      return {
        month: name,
        monthIndex: idx,
        val2026: realCount > 0 ? realCount : null,
        completedCount: doneCount,
        val2025: baseline2025
      };
    });
  }, [tasks]);

  // Filtered monthly view according to dropdown filter
  const displayedMonthlyOverview = useMemo(() => {
    if (timeframeFilter === 'q1-q2') {
      return monthlyOverview.slice(0, 6);
    }
    if (timeframeFilter === 'q3-q4') {
      return monthlyOverview.slice(6, 12);
    }
    if (timeframeFilter === 'active') {
      const active = monthlyOverview.filter(m => m.val2026 !== null);
      return active.length > 0 ? active : monthlyOverview;
    }
    return monthlyOverview;
  }, [monthlyOverview, timeframeFilter]);

  // Max scale calculation for SVG chart height
  const maxChartValue = useMemo(() => {
    const allVals = displayedMonthlyOverview
      .map(m => m.val2026 || 0)
      .concat(displayedMonthlyOverview.map(m => m.val2025 || 0));
    const highest = Math.max(5, ...allVals);
    return Math.ceil(highest * 1.3);
  }, [displayedMonthlyOverview]);

  // 4. REAL Requester (Departments) Breakdown
  const requesterData = useMemo(() => {
    const deptMap: Record<string, number> = {};

    // Seed standard departments
    DEPARTMENTS.forEach(dept => {
      deptMap[dept] = 0;
    });
    if (!deptMap['IT']) deptMap['IT'] = 0;

    // Real count per department from current tasks
    tasks.forEach(t => {
      const dept = t.department?.trim();
      if (dept) {
        const foundKey = Object.keys(deptMap).find(k => k.toLowerCase() === dept.toLowerCase());
        if (foundKey) {
          deptMap[foundKey] += 1;
        } else {
          deptMap[dept] = (deptMap[dept] || 0) + 1;
        }
      }
    });

    return Object.entries(deptMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [tasks]);

  // 5. REAL Priority Breakdown
  const priorityData = useMemo(() => {
    const highCount = tasks.filter(t => t.priority === 'high').length;
    const medCount = tasks.filter(t => t.priority === 'medium').length;
    const lowCount = tasks.filter(t => t.priority === 'low').length;
    const sum = highCount + medCount + lowCount;

    if (sum === 0) {
      return {
        high: 0,
        medium: 0,
        low: 0,
        highCount: 0,
        medCount: 0,
        lowCount: 0,
        total: 0
      };
    }

    const high = Math.round((highCount / sum) * 100);
    const medium = Math.round((medCount / sum) * 100);
    const low = Math.max(0, 100 - high - medium);

    return {
      high,
      medium,
      low,
      highCount,
      medCount,
      lowCount,
      total: sum
    };
  }, [tasks]);

  // 6. REAL Performance Team Members
  const performanceTeamMembers = useMemo(() => {
    return TEAM_MEMBERS.map(member => {
      const isDesign = member.role.toLowerCase().includes('design');
      const category = isDesign ? 'Design' : 'Media';

      // Find all real tasks belonging to this member
      const memberTasks = tasks.filter(t => {
        if (t.projectId === member.id) return true;
        const proj = projects.find(p => p.id === t.projectId);
        if (proj && proj.name.toLowerCase() === member.name.toLowerCase()) return true;
        return false;
      });

      const total = memberTasks.length;
      const completed = memberTasks.filter(t => t.status === 'done').length;
      const inProgress = memberTasks.filter(t => t.status === 'in-progress').length;
      const todo = memberTasks.filter(t => t.status === 'todo').length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Real Subtask deliverables
      const subtasksTotal = memberTasks.reduce((acc, t) => acc + (t.subTasks?.length || 0), 0);
      const subtasksDone = memberTasks.reduce((acc, t) => acc + (t.subTasks?.filter(st => st.completed).length || 0), 0);

      // Status tags based on true real completion
      const efficiency = total === 0 ? 'Available'
        : rate === 100 ? '100% Completed'
        : rate >= 70 ? 'High Velocity'
        : rate >= 40 ? 'Optimal Flow'
        : 'Active Progress';

      const efficiencyColor = total === 0 ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        : rate >= 70 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40' 
        : rate >= 40 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800/40'
        : 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40';

      return {
        ...member,
        category,
        total,
        completed,
        inProgress,
        todo,
        rate,
        subtasksTotal,
        subtasksDone,
        efficiency,
        efficiencyColor
      };
    });
  }, [tasks, projects]);

  const filteredTeamMembers = useMemo(() => {
    if (activeTeamFilter === 'design') {
      return performanceTeamMembers.filter(m => m.category === 'Design');
    }
    if (activeTeamFilter === 'media') {
      return performanceTeamMembers.filter(m => m.category === 'Media');
    }
    return performanceTeamMembers;
  }, [performanceTeamMembers, activeTeamFilter]);

  // AI Gemini Insight fetch based on true tasks
  useEffect(() => {
    let isMounted = true;
    const fetchInsight = async () => {
      try {
        if (tasks.length > 0) {
          const text = await analyzeProgress(tasks);
          if (isMounted) setInsight(text);
        } else {
          if (isMounted) {
            setInsight("No active branch tasks found in the database. Add new actions to generate live operational analysis.");
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchInsight();
    return () => { isMounted = false; };
  }, [tasks]);

  // Real PDF Export with Live Data
  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('landscape');
      
      doc.setFillColor(251, 248, 243);
      doc.rect(0, 0, 297, 210, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text("CREATIVE TIMELINE - EXECUTIVE SUMMARY", 20, 24);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleDateString()} | Active Date Span: ${dateRangeInfo.earliestStr} → ${dateRangeInfo.latestStr}`, 20, 32);

      // Top Highlights
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(20, 40, 80, 28, 4, 4, 'F');
      doc.roundedRect(108, 40, 80, 28, 4, 4, 'F');
      doc.roundedRect(196, 40, 80, 28, 4, 4, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("TOTAL COMPLETED", 26, 48);
      doc.text("DESIGN COMPLETED", 114, 48);
      doc.text("MEDIA COMPLETED", 202, 48);

      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text(`${completedTasks} Tasks (${globalCompletionRate}%)`, 26, 60);
      doc.text(`${realDesignCompleted} of ${realDesignTotal} AW`, 114, 60);
      doc.text(`${realMediaCompleted} of ${realMediaTotal} Photos`, 202, 60);

      // Team Performance Header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("REAL PERFORMANCE TEAM MEMBERS", 20, 82);

      // Team Table
      let y = 92;
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("MEMBER", 24, y);
      doc.text("ROLE", 75, y);
      doc.text("ASSIGNED", 145, y);
      doc.text("DONE", 180, y);
      doc.text("COMPLETION", 210, y);
      doc.text("STATUS", 250, y);
      
      doc.setDrawColor(226, 232, 240);
      doc.line(20, y + 3, 276, y + 3);

      performanceTeamMembers.forEach(m => {
        y += 12;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(20, y - 7, 256, 10, 2, 2, 'F');

        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text(m.name, 24, y);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(m.role, 75, y);
        doc.text(`${m.total}`, 145, y);
        doc.text(`${m.completed}`, 180, y);
        doc.text(`${m.rate}%`, 210, y);
        doc.text(m.efficiency, 250, y);
      });

      doc.save(`Executive_Summary_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[70] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#fbf8f3] dark:bg-slate-950 w-full h-full md:h-auto md:max-w-6xl lg:max-w-7xl md:max-h-[92vh] md:rounded-[36px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in md:zoom-in duration-300 border border-slate-200/80 dark:border-slate-800">
        
        {/* Header */}
        <div className="px-6 py-4 md:px-8 md:py-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 md:w-12 md:h-12 bg-yellow-500 rounded-2xl flex items-center justify-center text-slate-900 shadow-lg shadow-yellow-500/20 shrink-0">
              <BarChart3 size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Executive Summary</h2>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  {totalTasks} Real Tasks
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Live timeline: <span className="font-bold text-slate-600 dark:text-slate-300">{dateRangeInfo.earliestStr}</span> → <span className="font-bold text-slate-600 dark:text-slate-300">{dateRangeInfo.latestStr}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-yellow-400 dark:hover:border-yellow-500 transition-all shadow-sm active:scale-95"
            >
              {isExporting ? <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-yellow-500 rounded-full animate-spin" /> : <Download size={14} className="text-yellow-600 dark:text-yellow-400" />}
              <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
            </button>
            <button 
              onClick={onClose} 
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all active:scale-95"
              title="Close Summary"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 custom-scrollbar">
          
          {/* Top 3 Metric Cards with Real Data */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            
            {/* 1. TOTAL COMPLETED (Real) */}
            <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Completed</p>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <h3 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                    {completedTasks} <span className="text-xl md:text-2xl font-bold text-slate-600 dark:text-slate-400">Tasks</span>
                  </h3>
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                    of {totalTasks}
                  </span>
                </div>
              </div>
              <div className="mt-5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                  <span>Progress Rate</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">{globalCompletionRate}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${globalCompletionRate}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* 2. DESIGN COMPLETED (Real) */}
            <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Design Completed</p>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/30">
                    <ArrowUpRight size={12} strokeWidth={2.5} /> {designRate}% <span className="font-medium text-[9px] opacity-75">Rate</span>
                  </span>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <h3 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                    {realDesignCompleted} <span className="text-xl md:text-2xl font-bold text-slate-600 dark:text-slate-400">AW</span>
                  </h3>
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                    of {realDesignTotal} Design
                  </span>
                </div>
              </div>
              <div className="mt-5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                  <span>Design Output</span>
                  <span className="text-teal-600 dark:text-teal-400 font-black">{designRate}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${designRate}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* 3. MEDIA COMPLETED (Real) */}
            <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Media Completed</p>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/30">
                    <ArrowUpRight size={12} strokeWidth={2.5} /> {mediaRate}% <span className="font-medium text-[9px] opacity-75">Rate</span>
                  </span>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <h3 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                    {realMediaCompleted} <span className="text-xl md:text-2xl font-bold text-slate-600 dark:text-slate-400">Photos</span>
                  </h3>
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                    of {realMediaTotal} Media
                  </span>
                </div>
              </div>
              <div className="mt-5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                  <span>Media Deliverables</span>
                  <span className="text-teal-600 dark:text-teal-400 font-black">{mediaRate}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${mediaRate}%` }} 
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Middle Section: Real Tasks Overview Chart (Left) + Real Requester & Priority (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* TASKS OVERVIEW - Line & Bar Chart with Real Data (8 Columns) */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[32px] p-6 md:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              
              {/* Header with Title, Legends, and Timeframe Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">Tasks Overview</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Real monthly volume across task schedule and deadlines</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {dateRangeInfo.year}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600" /> Benchmark
                    </span>
                  </div>

                  {/* Filter Selector */}
                  <div className="relative">
                    <select
                      value={timeframeFilter}
                      onChange={(e) => setTimeframeFilter(e.target.value as any)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none hover:border-yellow-400 cursor-pointer transition-all"
                    >
                      <option value="all">All Months</option>
                      <option value="active">Active Months Only</option>
                      <option value="q1-q2">Q1 - Q2 (Jan-Jun)</option>
                      <option value="q3-q4">Q3 - Q4 (Jul-Dec)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Responsive SVG Chart with Real Proportions */}
              <div className="relative w-full aspect-[2/1] sm:aspect-[2.4/1] min-h-[220px]">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 760 260">
                  {/* Grid Lines */}
                  {[40, 90, 140, 190].map((yVal, idx) => (
                    <line 
                      key={idx} 
                      x1="30" 
                      y1={yVal} 
                      x2="730" 
                      y2={yVal} 
                      stroke="currentColor" 
                      className="text-slate-100 dark:text-slate-800" 
                      strokeWidth="1" 
                    />
                  ))}
                  
                  {/* Base X Axis line */}
                  <line x1="30" y1="220" x2="730" y2="220" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="1.5" />

                  {/* Benchmark Trend Line (Gray) */}
                  {(() => {
                    const count = displayedMonthlyOverview.length;
                    const step = count > 1 ? 660 / (count - 1) : 660;
                    const points = displayedMonthlyOverview.map((item, i) => {
                      const x = 50 + i * step;
                      const val = item.val2025 || (item.val2026 ? Math.max(1, Math.round(item.val2026 * 0.7)) : 0);
                      const y = 220 - (val / maxChartValue) * 160;
                      return `${x},${y}`;
                    }).join(' ');

                    return (
                      <polyline 
                        points={points} 
                        fill="none" 
                        stroke="#94a3b8" 
                        strokeWidth="1.8" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="dark:stroke-slate-600 opacity-60"
                      />
                    );
                  })()}

                  {/* Real Trend Line (Emerald Green) */}
                  {(() => {
                    const activeMonths = displayedMonthlyOverview.filter(m => m.val2026 !== null && m.val2026 > 0);
                    if (activeMonths.length === 0) return null;

                    const count = displayedMonthlyOverview.length;
                    const step = count > 1 ? 660 / (count - 1) : 660;

                    const points = activeMonths.map((item) => {
                      const i = displayedMonthlyOverview.findIndex(m => m.month === item.month);
                      const x = 50 + i * step;
                      const val = item.val2026 || 0;
                      const y = 220 - (val / maxChartValue) * 160;
                      return `${x},${y}`;
                    }).join(' ');

                    return (
                      <polyline 
                        points={points} 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                      />
                    );
                  })()}

                  {/* Real Monthly Bars & Labels */}
                  {displayedMonthlyOverview.map((item, idx) => {
                    const count = displayedMonthlyOverview.length;
                    const step = count > 1 ? 660 / (count - 1) : 660;
                    const x = 50 + idx * step;
                    const hasVal = item.val2026 !== null && item.val2026 > 0;
                    const val = item.val2026 || 0;
                    const barHeight = hasVal ? Math.max(14, (val / maxChartValue) * 160) : 0;
                    const barY = 220 - barHeight;
                    const isHovered = hoveredMonthIndex === idx;

                    return (
                      <g 
                        key={item.month} 
                        className="cursor-pointer transition-all"
                        onMouseEnter={() => setHoveredMonthIndex(idx)}
                        onMouseLeave={() => setHoveredMonthIndex(null)}
                      >
                        {/* Hover Column Area */}
                        <rect 
                          x={x - 22} 
                          y="20" 
                          width="44" 
                          height="200" 
                          fill="transparent"
                          className={isHovered ? 'fill-yellow-50/50 dark:fill-yellow-500/5' : ''}
                        />

                        {/* Real Task Volume Bar */}
                        {hasVal ? (
                          <rect 
                            x={x - 12} 
                            y={barY} 
                            width="24" 
                            height={barHeight} 
                            rx="5"
                            className={`transition-all duration-300 ${isHovered ? 'fill-yellow-400' : 'fill-yellow-400/85 dark:fill-yellow-500/85'}`} 
                          />
                        ) : (
                          // Subtle dot placeholder for months with 0 tasks
                          <circle cx={x} cy="220" r="2" className="fill-slate-300 dark:fill-slate-700" />
                        )}

                        {/* Real Count Value on top in bold green */}
                        {hasVal && (
                          <text 
                            x={x} 
                            y={barY - 8} 
                            textAnchor="middle" 
                            className="font-black text-[12px] fill-emerald-600 dark:fill-emerald-400"
                          >
                            {val}
                          </text>
                        )}

                        {/* Connecting Point on Line */}
                        {hasVal && (
                          <circle 
                            cx={x} 
                            cy={barY} 
                            r={isHovered ? "4.5" : "3"} 
                            className="fill-emerald-500 stroke-white dark:stroke-slate-900" 
                            strokeWidth="1.5" 
                          />
                        )}

                        {/* Month Name on X-axis */}
                        <text 
                          x={x} 
                          y="242" 
                          textAnchor="middle" 
                          className={`text-[10px] font-bold ${isHovered ? 'fill-yellow-600 dark:fill-yellow-400 font-black' : 'fill-slate-500 dark:fill-slate-400'}`}
                        >
                          {item.month}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Chart Footer Indicator */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>Total Active Actions: <strong className="text-slate-700 dark:text-slate-200">{totalTasks} tasks</strong></span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{completedTasks} Completed ({globalCompletionRate}%)</span>
              </div>
            </div>

            {/* Right Column: Real Requester & Real Priority (4 Columns) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* 1. REQUESTER (Departments - Real Data) */}
              <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Requester</h3>
                  <div className="w-10 h-1 bg-red-500 rounded-full mt-1.5 mb-4" />
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {requesterData.map((req) => (
                    <div key={req.name} className="py-2.5 flex items-center justify-between group">
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                          {req.name}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium">Department</span>
                      </div>
                      <span className={`text-sm font-black ${req.count > 0 ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>
                        {req.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. PRIORITY (Real Donut Chart) */}
              <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Priority</h3>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Low, Medium, High</p>
                </div>

                {/* SVG Donut Chart */}
                <div className="py-4 flex items-center justify-center">
                  <div className="relative w-36 h-36">
                    {priorityData.total > 0 ? (
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        {/* High (Red) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#ef4444"
                          strokeWidth="18"
                          strokeDasharray={`${(priorityData.high / 100) * 238.76} 238.76`}
                          strokeDashoffset="0"
                          className="transition-all duration-700"
                        />
                        {/* Medium (Yellow) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#f59e0b"
                          strokeWidth="18"
                          strokeDasharray={`${(priorityData.medium / 100) * 238.76} 238.76`}
                          strokeDashoffset={`-${(priorityData.high / 100) * 238.76}`}
                          className="transition-all duration-700"
                        />
                        {/* Low (Green) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#10b981"
                          strokeWidth="18"
                          strokeDasharray={`${(priorityData.low / 100) * 238.76} 238.76`}
                          strokeDashoffset={`-${((priorityData.high + priorityData.medium) / 100) * 238.76}`}
                          className="transition-all duration-700"
                        />
                      </svg>
                    ) : (
                      <div className="w-full h-full rounded-full border-4 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs text-slate-400">
                        No Tasks
                      </div>
                    )}
                    
                    {/* Inner Donut Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-black text-slate-800 dark:text-white leading-none">
                        {priorityData.total}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Tasks</span>
                    </div>
                  </div>
                </div>

                {/* Priority Breakdown Legend */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-500" /> High
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-white">{priorityData.highCount} ({priorityData.high}%)</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" /> Med
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-white">{priorityData.medCount} ({priorityData.medium}%)</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Low
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-white">{priorityData.lowCount} ({priorityData.low}%)</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Performance Team Members Section (100% Real Live Tasks Data) */}
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-xl flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight">Performance Team Members</h3>
                  <p className="text-xs text-slate-400 font-medium">Live individual workload, deliverables, and milestone completion</p>
                </div>
              </div>

              {/* Team Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                {(['all', 'design', 'media'] as const).map((tab) => {
                  const isActive = activeTeamFilter === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTeamFilter(tab)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                        isActive 
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab === 'all' ? 'All Members' : tab === 'design' ? 'Design Team' : 'Media Team'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Team Members Grid - Real Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {filteredTeamMembers.map((member) => (
                <div 
                  key={member.id}
                  className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800 hover:border-yellow-400 dark:hover:border-yellow-500/40 transition-all group flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Avatar + Name + Efficiency Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={member.avatar} 
                          alt={member.name} 
                          className="w-11 h-11 rounded-2xl object-cover shadow-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-700 shrink-0" 
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-800 dark:text-white truncate group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                            {member.name}
                          </h4>
                          <span className="inline-block text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                            {member.role}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${member.efficiencyColor}`}>
                        {member.efficiency}
                      </span>
                    </div>

                    {/* Real Workload Stats */}
                    <div className="grid grid-cols-3 gap-2 py-3 bg-white dark:bg-slate-900 rounded-xl px-3 border border-slate-200/60 dark:border-slate-800 mb-3.5 text-center">
                      <div>
                        <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Assigned</span>
                        <span className="text-xs font-black text-slate-800 dark:text-white">{member.total}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Done</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{member.completed}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black uppercase text-yellow-600 dark:text-yellow-400 tracking-wider">Active</span>
                        <span className="text-xs font-black text-yellow-600 dark:text-yellow-400">{member.inProgress + member.todo}</span>
                      </div>
                    </div>
                  </div>

                  {/* Real Completion Rate Progress */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                      <span className="text-slate-500 dark:text-slate-400">Completion</span>
                      <span className="text-slate-800 dark:text-white font-black">{member.rate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${member.color}`}
                        style={{ width: `${member.rate}%` }} 
                      />
                    </div>
                  </div>

                </div>
              ))}
            </div>

          </div>

          {/* AI Operational Advisor Banner */}
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200/80 dark:border-yellow-500/20 rounded-[28px] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-yellow-500 rounded-2xl flex items-center justify-center text-slate-900 shadow-md shadow-yellow-500/20 shrink-0">
                <Sparkles size={20} className={loading ? "animate-spin" : ""} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-yellow-800 dark:text-yellow-400">Gemini Operational Advisor</h4>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-yellow-200/60 dark:bg-yellow-500/20 text-yellow-900 dark:text-yellow-300">Flash 3</span>
                </div>
                <p className="text-xs md:text-sm font-semibold text-slate-700 dark:text-yellow-200/90 mt-1 leading-relaxed">
                  "{insight}"
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 md:px-8 md:py-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>Creative Timeline Live Sync Active</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button 
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="sm:hidden flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-500 text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl"
            >
              <Download size={14} /> Export PDF
            </button>
            <button 
              onClick={onClose} 
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SummaryReportModal;