import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/DashboardBannerCarousel.css';

export const optimizeBannerImage = (url, width = 1200) => {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    if (url.includes('/image/upload/f_auto,q_auto:good,w_1080,c_limit/')) {
      return url.replace('/image/upload/f_auto,q_auto:good,w_1080,c_limit/', `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
    }
    if (url.includes('/image/upload/f_auto') || url.includes('/image/upload/q_')) {
      return url;
    }
    return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
  }
  if (url.includes('images.unsplash.com')) {
    return url.replace(/w=\d+/, `w=${width}`).replace(/q=\d+/, 'q=70');
  }
  return url;
};

const MOCK_BANNERS = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=70&w=800&auto=format&fit=crop",
    category: "New Launch",
    title: "BPSC TRE 4.0",
    description: "Prepare smarter with full-length mock tests tailored to the latest pattern.",
    ctaLabel: "Explore Exam",
    ctaRoute: "/dashboard/exams",
    align: "left"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=70&w=800&auto=format&fit=crop",
    category: "Announcement",
    title: "New Mock Tests Added",
    description: "Practice the latest exam patterns and track your all-India ranking.",
    ctaLabel: "Start Practicing",
    ctaRoute: "/dashboard/practice",
    align: "right"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=70&w=800&auto=format&fit=crop",
    category: "Pro Tip",
    title: "Analyze Your Weaknesses",
    description: "Use our AI-driven score trend to identify which subjects need more focus.",
    ctaLabel: "View Analytics",
    ctaRoute: "/dashboard/results",
    align: "left"
  }
];

export default function DashboardBannerCarousel({ previewBanners = null }) {
  const [dbBanners, setDbBanners] = useState([]);
  const [loading, setLoading] = useState(!previewBanners);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [withTransition, setWithTransition] = useState(true);
  const touchStartX = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (previewBanners) return;
    const fetchBanners = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/banners`);
        if (res.data && res.data.length > 0) {
          setDbBanners(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch banners:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, [previewBanners]);

  const rawBanners = previewBanners || (dbBanners.length > 0 ? dbBanners : MOCK_BANNERS);

  // If banners array is 2, duplicate once so infinite loop has sufficient buffer
  const carouselList = rawBanners.length === 2 
    ? [...rawBanners, ...rawBanners] 
    : rawBanners;

  // Cloned looped array: 1 before start, 1 after end
  const loopedItems = rawBanners.length > 1
    ? [carouselList[carouselList.length - 1], ...carouselList, carouselList[0]]
    : rawBanners;

  const handleNext = useCallback(() => {
    if (!withTransition) return;
    setCurrentIndex(prev => prev + 1);
  }, [withTransition]);

  const handlePrev = useCallback(() => {
    if (!withTransition) return;
    setCurrentIndex(prev => prev - 1);
  }, [withTransition]);

  // Auto-slide effect (every 4.5s)
  useEffect(() => {
    if (rawBanners.length <= 1 || isPaused || !withTransition) return;
    const timer = setInterval(() => {
      handleNext();
    }, 4500);
    return () => clearInterval(timer);
  }, [rawBanners.length, isPaused, withTransition, handleNext]);

  // Handle transition end for seamless infinite loop
  const handleTransitionEnd = () => {
    if (rawBanners.length <= 1) return;
    if (currentIndex === 0) {
      setWithTransition(false);
      setCurrentIndex(carouselList.length);
    } else if (currentIndex === carouselList.length + 1) {
      setWithTransition(false);
      setCurrentIndex(1);
    }
  };

  // Re-enable transition after seamless jump
  useEffect(() => {
    if (!withTransition) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setWithTransition(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [withTransition]);

  if (!rawBanners || rawBanners.length === 0) return null;

  // Case 1: Single banner (rendered centered, compact, and minimal)
  if (rawBanners.length === 1) {
    const banner = rawBanners[0];
    const isPureImage = !banner.title || banner.title.trim() === "";

    return (
      <div className="tp-banner-single-wrapper">
        <div 
          className="tp-banner-card single-card"
          onClick={() => { if (isPureImage && banner.ctaRoute) navigate(banner.ctaRoute); }}
          style={{ cursor: isPureImage && banner.ctaRoute ? 'pointer' : 'default' }}
        >
          <img
            src={optimizeBannerImage(banner.image, 1200)}
            alt={banner.title || banner.category || "PrepMark Banner"}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            draggable={false}
            className="tp-banner-img"
          />
          {!isPureImage && (
            <div className="tp-banner-content-overlay">
              <div className={`tp-banner-content align-${banner.align || 'left'}`}>
                {banner.category && <span className="tp-banner-category">{banner.category}</span>}
                <h2 className="tp-banner-title">{banner.title}</h2>
                {banner.description && <p className="tp-banner-desc">{banner.description}</p>}
                {banner.ctaLabel && (
                  <button 
                    className="tp-banner-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (banner.ctaRoute) navigate(banner.ctaRoute);
                    }}
                  >
                    {banner.ctaLabel}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Case 2: Multiple banners (Teaching Pariksha compact center-peeking carousel)
  const slideWidth = isMobile ? 100 : 62;
  const sidePeek = isMobile ? 0 : 19;
  const gap = isMobile ? 0 : 16;
  const transformX = `calc(${sidePeek}% - (${currentIndex} * ${slideWidth}% + ${currentIndex * gap}px))`;
  const activeDotIndex = ((currentIndex - 1) % rawBanners.length + rawBanners.length) % rawBanners.length;

  return (
    <div 
      className="tp-banner-carousel-root"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
        setIsPaused(true);
      }}
      onTouchEnd={(e) => {
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (diff < -45) {
          handleNext();
        } else if (diff > 45) {
          handlePrev();
        }
        setTimeout(() => setIsPaused(false), 2000);
      }}
    >
      <div className="tp-carousel-viewport">
        <div 
          className="tp-carousel-track"
          onTransitionEnd={handleTransitionEnd}
          style={{
            transform: `translateX(${transformX})`,
            transition: withTransition ? 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
          }}
        >
          {loopedItems.map((banner, index) => {
            const isActive = index === currentIndex;
            const isPureImage = !banner.title || banner.title.trim() === "";

            return (
              <div
                key={`${banner._id || banner.id || index}-${index}`}
                className={`tp-banner-slide ${isActive ? 'is-active' : 'is-peek'}`}
                onClick={() => {
                  if (index < currentIndex) {
                    handlePrev();
                  } else if (index > currentIndex) {
                    handleNext();
                  } else if (isPureImage && banner.ctaRoute) {
                    navigate(banner.ctaRoute);
                  }
                }}
              >
                <img
                  src={optimizeBannerImage(banner.image, 1200)}
                  alt={banner.title || banner.category || "PrepMark Banner"}
                  fetchPriority={isActive ? "high" : "auto"}
                  loading={isActive ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  className="tp-banner-img"
                />

                {!isPureImage && (
                  <div className="tp-banner-content-overlay">
                    <div className={`tp-banner-content align-${banner.align || 'left'}`}>
                      {banner.category && <span className="tp-banner-category">{banner.category}</span>}
                      <h2 className="tp-banner-title">{banner.title}</h2>
                      {banner.description && <p className="tp-banner-desc">{banner.description}</p>}
                      {banner.ctaLabel && (
                        <button 
                          className="tp-banner-cta"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (banner.ctaRoute) navigate(banner.ctaRoute);
                          }}
                        >
                          {banner.ctaLabel}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button 
        className="tp-banner-nav-btn prev"
        onClick={handlePrev}
        aria-label="Previous banner"
      >
        <ChevronLeft size={22} />
      </button>

      <button 
        className="tp-banner-nav-btn next"
        onClick={handleNext}
        aria-label="Next banner"
      >
        <ChevronRight size={22} />
      </button>

      {/* Pagination Dots */}
      <div className="tp-banner-pagination">
        {rawBanners.map((_, dotIdx) => (
          <button
            key={dotIdx}
            className={`tp-pagination-dot ${dotIdx === activeDotIndex ? 'is-active' : ''}`}
            onClick={() => {
              setWithTransition(true);
              setCurrentIndex(dotIdx + 1);
            }}
            aria-label={`Go to banner ${dotIdx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
