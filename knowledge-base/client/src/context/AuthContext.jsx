import React, { createContext, useState, useEffect } from 'react';

// Create a context for authentication state and functions
export const AuthContext = createContext();

// Create a context for global messages (replacing alert())
export const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
  const [message, setMessage] = useState(null);
  const [type, setType] = useState('info'); // 'info', 'success', 'error', 'warning'

  const showMessage = (msg, msgType = 'info', duration = 3000) => {
    setMessage(msg);
    setType(msgType);
    if (duration > 0) {
      setTimeout(() => {
        setMessage(null);
      }, duration);
    }
  };

  const clearMessage = () => {
    setMessage(null);
  };

  return (
    <MessageContext.Provider value={{ message, type, showMessage, clearMessage }}>
      {children}
    </MessageContext.Provider>
  );
};


export const AuthContextProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null); // Stores decoded user info (id, email)
  const [isAuthReady, setIsAuthReady] = useState(false); // Indicates if auth state has been checked

  // Function to decode JWT token
  const decodeToken = (jwtToken) => {
    try {
      if (!jwtToken) return null;
      const base64Url = jwtToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("Failed to decode token:", e);
      return null;
    }
  };

  // Effect to parse token and set user info when token changes or on initial load
  useEffect(() => {
    if (token) {
      const decodedUser = decodeToken(token);
      if (decodedUser && decodedUser.exp * 1000 > Date.now()) { // Check if token is expired
        setUser(decodedUser);
      } else {
        // Token expired or invalid, clear it
        setToken(null);
        localStorage.removeItem('token');
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsAuthReady(true); // Auth state has been checked
  }, [token]);

  const login = (jwt) => {
    localStorage.setItem('token', jwt);
    setToken(jwt);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <MessageProvider> {/* Wrap children with MessageProvider */}
      <AuthContext.Provider value={{ token, login, logout, user, isAuthReady }}>
        {children}
      </AuthContext.Provider>
    </MessageProvider>
  );
};