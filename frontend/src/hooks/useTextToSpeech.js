import { useRef, useEffect } from 'react';

export const useTextToSpeech = () => {
  const synthesisRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthesisRef.current = window.speechSynthesis;
    }

    return () => {
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  const speak = (text) => {
    if (!synthesisRef.current) return;

    synthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    synthesisRef.current.speak(utterance);
  };

  const stop = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
    }
  };

  return { speak, stop, synthesisRef };
};

