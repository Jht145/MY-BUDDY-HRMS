import re
import os

path = "src/components/dashboard/MainDashboardTab.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

state_add = """  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  
  const fetchAdminData = async () => {
    if (!user || user.role !== 'HR_ADMIN') return;
    try {
      const token = localStorage.getItem('my_buddy_hrms_jwt_v4');
      const headers = { 'Authorization': Bearer  };
      
      const leavesRes = await fetch('http://localhost:8000/api/v1/leaves/admin/queue', { headers });
      const leavesData = await leavesRes.json();
      if (leavesData.success) {
        setLeaveRequests(leavesData.queue.map((l: any) => ({
          id: String(l.leave_id),
          name: l.employee_name,
          empId: l.employee_id || 'N/A',
          department: l.department || 'N/A',
          email: '',
          type: l.leave_type,
          dates: \\ - \\,
          days: l.total_days,
          reason: l.leave_reason
        })));
      }

      const flaggedRes = await fetch('http://localhost:8000/api/v1/attendance/admin/flagged', { headers });
      const flaggedData = await flaggedRes.json();
      if (flaggedData.success) {
        setFlaggedLogs(flaggedData.flagged_logs.map((f: any) => ({
          id: String(f.attendance_id),
          name: f.employee_name || 'Employee',
          time: new Date(f.check_in_time).toLocaleTimeString(),
          note: f.admin_comment || 'Outside Geofence',
          coordinates: \\, \\,
          empId: f.employee_id || 'N/A',
          department: f.department || 'N/A',
          photo: f.check_in_photo_url
        })));
      }
    } catch (e) { }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user]);

"""

content = re.sub(r'  const leaveRequests: LeaveRequest\[\] = \[.*?\];\n', '', content, flags=re.DOTALL)
content = re.sub(r'  // Load local storage flagged check-ins on mount & kiosk update.*?  };\n', '', content, flags=re.DOTALL)
content = content.replace("  useEffect(() => {\n    loadFlaggedLogs();", state_add + "  useEffect(() => {\n")

new_handle_leave = """const handleApproveLeave = async () => {
    if (!selectedLeave) return;
    try {
      const token = localStorage.getItem('my_buddy_hrms_jwt_v4');
      await fetch(http://localhost:8000/api/v1/leaves/admin/review/, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': Bearer  },
        body: JSON.stringify({ action: 'APPROVE', admin_comment: 'Approved by admin' })
      });
      setApprovedRequests([...approvedRequests, selectedLeave.id]);
      setSelectedLeave(null);
    } catch (e) {}
  }"""
content = re.sub(r'const handleApproveLeave = \(\) => \{.*?\}', new_handle_leave, content, flags=re.DOTALL)

new_handle_reject_leave = """const handleRejectLeave = async () => {
    if (!selectedLeave) return;
    try {
      const token = localStorage.getItem('my_buddy_hrms_jwt_v4');
      await fetch(http://localhost:8000/api/v1/leaves/admin/review/, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': Bearer  },
        body: JSON.stringify({ action: 'REJECT', admin_comment: 'Rejected by admin' })
      });
      setRejectedRequests([...rejectedRequests, selectedLeave.id]);
      setSelectedLeave(null);
    } catch (e) {}
  }"""
content = re.sub(r'const handleRejectLeave = \(\) => \{.*?\}', new_handle_reject_leave, content, flags=re.DOTALL)

new_handle_verify = """const handleVerifyCheckin = async (action: 'approve' | 'reject') => {
    if (!selectedFlagged) return;
    try {
      const token = localStorage.getItem('my_buddy_hrms_jwt_v4');
      // @ts-ignore
      await fetch(http://localhost:8000/api/v1/attendance/admin/verify/, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': Bearer  },
        body: JSON.stringify({ action: action.toUpperCase(), admin_comment: Admin  })
      });
      if (action === 'approve') {
        setReviewedCheckins([...reviewedCheckins, selectedFlagged.name]);
      } else {
        setRejectedCheckins([...rejectedCheckins, selectedFlagged.name]);
      }
      setSelectedFlagged(null);
    } catch (e) {}
  }"""
content = re.sub(r'const handleVerifyCheckin = \(action: \'approve\' \| \'reject\'\) => \{.*?\}', new_handle_verify, content, flags=re.DOTALL)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated MainDashboardTab.tsx")
