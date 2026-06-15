/**
 * BannerCarousel
 * Fetches active announcements from GET /api/banners/active and renders
 * a sliding carousel.  Auto-advances every 6 seconds.  Hidden when empty.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';
import api from '../../services/apiClient';

const BACKEND = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
const resolveUrl = (url) => (!url || url.startsWith('http') ? url : `${BACKEND}${url}`);

const BannerCarousel = () => {
  const [banners, setBanners]   = useState([]);
  const [current, setCurrent]   = useState(0);
  const [visible, setVisible]   = useState(true);
  const [paused, setPaused]     = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    api.get('/banners/active')
      .then(r => {
        const list = r.data?.data || [];
        setBanners(list);
      })
      .catch(() => {}); // silently skip if table missing
  }, []);

  const next = useCallback(() => {
    setCurrent(c => (c + 1) % banners.length);
  }, [banners.length]);

  const prev = () => {
    setCurrent(c => (c - 1 + banners.length) % banners.length);
  };

  // Auto-advance
  useEffect(() => {
    if (!banners.length || paused) return;
    timerRef.current = setInterval(next, 6000);
    return () => clearInterval(timerRef.current);
  }, [banners.length, paused, next]);

  if (!banners.length || !visible) return null;

  const b = banners[current];
  const bg      = b.bg_color    || '#1e40af';
  const textCol = b.text_color  || '#ffffff';

  return (
    <div
      className="relative rounded-xl overflow-hidden shadow-sm mb-4 select-none"
      style={{ backgroundColor: bg, color: textCol }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Image layer (behind text) */}
      {b.image_url && (
        <div className="absolute inset-0">
          <img
            src={resolveUrl(b.image_url)}
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
        </div>
      )}

      {/* Content */}
      <div className="relative flex items-center gap-4 px-5 py-4 min-h-[72px]">
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{b.title}</p>
          {b.description && (
            <p className="text-xs mt-0.5 opacity-80 line-clamp-2">{b.description}</p>
          )}
        </div>

        {/* CTA */}
        {b.link_url && (
          <a
            href={b.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold shrink-0 px-3 py-1.5 rounded-lg
              bg-white/20 hover:bg-white/30 transition-colors"
            style={{ color: textCol }}
          >
            {b.link_text || 'Learn more'}
            <ExternalLink size={11} />
          </a>
        )}

        {/* Navigation */}
        {banners.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={prev}
              className="p-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={next}
              className="p-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Dismiss */}
        <button
          onClick={() => setVisible(false)}
          className="p-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors shrink-0"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                backgroundColor: textCol,
                opacity: i === current ? 1 : 0.4,
                width: i === current ? '20px' : '6px',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;
