import { useEffect, useRef, useState } from 'react';

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
}

/** Read site key from runtime injection (production) or Vite env (dev) */
function getSiteKey(): string {
  return window.__TURNSTILE_SITE_KEY__ || import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
}

export default function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [siteKey] = useState(getSiteKey);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const tryRender = () => {
      if (!window.turnstile || !containerRef.current) return;
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'dark',
        callback: (token: string) => onToken(token),
      });
    };

    if (window.turnstile) {
      tryRender();
    } else {
      interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval!);
          interval = null;
          tryRender();
        }
      }, 200);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="mt-3" />;
}
