import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Package, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-11 h-11 rounded-xl bg-brand-500 flex items-center justify-center mb-3">
            <Package size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl font-semibold">Welcome to Invory</h1>
          <p className="text-sm text-ink-soft mt-1">Sign in to your seller dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
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
              className="input-field"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary mt-1">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Sign in
          </button>
        </form>

        <p className="text-center text-sm text-ink-soft mt-5">
          New to Invory?{' '}
          <Link to="/register" className="text-brand-600 font-medium hover:underline">
            Create a business account
          </Link>
        </p>
      </div>
    </div>
  );
}
