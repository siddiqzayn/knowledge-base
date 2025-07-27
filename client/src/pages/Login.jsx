import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, MessageContext } from '../context/AuthContext.jsx';
import axios from 'axios';

const Login = () => {
  const { login } = useContext(AuthContext);
  const { showMessage } = useContext(MessageContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      login(res.data.token);
      showMessage('Login successful!', 'success');
      navigate('/dashboard');
    } catch (err) {
      console.error("Login failed:", err.response?.data?.error || err.message);
      showMessage(err.response?.data?.error || 'Login failed. Please check your credentials.', 'error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Welcome Back!</h2>
        <p className="text-center text-gray-600 mb-6">Sign in to access your knowledge base.</p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="your@example.com"
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white p-3 w-full rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all duration-200 shadow-md transform hover:scale-105"
          >
            Login
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          <button
            onClick={() => navigate('/forgot-password')}
            className="text-blue-600 hover:underline font-medium"
          >
            Forgot Password?
          </button>
        </p>
        <p className="mt-3 text-center text-xs text-gray-500">
          For new user registration, please use a tool like Postman/cURL to register at <code className="bg-gray-100 p-1 rounded">http://localhost:5000/api/auth/register</code>
        </p>
      </div>
    </div>
  );
};

export default Login;