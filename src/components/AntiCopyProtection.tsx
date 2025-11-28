'use client';

import { useEffect } from 'react';

export function AntiCopyProtection() {
  useEffect(() => {
    // Disable right-click context menu
    const disableRightClick = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable text selection
    const disableTextSelection = () => {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      (document.body.style as any).mozUserSelect = 'none';
      (document.body.style as any).msUserSelect = 'none';
    };

    // Disable keyboard shortcuts
    const disableKeyboardShortcuts = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S, Ctrl+A, Ctrl+P
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U')) ||
        (e.ctrlKey && (e.key === 's' || e.key === 'S')) ||
        (e.ctrlKey && (e.key === 'a' || e.key === 'A')) ||
        (e.ctrlKey && (e.key === 'p' || e.key === 'P'))
      ) {
        e.preventDefault();
        return false;
      }
    };

    // Detect DevTools opening
    const detectDevTools = () => {
      const threshold = 160;
      const devtools = {
        open: false,
        orientation: null as 'vertical' | 'horizontal' | null
      };

      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;

      if (heightThreshold) {
        devtools.open = true;
        devtools.orientation = 'horizontal';
      }

      if (widthThreshold) {
        devtools.open = true;
        devtools.orientation = 'vertical';
      }

      if (devtools.open) {
        console.clear();
        document.body.innerHTML = `
          <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #000;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
            z-index: 999999;
          ">
            <div style="text-align: center;">
              <h1>🔒 Developer Tools Detected</h1>
              <p>This content is protected. Please close developer tools to continue.</p>
              <button onclick="location.reload()" style="
                padding: 10px 20px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 20px;
              ">Reload Page</button>
            </div>
          </div>
        `;
      }
    };

    // Obfuscate console
    const obfuscateConsole = () => {
      // Override console methods
      const noop = () => {};
      console.log = noop;
      console.warn = noop;
      console.error = noop;
      console.info = noop;
      console.debug = noop;
      console.trace = noop;
      
      // Add fake console messages to confuse scrapers
      setTimeout(() => {
        console.log('Honeypot: API endpoint discovered at /api/fake-endpoint');
        console.log('Honeypot: Admin token: fake-token-12345');
      }, 1000);
    };

    // Add watermark to all images
    const addImageWatermarks = () => {
      const images = document.querySelectorAll('img');
      images.forEach((img) => {
        if (!img.dataset.watermarked) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            // Draw original image
            ctx?.drawImage(img, 0, 0);
            
            // Add watermark
            if (ctx) {
              ctx.font = '20px Arial';
              ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
              ctx.fillText('© MOQ Pools', canvas.width - 150, canvas.height - 30);
              
              // Replace image src with watermarked version
              img.src = canvas.toDataURL();
              img.dataset.watermarked = 'true';
            }
          };
        }
      });
    };

    // Disable drag and drop
    const disableDragDrop = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Blur content when window loses focus (screenshot protection)
    const blurOnFocusLoss = () => {
      document.body.style.filter = 'blur(5px)';
      document.body.style.pointerEvents = 'none';
    };

    const unblurOnFocus = () => {
      document.body.style.filter = 'none';
      document.body.style.pointerEvents = 'auto';
    };

    // Apply protections
    document.addEventListener('contextmenu', disableRightClick);
    document.addEventListener('keydown', disableKeyboardShortcuts);
    document.addEventListener('dragstart', disableDragDrop);
    window.addEventListener('blur', blurOnFocusLoss);
    window.addEventListener('focus', unblurOnFocus);
    
    disableTextSelection();
    obfuscateConsole();

    // Periodic checks
    const devToolsInterval = setInterval(detectDevTools, 500);
    const watermarkInterval = setInterval(addImageWatermarks, 2000);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', disableRightClick);
      document.removeEventListener('keydown', disableKeyboardShortcuts);
      document.removeEventListener('dragstart', disableDragDrop);
      window.removeEventListener('blur', blurOnFocusLoss);
      window.removeEventListener('focus', unblurOnFocus);
      
      clearInterval(devToolsInterval);
      clearInterval(watermarkInterval);
      
      // Re-enable text selection
      document.body.style.userSelect = 'auto';
      document.body.style.webkitUserSelect = 'auto';
      (document.body.style as any).mozUserSelect = 'auto';
      (document.body.style as any).msUserSelect = 'auto';
    };
  }, []);

  return null;
}