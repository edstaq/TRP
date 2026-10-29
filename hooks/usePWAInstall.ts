import { useState, useEffect, useCallback } from 'react';

export interface PWAInstallState {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  hasPrompt: boolean;
  triggerInstall: () => Promise<boolean>;
  dismissLoginPrompt: (hours?: number) => void;
  shouldShowLoginPrompt: () => boolean;
}

const DISMISS_KEY = 'trp_pwa_dismissed_until';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone mode (already installed)
    const checkStandalone = () => {
      const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isNavigatorStandalone = (window.navigator as any).standalone === true;
      const isAndroidAppReferrer = document.referrer.includes('android-app://');
      return isDisplayStandalone || isNavigatorStandalone || isAndroidAppReferrer;
    };

    // Detect device OS & mobile
    const ua = navigator.userAgent || '';
    const iosDetected = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const androidDetected = /Android/i.test(ua);
    const mobileDetected = iosDetected || androidDetected || window.innerWidth <= 768 || /Mobi|Android/i.test(ua);

    const standaloneNow = checkStandalone();
    setIsStandalone(standaloneNow);
    setIsIOS(iosDetected);
    setIsAndroid(androidDetected);
    setIsMobile(mobileDetected);

    // Listen for beforeinstallprompt (Android / Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setShowLoginPrompt(false);
      setShowIOSGuide(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const shouldShowLoginPrompt = useCallback(() => {
    if (typeof window === 'undefined') return false;
    if (isStandalone) return false;
    if (!isMobile) return false; // Specifically for mobile users as requested

    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil) {
      const time = parseInt(dismissedUntil, 10);
      if (Date.now() < time) return false;
    }
    return true;
  }, [isStandalone, isMobile]);

  const dismissLoginPrompt = useCallback((hours = 24) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DISMISS_KEY, String(Date.now() + hours * 3600 * 1000));
    setShowLoginPrompt(false);
  }, []);

  const triggerInstall = useCallback(async (): Promise<boolean> => {
    if (isStandalone) {
      return true;
    }

    // Android / Chrome native prompt
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsStandalone(true);
          setShowLoginPrompt(false);
          return true;
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
      }
      return false;
    }

    // iOS Safari requires manual "Add to Home Screen" instructions
    if (isIOS) {
      setShowIOSGuide(true);
      return false;
    }

    // Fallback guide if browser doesn't support direct prompt
    setShowIOSGuide(true);
    return false;
  }, [isStandalone, deferredPrompt, isIOS]);

  return {
    isMobile,
    isIOS,
    isAndroid,
    isStandalone,
    canInstall: !isStandalone,
    hasPrompt: !!deferredPrompt,
    showIOSGuide,
    setShowIOSGuide,
    showLoginPrompt,
    setShowLoginPrompt,
    triggerInstall,
    dismissLoginPrompt,
    shouldShowLoginPrompt
  };
};
