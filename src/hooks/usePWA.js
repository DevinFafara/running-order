import { useState, useEffect } from 'react';

/**
 * Hook pour gérer l'installation de la PWA
 * Gère l'évènement beforeinstallprompt et détecte si l'app est déjà installée
 */
export const usePWA = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Détecter si l'app est déjà ouverte en mode "standalone" (installée)
        const checkInstalled = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                               window.navigator.standalone === true ||
                               document.referrer.includes('android-app://');
            setIsInstalled(isStandalone);
        };

        checkInstalled();

        const handleBeforeInstallPrompt = (e) => {
            // Empêcher l'affichage automatique du prompt par le navigateur
            e.preventDefault();
            // Stocker l'évènement pour plus tard
            setDeferredPrompt(e);
        };

        const handleAppInstalled = () => {
            console.log('Vroom! App installée 🤘');
            setDeferredPrompt(null);
            setIsInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const installApp = async () => {
        if (!deferredPrompt) {
            // Fallback : Si pas de prompt (iOS ou criteria non remplis),
            // on peut soit renvoyer false pour que le composant gère l'affichage,
            // soit lever une alerte ou ouvrir un guide.
            return { success: false, platform: getPlatform() };
        }

        // Afficher le prompt d'installation
        deferredPrompt.prompt();

        // Attendre la réponse de l'utilisateur
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            return { success: true };
        }
        return { success: false };
    };

    const getPlatform = () => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
        if (/android/.test(userAgent)) return 'android';
        return 'desktop';
    };

    return {
        isInstallable: !!deferredPrompt && !isInstalled,
        isInstalled,
        installApp,
        hasPrompt: !!deferredPrompt,
        platform: getPlatform()
    };
};
