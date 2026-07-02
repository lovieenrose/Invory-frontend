import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../api/services';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ businessName: '', fullName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.register(form);
      await login(form.email, form.password);
      toast.success('Business account created!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-11 h-11 rounded-xl bg-brand-500 flex items-center justify-center mb-3">
            <Package size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl font-semibold">Set up your business</h1>
          <p className="text-sm text-ink-soft mt-1 text-center">Start organizing your inventory, sales, and finances</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">Business name</label>
            <input
              required
              className="input-field"
              placeholder="e.g. Aria's Craft Supplies"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">Your name</label>
            <input
              className="input-field"
              placeholder="Full name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">Email</label>
            <input
              type="email"
              required
              className="input-field"
              placeholder="you@business.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="input-field"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary mt-1">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Create account
          </button>
        </form>

        <p className="text-center text-sm text-ink-soft mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
