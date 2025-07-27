import React, { useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MessageContext } from '../context/AuthContext.jsx';

const ResetPassword = () => {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showMessage } = useContext(MessageContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (newPassword !== confirmPassword) {
      showMessage('Passwords do not match.', 'error');
      setLoading(false);
      return;
    }
    if (newPassword.length < 6) {
      showMessage('Password must be at least 6 characters long.', 'error');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`http://localhost:5000/api/auth/reset-password/${token}`, { newPassword });
      showMessage(res.data.message, 'success');
      // Redirect to login page after successful reset
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      console.error("Password reset failed:", err.response?.data?.error || err.message);
      showMessage(err.response?.data?.error || 'Failed to reset password. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Reset Your Password</h2>
        <p className="text-center text-gray-600 mb-6">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              id="newPassword"
              placeholder="••••••••"
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="••••••••"
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white p-3 w-full rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all duration-200 shadow-md transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;