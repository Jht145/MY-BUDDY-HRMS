import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddEmployeeModal({ isOpen, onClose, onSuccess }: AddEmployeeModalProps) {
  const [formData, setFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(data.message || data.detail?.message || 'Failed to add employee');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-[var(--card)] rounded-xl overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-[var(--card-border)]">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-500" />
            Add New Employee
          </h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--foreground)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="text-xs text-red-500 font-bold bg-red-500/10 p-2 rounded">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">First Name</label>
              <input required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Last Name</label>
              <input required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-sm outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Employee ID</label>
            <input required value={formData.employee_id} onChange={e => setFormData({...formData, employee_id: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-sm outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Email</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-sm outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Password</label>
            <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-sm outline-none" placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special" />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Role</label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-sm outline-none">
              <option value="EMPLOYEE">Employee</option>
              <option value="HR_ADMIN">HR Admin</option>
            </select>
          </div>

          <div className="pt-2">
            <button disabled={loading} type="submit" className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors">
              {loading ? 'Adding...' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
