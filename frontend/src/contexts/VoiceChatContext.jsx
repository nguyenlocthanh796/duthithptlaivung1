import React, { createContext, useContext, useState, useCallback } from 'react';

const VoiceChatContext = createContext(null);

export const VoiceChatProvider = ({ children }) => {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  const startVoiceChat = useCallback(() => {
    setIsVoiceActive(true);
  }, []);

  const stopVoiceChat = useCallback(() => {
    setIsVoiceActive(false);
    setIsRecording(false);
    setTranscript('');
    setAudioLevel(0);
  }, []);

  const toggleRecording = useCallback((recording) => {
    setIsRecording(recording);
  }, []);

  const openPopup = useCallback(() => {
    setIsPopupOpen(true);
  }, []);

  const closePopup = useCallback(() => {
    setIsPopupOpen(false);
  }, []);

  return (
    <VoiceChatContext.Provider
      value={{
        isVoiceActive,
        isRecording,
        isPopupOpen,
        transcript,
        audioLevel,
        startVoiceChat,
        stopVoiceChat,
        toggleRecording,
        openPopup,
        closePopup,
        setTranscript,
        setAudioLevel,
      }}
    >
      {children}
    </VoiceChatContext.Provider>
  );
};

export const useVoiceChat = () => {
  const context = useContext(VoiceChatContext);
  if (!context) {
    throw new Error('useVoiceChat must be used within VoiceChatProvider');
  }
  return context;
};

