import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import { 
  Users, UserPlus, Calendar, DollarSign, CheckCircle2, XCircle, 
  Plus, Minus, Camera, Upload, Download, Search, Briefcase, 
  Clock, Trash2, ClipboardList, Award, FileText, Check, X, 
  AlertCircle, ShieldCheck, Heart, UserCheck
} from "lucide-react";
import localDb from "@/services/database/localDb";
import logger from "@/services/logger/Logger";

export const Route = createFileRoute("/admin/staff")({
  component: StaffManagementPage,
});

interface StaffMember {
  id: string;
  name: string;
  role: "Manager" | "Chef" | "Cashier" | "Waiter" | "Cleaner";
  phone: string;
  email: string;
  salary: number;
  salaryType: "daily" | "monthly";
  photo?: string; // Base64 data URL
  joiningDate: number;
  enabled: number;
}

interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  attendanceStatus: "present" | "absent" | "leave" | "half-day";
  checkIn?: number;
  checkOut?: number;
  lateMinutes?: number;
  overtimeMinutes?: number;
  notes?: string;
}

interface LeaveRequest {
  id: string;
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  createdAt: number;
}

interface PayoutRecord {
  id: string;
  staffId: string;
  month: string; // YYYY-MM
  baseSalary: number;
  deductions: number;
  netSalary: number;
  paymentStatus: "paid" | "pending";
  paymentMode?: string;
  paidAt?: number;
  notes?: string;
}

function StaffManagementPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "directory" | "attendance" | "leaves" | "payroll">("overview");
  
  // Data states
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [leavesList, setLeavesList] = useState<LeaveRequest[]>([]);
  const [payoutsList, setPayoutsList] = useState<PayoutRecord[]>([]);
  
  // UI filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  
  // Form modal states
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState<Omit<StaffMember, "id" | "joiningDate" | "enabled">>({
    name: "",
    role: "Waiter",
    phone: "",
    email: "",
    salary: 500,
    salaryType: "daily",
    photo: ""
  });
  
  // Camera capture states
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  // Quick Check-in select
  const [quickCheckInStaffId, setQuickCheckInStaffId] = useState("");
  
  // Dot edit popover
  const [editingDot, setEditingDot] = useState<{ staffId: string; date: string } | null>(null);
  const [editStatus, setEditStatus] = useState<"present" | "absent" | "leave" | "half-day">("present");
  const [editNotes, setEditNotes] = useState("");

  // Pay Salary modal
  const [payingSalary, setPayingSalary] = useState<{ staffId: string; netSalary: number; month: string } | null>(null);
  const [paymentMode, setPaymentMode] = useState<"Cash" | "UPI" | "Card" | "Bank Transfer">("Cash");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Load all data from local DB
  const loadData = () => {
    try {
      const staff = localDb.getTable("staff") || [];
      const attendance = localDb.getTable("attendance") || [];
      const leaves = localDb.getTable("staffLeaves") || [];
      const payouts = localDb.getTable("staffPayouts") || [];

      setStaffList(staff);
      setAttendanceList(attendance);
      setLeavesList(leaves);
      setPayoutsList(payouts);
      
      if (staff.length > 0 && !quickCheckInStaffId) {
        setQuickCheckInStaffId(staff[0].id);
      }
    } catch (err) {
      logger.error("staff", "Failed loading staff data from DB", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
    );
  }, [staffList, searchQuery]);

  // Current month details
  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return new Date(year, month, 0).getDate();
  }, [selectedMonth]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Real-time Overview stats
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const activeStaff = staffList.filter(s => s.enabled === 1);
    
    // Checked in today
    const checkedInToday = attendanceList.filter(a => a.date === todayStr && a.attendanceStatus === "present").length;
    
    // Leaves pending
    const pendingLeaves = leavesList.filter(l => l.status === "pending").length;
    
    // Total salary due (for current selectedMonth)
    const paidSum = payoutsList
      .filter(p => p.month === selectedMonth && p.paymentStatus === "paid")
      .reduce((sum, p) => sum + p.netSalary, 0);

    return {
      total: activeStaff.length,
      checkedIn: checkedInToday,
      pendingLeaves,
      paidSum
    };
  }, [staffList, attendanceList, leavesList, payoutsList, selectedMonth]);

  // Add Staff
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name.trim()) return;

    try {
      const employee: StaffMember = {
        id: `emp_${Date.now()}`,
        ...newStaff,
        joiningDate: Date.now(),
        enabled: 1
      };
      
      localDb.insertRecord("staff", employee);
      loadData();
      
      // Reset Modal
      setShowAddStaffModal(false);
      setNewStaff({
        name: "",
        role: "Waiter",
        phone: "",
        email: "",
        salary: 500,
        salaryType: "daily",
        photo: ""
      });
    } catch (err) {
      logger.error("staff", "Failed to add staff member", err);
    }
  };

  // Delete Staff
  const handleDeleteStaff = (id: string) => {
    if (confirm("Are you sure you want to remove this staff member?")) {
      try {
        localDb.deleteRecord("staff", id);
        loadData();
      } catch (err) {
        logger.error("staff", "Failed to delete staff member", err);
      }
    }
  };

  // Toggle Staff status (enabled/disabled)
  const toggleStaffStatus = (staff: StaffMember) => {
    try {
      localDb.updateRecord("staff", staff.id, { enabled: staff.enabled === 1 ? 0 : 1 });
      loadData();
    } catch (err) {
      logger.error("staff", "Failed status toggle", err);
    }
  };

  // Setup Webcam Stream
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      logger.error("staff", "Webcam access denied", err);
      alert("Could not access webcam. Please upload an image instead.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setShowCamera(false);
  };

  // Capture image from Video stream
  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        const dataUrl = canvas.toDataURL("image/png");
        setNewStaff(prev => ({ ...prev, photo: dataUrl }));
        stopCamera();
      }
    }
  };

  // File upload converter to Base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewStaff(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick Check-in/out
  const handleQuickAttendance = (type: "in" | "out") => {
    if (!quickCheckInStaffId) return;
    const todayStr = new Date().toISOString().split("T")[0];
    const matched = attendanceList.find(a => a.staffId === quickCheckInStaffId && a.date === todayStr);

    try {
      if (type === "in") {
        if (matched) {
          alert("This employee is already checked in for today!");
          return;
        }
        const record: AttendanceRecord = {
          id: `att_${Date.now()}`,
          staffId: quickCheckInStaffId,
          date: todayStr,
          attendanceStatus: "present",
          checkIn: Date.now(),
          notes: "Counter Quick Check-in"
        };
        localDb.insertRecord("attendance", record);
      } else {
        if (!matched || matched.attendanceStatus !== "present") {
          alert("Employee has not checked in today!");
          return;
        }
        localDb.updateRecord("attendance", matched.id, {
          checkOut: Date.now(),
          notes: (matched.notes || "") + " | Quick Check-out"
        });
      }
      loadData();
      alert(`Success: Check-${type === "in" ? "in" : "out"} recorded!`);
    } catch (err) {
      logger.error("staff", "Quick attendance error", err);
    }
  };

  // Manage attendance status of specific grid dot
  const openEditDot = (staffId: string, day: number) => {
    const monthFormatted = selectedMonth; // YYYY-MM
    const dateStr = `${monthFormatted}-${String(day).padStart(2, "0")}`;
    const record = attendanceList.find(a => a.staffId === staffId && a.date === dateStr);
    
    setEditingDot({ staffId, date: dateStr });
    setEditStatus(record?.attendanceStatus || "present");
    setEditNotes(record?.notes || "");
  };

  const handleSaveDot = () => {
    if (!editingDot) return;
    const { staffId, date } = editingDot;
    const record = attendanceList.find(a => a.staffId === staffId && a.date === date);

    try {
      if (record) {
        localDb.updateRecord("attendance", record.id, {
          attendanceStatus: editStatus,
          notes: editNotes
        });
      } else {
        const newRecord: AttendanceRecord = {
          id: `att_${Date.now()}`,
          staffId,
          date,
          attendanceStatus: editStatus,
          checkIn: editStatus === "present" ? Date.now() : undefined,
          notes: editNotes
        };
        localDb.insertRecord("attendance", newRecord);
      }
      loadData();
      setEditingDot(null);
    } catch (err) {
      logger.error("staff", "Failed saving dot attendance", err);
    }
  };

  // Leave approval actions
  const handleLeaveAction = (leave: LeaveRequest, action: "approved" | "rejected") => {
    try {
      localDb.updateRecord("staffLeaves", leave.id, { status: action, approvedBy: "Head Manager" });
      
      // If approved, automatically populate attendance dates with 'leave' status
      if (action === "approved") {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split("T")[0];
          const matched = attendanceList.find(a => a.staffId === leave.staffId && a.date === dateStr);
          if (matched) {
            localDb.updateRecord("attendance", matched.id, { attendanceStatus: "leave", notes: "Approved Leave Request" });
          } else {
            localDb.insertRecord("attendance", {
              id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
              staffId: leave.staffId,
              date: dateStr,
              attendanceStatus: "leave",
              notes: "Approved Leave Request"
            });
          }
        }
      }
      loadData();
    } catch (err) {
      logger.error("staff", "Leave approval toggle failed", err);
    }
  };

  // Salary calculations based on attendance
  const getStaffMonthSalary = (staff: StaffMember) => {
    const monthPrefix = selectedMonth;
    const records = attendanceList.filter(a => a.staffId === staff.id && a.date.startsWith(monthPrefix));
    
    const presentCount = records.filter(r => r.attendanceStatus === "present").length;
    const halfDayCount = records.filter(r => r.attendanceStatus === "half-day").length;
    const absentCount = records.filter(r => r.attendanceStatus === "absent").length;
    const leaveCount = records.filter(r => r.attendanceStatus === "leave").length;

    let netSalary = 0;
    let deductions = 0;
    
    if (staff.salaryType === "daily") {
      netSalary = (presentCount + (halfDayCount * 0.5)) * staff.salary;
    } else {
      // Monthly pro-rated (deduct for absences)
      const dailyRate = staff.salary / daysInMonth;
      deductions = absentCount * dailyRate;
      netSalary = Math.max(0, staff.salary - deductions);
    }

    return {
      present: presentCount,
      halfDay: halfDayCount,
      absent: absentCount,
      leaves: leaveCount,
      base: staff.salary,
      deductions: Math.round(deductions),
      net: Math.round(netSalary)
    };
  };

  // Submit salary payment record
  const handlePaySalary = () => {
    if (!payingSalary) return;
    try {
      const payout: PayoutRecord = {
        id: `pay_${Date.now()}`,
        staffId: payingSalary.staffId,
        month: payingSalary.month,
        baseSalary: staffList.find(s => s.id === payingSalary.staffId)?.salary || 0,
        deductions: 0,
        netSalary: payingSalary.netSalary,
        paymentStatus: "paid",
        paymentMode,
        paidAt: Date.now(),
        notes: paymentNotes
      };
      
      localDb.insertRecord("staffPayouts", payout);
      loadData();
      setPayingSalary(null);
      setPaymentNotes("");
      alert("Salary payout logged successfully!");
    } catch (err) {
      logger.error("staff", "Salary payment error", err);
    }
  };

  // Export Attendance CSV report
  const handleExportCSV = () => {
    try {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Employee Name,Role,Phone,Present Days,Absent Days,Half Days,Leaves,Net Salary (Current Month)\n";
      
      staffList.forEach(s => {
        const salMetrics = getStaffMonthSalary(s);
        csvContent += `"${s.name}","${s.role}","${s.phone}",${salMetrics.present},${salMetrics.absent},${salMetrics.halfDay},${salMetrics.leaves},INR ${salMetrics.net}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `staff_report_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      logger.error("staff", "Failed to export report CSV", err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-fade-in text-brown-deep selection:bg-gold/30">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-brown-deep flex items-center gap-2">
            <Users className="h-6 w-6 text-gold" />
            Staff Management Center
          </h2>
          <p className="text-xs text-muted-foreground">Manage employees, record daily shifts, check leave requests, and audit payouts.</p>
        </div>
        
        {/* Top Controls */}
        <div className="flex flex-wrap gap-2.5 items-center w-full sm:w-auto">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-gold"
          />
          <button
            onClick={() => setShowAddStaffModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brown-gradient text-cream text-xs font-bold rounded-xl shadow hover:opacity-95"
          >
            <UserPlus className="h-3.5 w-3.5" /> Add Staff
          </button>
        </div>
      </div>

      {/* DASHBOARD STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-card/65 border border-border/50 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] text-muted-foreground uppercase font-bold">Total Staff</span>
            <span className="text-lg font-black">{stats.total} Active</span>
          </div>
        </div>
        <div className="p-4 bg-card/65 border border-border/50 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] text-muted-foreground uppercase font-bold">Checked In Today</span>
            <span className="text-lg font-black text-green-700">{stats.checkedIn} Present</span>
          </div>
        </div>
        <div className="p-4 bg-card/65 border border-border/50 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-amber-500">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] text-muted-foreground uppercase font-bold">Pending Leaves</span>
            <span className="text-lg font-black text-amber-600">{stats.pendingLeaves} requests</span>
          </div>
        </div>
        <div className="p-4 bg-card/65 border border-border/50 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-brown-deep/5 flex items-center justify-center text-brown-deep">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] text-muted-foreground uppercase font-bold">Salary Logged</span>
            <span className="text-lg font-black">₹{stats.paidSum}</span>
          </div>
        </div>
      </div>

      {/* QUICK ATTENDANCE PANEL */}
      <div className="p-5 bg-card/45 border border-border/40 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gold/15 flex items-center justify-center text-gold">
            <Clock className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-brown-deep">Today's Quick Check-in/out</h3>
            <p className="text-[10px] text-muted-foreground">Select an employee to log dynamic shift arrival and departure timestamps.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            value={quickCheckInStaffId}
            onChange={(e) => setQuickCheckInStaffId(e.target.value)}
            className="flex-1 md:w-56 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gold"
          >
            {staffList.filter(s => s.enabled === 1).map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
            ))}
            {staffList.length === 0 && <option value="">No staff registered</option>}
          </select>
          <div className="flex gap-2">
            <button 
              onClick={() => handleQuickAttendance("in")}
              className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm active:scale-98 transition-all"
            >
              <Check className="h-3.5 w-3.5" /> Check-In
            </button>
            <button 
              onClick={() => handleQuickAttendance("out")}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm active:scale-98 transition-all"
            >
              <X className="h-3.5 w-3.5" /> Check-Out
            </button>
          </div>
        </div>
      </div>

      {/* VIEW TABS BAR */}
      <div className="flex w-full border-b border-border/40 pb-px gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: "overview", label: "Dashboard Metrics", icon: Award },
          { id: "directory", label: "Staff Directory", icon: Users },
          { id: "attendance", label: "Daily wise dots Grid", icon: Calendar },
          { id: "leaves", label: "Leave Requests", icon: ClipboardList },
          { id: "payroll", label: "Salaries & Payroll", icon: DollarSign },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? "border-gold text-gold" 
                  : "border-transparent text-muted-foreground hover:text-brown-deep"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="bg-card/35 rounded-3xl border border-border/50 p-6 min-h-[400px] shadow-sm backdrop-blur-sm">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h3 className="font-bold text-sm border-b pb-2 flex justify-between items-center">
              <span>Overview Metrics</span>
              <button 
                onClick={handleExportCSV}
                className="px-3 py-1 bg-gold/15 border text-[10px] rounded-lg hover:bg-gold/20 flex items-center gap-1 font-bold"
              >
                <Download className="h-3 w-3" /> Export CSV Report
              </button>
            </h3>
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* Daily wise attendance today summary */}
              <div className="p-5 bg-background border border-border/50 rounded-2xl space-y-4">
                <h4 className="font-bold text-xs flex items-center gap-1.5"><Clock className="h-4 w-4 text-gold" /> Checked-in Staff Today</h4>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {staffList.filter(s => s.enabled === 1).map(s => {
                    const todayStr = new Date().toISOString().split("T")[0];
                    const att = attendanceList.find(a => a.staffId === s.id && a.date === todayStr);
                    return (
                      <div key={s.id} className="flex items-center justify-between border-b pb-2 last:border-0 border-dashed border-border/30">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full overflow-hidden border shrink-0 bg-muted">
                            {s.photo ? (
                              <img src={s.photo} alt={s.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] font-black bg-gold/15 text-gold">{s.name.slice(0, 2).toUpperCase()}</div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-xs block">{s.name}</span>
                            <span className="text-[9px] text-muted-foreground">{s.role}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                          att?.attendanceStatus === "present" ? "bg-green-50 border border-green-200 text-green-700" : "bg-muted text-muted-foreground border"
                        }`}>
                          {att ? (att.checkOut ? "Checked out" : "Working (Checked-in)") : "Absent / Not Checked-in"}
                        </span>
                      </div>
                    );
                  })}
                  {staffList.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-6">No staff members enrolled.</p>}
                </div>
              </div>

              {/* Leave Requests preview panel */}
              <div className="p-5 bg-background border border-border/50 rounded-2xl space-y-4">
                <h4 className="font-bold text-xs flex items-center gap-1.5"><ClipboardList className="h-4 w-4 text-gold" /> Recent Leave Submissions</h4>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {leavesList.map(l => {
                    const empName = staffList.find(s => s.id === l.staffId)?.name || "Unknown";
                    return (
                      <div key={l.id} className="p-3 bg-card/65 border border-border/30 rounded-xl flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs">{empName}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                            l.status === "approved" ? "bg-green-50 text-green-700" : (l.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")
                          }`}>{l.status}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground">Range: {l.startDate} to {l.endDate}</div>
                        <div className="text-[10px] italic">"{l.reason}"</div>
                      </div>
                    );
                  })}
                  {leavesList.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-6">No leave requests logged in system.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STAFF DIRECTORY */}
        {activeTab === "directory" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <h3 className="font-bold text-sm">Staff Directory</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search staff, role, phone..."
                  className="w-full rounded-xl border border-border bg-background py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-gold"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredStaff.map(s => (
                <div key={s.id} className="p-4 bg-background border border-border/50 rounded-2xl flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
                  <div className="flex gap-4">
                    {/* ID Photo */}
                    <div className="h-16 w-16 rounded-xl overflow-hidden border shrink-0 bg-muted shadow-sm">
                      {s.photo ? (
                        <img src={s.photo} alt={s.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs font-black bg-gold/15 text-gold uppercase">{s.name.slice(0, 2)}</div>
                      )}
                    </div>
                    
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs truncate flex items-center gap-1.5">
                        {s.name}
                        <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase ${
                          s.enabled === 1 ? "bg-green-50 text-green-700 border" : "bg-red-50 text-red-700 border"
                        }`}>
                          {s.enabled === 1 ? "Active" : "Inactive"}
                        </span>
                      </h4>
                      <p className="text-[10px] text-gold font-bold flex items-center gap-1 mt-0.5"><Briefcase className="h-3 w-3" /> {s.role}</p>
                      
                      <div className="mt-2 text-[10px] text-muted-foreground space-y-0.5">
                        <div>Phone: <span className="font-semibold text-brown-deep">{s.phone || "Not set"}</span></div>
                        <div>Email: <span className="font-semibold text-brown-deep">{s.email || "Not set"}</span></div>
                        <div>Salary: <span className="font-bold text-brown-deep">₹{s.salary} / {s.salaryType}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-border/20 pt-3 text-[10px]">
                    <button
                      onClick={() => toggleStaffStatus(s)}
                      className={`flex-1 py-1 font-bold border rounded-lg active:scale-98 ${
                        s.enabled === 1 ? "bg-muted hover:bg-muted/80 text-brown-deep" : "bg-green-50 hover:bg-green-100 text-green-700"
                      }`}
                    >
                      {s.enabled === 1 ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(s.id)}
                      className="py-1 px-2.5 bg-red-500/10 hover:bg-red-500/15 text-red-600 font-bold rounded-lg active:scale-98"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredStaff.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground text-xs font-semibold">
                  No staff members matched your query. Click "Add Staff" to enroll a new employee.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DAILY WISE ATTENDANCE DOTS GRID */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-bold text-sm">Daily wise dots Attendance Grid</h3>
                <p className="text-[10px] text-muted-foreground">Click on any date dot for an employee to record/modify attendance status for that day in real time.</p>
              </div>
              <div className="flex items-center gap-4 text-[9px] font-black uppercase text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Present</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Absent</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Half-day</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Leave</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted border" /> Unmarked</span>
              </div>
            </div>

            {/* Attendance Scrollable Table */}
            <div className="overflow-x-auto border border-border/60 rounded-2xl bg-background shadow-inner max-h-[500px]">
              <table className="w-full text-left border-collapse min-w-[900px] text-xs">
                <thead>
                  <tr className="bg-muted/70 text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-b select-none">
                    <th className="p-4 sticky left-0 bg-muted/95 border-r min-w-[200px] z-10">Employee Name</th>
                    {daysArray.map(day => (
                      <th key={day} className="p-2.5 text-center min-w-[36px]">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffList.filter(s => s.enabled === 1).map(s => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-gold/5 transition-colors">
                      {/* Name Col */}
                      <td className="p-3 font-semibold sticky left-0 bg-background/95 border-r flex items-center gap-2.5 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="h-7 w-7 rounded-full overflow-hidden border shrink-0 bg-muted">
                          {s.photo ? (
                            <img src={s.photo} alt={s.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[9px] font-black bg-gold/15 text-gold">{s.name.slice(0, 2).toUpperCase()}</div>
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-xs block">{s.name}</span>
                          <span className="text-[9px] text-muted-foreground">{s.role}</span>
                        </div>
                      </td>
                      
                      {/* Days Dots */}
                      {daysArray.map(day => {
                        const monthFormatted = selectedMonth; // YYYY-MM
                        const dateStr = `${monthFormatted}-${String(day).padStart(2, "0")}`;
                        const record = attendanceList.find(a => a.staffId === s.id && a.date === dateStr);
                        
                        let dotClass = "bg-muted border border-border/60 hover:border-gold";
                        if (record?.attendanceStatus === "present") dotClass = "bg-green-500 hover:opacity-85 shadow-[0_0_8px_rgba(34,197,94,0.4)]";
                        if (record?.attendanceStatus === "absent") dotClass = "bg-red-500 hover:opacity-85 shadow-[0_0_8px_rgba(239,68,68,0.4)]";
                        if (record?.attendanceStatus === "half-day") dotClass = "bg-orange-500 hover:opacity-85 shadow-[0_0_8px_rgba(249,115,22,0.4)]";
                        if (record?.attendanceStatus === "leave") dotClass = "bg-amber-400 hover:opacity-85 shadow-[0_0_8px_rgba(251,191,36,0.4)]";

                        return (
                          <td key={day} className="p-1 text-center">
                            <button
                              onClick={() => openEditDot(s.id, day)}
                              className={`h-5 w-5 rounded-full transition-all cursor-pointer ${dotClass}`}
                              title={`${s.name} - Day ${day}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {staffList.filter(s => s.enabled === 1).length === 0 && (
                    <tr>
                      <td colSpan={daysInMonth + 1} className="p-8 text-center text-muted-foreground text-[11px] font-medium">No active employees found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Attendance Dot Edit Popover Modal */}
            {editingDot && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                <div className="bg-card rounded-2xl border p-5 shadow-2xl w-full max-w-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-bold text-xs text-brown-deep">
                      Update Attendance ({editingDot.date.split("-").reverse().join("/")})
                    </h4>
                    <button onClick={() => setEditingDot(null)} className="text-muted-foreground hover:text-gold"><X className="h-4 w-4" /></button>
                  </div>
                  
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1.5">Select Status</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "present", label: "Present (Full Day)", color: "bg-green-500" },
                          { id: "half-day", label: "Half Day Duty", color: "bg-orange-500" },
                          { id: "absent", label: "Absent", color: "bg-red-500" },
                          { id: "leave", label: "Leave", color: "bg-amber-400" },
                        ].map(st => (
                          <button
                            key={st.id}
                            onClick={() => setEditStatus(st.id as any)}
                            className={`p-2 rounded-xl border flex items-center gap-2 font-bold transition-all ${
                              editStatus === st.id 
                                ? "border-gold bg-gold/5 text-gold scale-102" 
                                : "border-border/60 hover:bg-gold/5"
                            }`}
                          >
                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${st.color}`} />
                            <span>{st.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Add Notes / Shift details</span>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="e.g. Late by 15 mins, Half day sick leave"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveDot}
                    className="w-full py-2 bg-brown-deep text-gold rounded-xl font-bold uppercase tracking-wider text-xs shadow hover:opacity-95"
                  >
                    Confirm & Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LEAVE REQUESTS */}
        {activeTab === "leaves" && (
          <div className="space-y-6">
            <h3 className="font-bold text-sm">Leave Approvals Ledger</h3>
            
            <div className="overflow-x-auto border border-border/60 rounded-2xl bg-background">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/70 text-[10px] uppercase font-bold text-muted-foreground border-b select-none">
                    <th className="p-4 border-r">Employee</th>
                    <th className="p-4 border-r">Leave Dates</th>
                    <th className="p-4 border-r">Reason / Description</th>
                    <th className="p-4 border-r">Request Status</th>
                    <th className="p-4 text-center">Action Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leavesList.map(leave => {
                    const staff = staffList.find(s => s.id === leave.staffId);
                    return (
                      <tr key={leave.id} className="border-b last:border-0 hover:bg-gold/5">
                        <td className="p-3 border-r font-semibold">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full overflow-hidden border shrink-0 bg-muted">
                              {staff?.photo ? (
                                <img src={staff.photo} alt={staff.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-[9px] font-black bg-gold/15 text-gold">{staff?.name.slice(0, 2).toUpperCase()}</div>
                              )}
                            </div>
                            <span>{staff?.name || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="p-3 border-r font-mono">{leave.startDate} to {leave.endDate}</td>
                        <td className="p-3 border-r italic text-muted-foreground font-medium">"{leave.reason}"</td>
                        <td className="p-3 border-r">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            leave.status === "approved" ? "bg-green-50 text-green-700" : (leave.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")
                          }`}>{leave.status}</span>
                        </td>
                        <td className="p-3 text-center">
                          {leave.status === "pending" ? (
                            <div className="flex justify-center gap-1.5">
                              <button 
                                onClick={() => handleLeaveAction(leave, "approved")}
                                className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-lg"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleLeaveAction(leave, "rejected")}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic font-semibold">Handled (by Manager)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {leavesList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground text-[11px] font-medium">No leave request logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PAYROLL & SALARIES */}
        {activeTab === "payroll" && (
          <div className="space-y-6">
            <h3 className="font-bold text-sm">Employee Monthly Salary Audit</h3>

            <div className="overflow-x-auto border border-border/60 rounded-2xl bg-background shadow-inner">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/70 text-[10px] uppercase font-bold text-muted-foreground border-b select-none">
                    <th className="p-4 border-r">Employee</th>
                    <th className="p-4 border-r text-center">Base Salary</th>
                    <th className="p-4 border-r text-center">Shift Metrics</th>
                    <th className="p-4 border-r text-center">Deductions</th>
                    <th className="p-4 border-r text-center">Calculated Net</th>
                    <th className="p-4 border-r text-center">Payout Status</th>
                    <th className="p-4 text-center">Process Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.filter(s => s.enabled === 1).map(s => {
                    const salM = getStaffMonthSalary(s);
                    const isPaid = payoutsList.some(p => p.staffId === s.id && p.month === selectedMonth && p.paymentStatus === "paid");
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-gold/5">
                        <td className="p-3 border-r font-semibold">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full overflow-hidden border shrink-0 bg-muted">
                              {s.photo ? (
                                  <img src={s.photo} alt={s.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-[9px] font-black bg-gold/15 text-gold">{s.name.slice(0, 2).toUpperCase()}</div>
                              )}
                            </div>
                            <span>{s.name}</span>
                          </div>
                        </td>
                        <td className="p-3 border-r text-center font-bold">₹{s.salary} <span className="text-[9px] text-muted-foreground">/{s.salaryType}</span></td>
                        <td className="p-3 border-r text-center font-mono">
                          <span className="text-green-700 font-bold">{salM.present}P</span> | <span className="text-red-600 font-bold">{salM.absent}A</span> | <span className="text-orange-500 font-bold">{salM.halfDay}H</span> | <span className="text-amber-500 font-bold">{salM.leaves}L</span>
                        </td>
                        <td className="p-3 border-r text-center text-red-600 font-bold">-₹{salM.deductions}</td>
                        <td className="p-3 border-r text-center font-extrabold text-gold">₹{salM.net}</td>
                        <td className="p-3 border-r text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            isPaid ? "bg-green-50 text-green-700 border" : "bg-amber-50 text-amber-700 border"
                          }`}>{isPaid ? "Paid" : "Pending"}</span>
                        </td>
                        <td className="p-3 text-center">
                          {!isPaid ? (
                            <button
                              onClick={() => setPayingSalary({ staffId: s.id, netSalary: salM.net, month: selectedMonth })}
                              className="px-3 py-1 bg-brown-gradient text-cream text-[10px] font-bold rounded-lg hover:opacity-95"
                            >
                              Log Payment
                            </button>
                          ) : (
                            <span className="text-[10px] text-green-600 font-black flex items-center justify-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Disbursed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {staffList.filter(s => s.enabled === 1).length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground text-[11px] font-medium">No active employees found to generate payroll.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Payout Modal */}
            {payingSalary && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                <div className="bg-card rounded-2xl border p-5 shadow-2xl w-full max-w-sm space-y-4 text-brown-deep">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-bold text-xs">
                      Log Salary Payout (Month: {payingSalary.month})
                    </h4>
                    <button onClick={() => setPayingSalary(null)} className="text-muted-foreground hover:text-gold"><X className="h-4 w-4" /></button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between text-xs font-semibold py-1 bg-gold/5 rounded-lg px-2.5">
                      <span>Total Amount:</span>
                      <span className="font-black text-gold">₹{payingSalary.netSalary}</span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1.5">Payment Mode</span>
                      <div className="grid grid-cols-2 gap-2">
                        {["Cash", "UPI", "Card", "Bank Transfer"].map(mode => (
                          <button
                            key={mode}
                            onClick={() => setPaymentMode(mode as any)}
                            className={`p-2 rounded-xl border font-bold transition-all text-left ${
                              paymentMode === mode 
                                ? "border-gold bg-gold/5 text-gold scale-102" 
                                : "border-border/60 hover:bg-gold/5"
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Notes / Transaction Reference</span>
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="e.g. UPI txn ref number or Cash handed to employee"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handlePaySalary}
                    className="w-full py-2 bg-brown-gradient text-cream rounded-xl font-bold uppercase tracking-wider text-xs shadow hover:opacity-95"
                  >
                    Mark as Paid & log Payout
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ADD STAFF MODAL */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handleAddStaff} className="bg-card border shadow-2xl rounded-3xl w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 duration-200 text-brown-deep">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-brown-deep">Enroll New Staff Member</h3>
              <button 
                type="button" 
                onClick={() => {
                  stopCamera();
                  setShowAddStaffModal(false);
                }} 
                className="text-muted-foreground hover:text-gold"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStaff.name}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Employee Name"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Work Role / Designation</label>
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gold"
                  >
                    <option value="Manager">Manager</option>
                    <option value="Chef">Chef</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Waiter">Waiter</option>
                    <option value="Cleaner">Cleaner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="10-digit number"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Salary Wage</label>
                    <input
                      type="number"
                      required
                      value={newStaff.salary}
                      onChange={(e) => setNewStaff(prev => ({ ...prev, salary: Number(e.target.value) }))}
                      placeholder="Salary"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Salary Cycle</label>
                    <select
                      value={newStaff.salaryType}
                      onChange={(e) => setNewStaff(prev => ({ ...prev, salaryType: e.target.value as any }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                    >
                      <option value="daily">Daily wage</option>
                      <option value="monthly">Monthly Salary</option>
                    </select>
                  </div>
                </div>

                {/* Photo Identity Setup */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Identity Photo</label>
                  
                  <div className="flex flex-col items-center gap-3 p-3 border border-dashed rounded-2xl bg-muted/40">
                    {newStaff.photo ? (
                      <div className="relative h-20 w-20 rounded-xl overflow-hidden border bg-background">
                        <img src={newStaff.photo} alt="Identity preview" className="h-full w-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => setNewStaff(prev => ({ ...prev, photo: "" }))}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 text-[8px] font-black h-4 w-4 flex items-center justify-center shadow"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-xl border border-dashed flex flex-col items-center justify-center text-muted-foreground bg-background">
                        <Users className="h-6 w-6 opacity-30" />
                        <span className="text-[8px] mt-1 font-semibold">No Image</span>
                      </div>
                    )}

                    {!showCamera ? (
                      <div className="flex gap-2 text-[9px] font-bold">
                        <button 
                          type="button"
                          onClick={startCamera}
                          className="px-2 py-1 bg-gold/15 border rounded-lg hover:bg-gold/20 flex items-center gap-1"
                        >
                          <Camera className="h-3 w-3" /> Capture Webcam
                        </button>
                        <label className="px-2 py-1 bg-muted hover:bg-muted/80 border rounded-lg cursor-pointer flex items-center gap-1">
                          <Upload className="h-3 w-3" /> Upload File
                          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-28 w-36 overflow-hidden rounded-xl border bg-black">
                          <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover transform -scale-x-100" />
                        </div>
                        <div className="flex gap-1.5 text-[9px] font-bold">
                          <button 
                            type="button" 
                            onClick={capturePhoto}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm"
                          >
                            Snapshot
                          </button>
                          <button 
                            type="button" 
                            onClick={stopCamera}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-brown-gradient text-cream rounded-2xl font-bold uppercase tracking-widest text-xs shadow-md active:scale-98 transition duration-200 mt-2"
            >
              Save Employee Records
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
