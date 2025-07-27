import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Corrected extension
import '../index.css'; // Corrected path to main CSS

// Create a React root and render the App component
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);