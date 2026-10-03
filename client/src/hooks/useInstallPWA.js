import { useState, useEffect } from 'react';

export function useInstallPWA() {
  const [prompt, setPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (isInstalled) return;

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    const installedHandler = () => {
      setIsInstalled(true);
      setPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [isInstalled]);

  const install = async () => {
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') setPrompt(null);
      return;
    }
    // No native prompt — show manual instructions
    setShowInstructions(true);
  };

  const dismissInstructions = () => setShowInstructions(false);

  return {
    isInstalled,
    hasNativePrompt: !!prompt,
    showInstructions,
    dismissInstructions,
    install,
  };
}
