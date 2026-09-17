import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../css/DashboardBannerCarousel.css';

const MOCK_BANNERS = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1200&auto=format&fit=crop",
    category: "New Launch",
    title: "BPSC TRE 4.0",
    description: "Prepare smarter with full-length mock tests tailored to the latest pattern.",
    ctaLabel: "Explore Exam",
    ctaRoute: "/dashboard/exams",
    align: "left"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1200&auto=format&fit=crop",
    category: "Announcement",
    title: "New Mock Tests Added",
    description: "Practice the latest exam patterns and track your all-India ranking.",
    ctaLabel: "Start Practicing",
    ctaRoute: "/dashboard/practice",
    align: "right"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop",
    category: "Pro Tip",
    title: "Analyze Your Weaknesses",
    description: "Use our AI-driven score trend to identify which subjects need more focus.",
    ctaLabel: "View Analytics",
    ctaRoute: "/dashboard/results",
    align: "left"
  }
];

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0
  })
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset, velocity) => {
  return Math.abs(offset) * velocity;
};

export default function DashboardBannerCarousel() {
  const [[page, direction], setPage] = useState([0, 0]);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const banners = MOCK_BANNERS;
  const imageIndex = ((page % banners.length) + banners.length) % banners.length;
  const activeBanner = banners[imageIndex];

  const paginate = useCallback((newDirection) => {
    setPage([page + newDirection, newDirection]);
  }, [page]);

  useEffect(() => {
    if (banners.length <= 1) return;

    let timer;
    if (!isPaused) {
      timer = setInterval(() => {
        paginate(1);
      }, 4500);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPaused, paginate, banners.length]);

  if (!banners || banners.length === 0) return null;

  return (
    <div 
      className="dashboard-banner-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => {
        // slight delay before resuming auto-scroll
        setTimeout(() => setIsPaused(false), 2000);
      }}
    >
      <div className="banner-viewport">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={page}
            className={`banner-slide align-${activeBanner.align || 'left'}`}
            custom={direction}
            variants={prefersReducedMotion ? {
              enter: { opacity: 0 },
              center: { opacity: 1 },
              exit: { opacity: 0 }
            } : slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            drag={banners.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);

              if (swipe < -swipeConfidenceThreshold) {
                paginate(1);
              } else if (swipe > swipeConfidenceThreshold) {
                paginate(-1);
              }
            }}
          >
            <div className="banner-bg-image" style={{ backgroundImage: `url(${activeBanner.image})` }}></div>
            <div className="banner-gradient-overlay"></div>
            
            <div className="banner-content">
              {activeBanner.category && (
                <span className="banner-category">{activeBanner.category}</span>
              )}
              <h2 className="banner-title">{activeBanner.title}</h2>
              <p className="banner-desc">{activeBanner.description}</p>
              
              {activeBanner.ctaLabel && (
                <button 
                  className="banner-cta"
                  onClick={() => navigate(activeBanner.ctaRoute)}
                  aria-label={activeBanner.ctaLabel}
                >
                  {activeBanner.ctaLabel}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {banners.length > 1 && (
        <>
          <button className="banner-nav-btn prev" onClick={() => paginate(-1)} aria-label="Previous banner">
            <ChevronLeft size={20} />
          </button>
          <button className="banner-nav-btn next" onClick={() => paginate(1)} aria-label="Next banner">
            <ChevronRight size={20} />
          </button>

          <div className="banner-pagination">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`pagination-dot ${index === imageIndex ? 'active' : ''}`}
                onClick={() => {
                  setPage([page + (index - imageIndex), index - imageIndex]);
                }}
                aria-label={`Go to banner ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
