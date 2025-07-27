import React, { useContext, useEffect } from 'react';
import { MessageContext } from '../context/AuthContext.jsx'; // Import from AuthContext.jsx

const MessageModal = () => {
  const { message, type, clearMessage } = useContext(MessageContext);

  if (!message) return null;

  let bgColor = 'bg-blue-500';
  if (type === 'success') bgColor = 'bg-green-500';
  else if (type === 'error') bgColor = 'bg-red-500';
  else if (type === 'warning') bgColor = 'bg-yellow-500';

  return (
    <div
      className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white ${bgColor} z-50 transition-transform transform ${
        message ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      role="alert"
    >
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button onClick={clearMessage} className="ml-4 text-white hover:text-gray-200">
          &times;
        </button>
      </div>
    </div>
  );
};

export default MessageModal;