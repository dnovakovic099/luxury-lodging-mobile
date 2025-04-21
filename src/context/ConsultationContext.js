import React, { createContext, useState, useContext, useEffect } from 'react';
import {authenticateUser, requestRevenueCalculation, uploadMessage} from '../services/api';
import {useAuth} from './AuthContext';

const ConsultationContext = createContext(null);

export function useConsultation() {
  const context = useContext(ConsultationContext);
  if (!context) {
    throw new Error('ConsultationContext must be used within a ConsultationContext');
  }
  return context;
}


export const ConsultationProvider = ({ children }) => {
  const [message, setMessage] = useState(null);
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [complete, setComplete] = React.useState(false);

  useEffect(() => {
    if(complete) {
      setTimeout(() => {
        setComplete(false)
      }, 4000)
    }
  }, [complete])

  const sendMessage = async () => {
    const token = await  getToken();
    try {
      uploadMessage(message, token).then(res => {
        setComplete(true)
        setIsLoading(false);
        setMessage(null);
      })

    } catch (error) {
      console.error('Error during sign in:', error);
      throw error;
    }
  };
return <ConsultationContext.Provider value={{
  message,
  sendMessage,
  setMessage,
  isLoading,
  complete,
}}>
  {children}
</ConsultationContext.Provider>
}
