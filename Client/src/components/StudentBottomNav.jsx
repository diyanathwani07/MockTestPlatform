import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Target, ClipboardList, FilePlus, LineChart } from "lucide-react";
import "../css/StudentBottomNav.css";

const StudentBottomNav = () => {
  const renderIcon = (icon, label, isActive) => {
    const IconComponent = icon;
    if (isActive) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div 
            className="flex justify-center items-center rounded-full border shadow-sm w-8 h-8 relative overflow-hidden"
            style={{ borderColor: 'var(--primary)', backgroundColor: 'transparent' }}
          >
            {/* Background tint based on theme primary color */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundColor: 'var(--primary)' }}></div>
            {/* Gradient overlay for glossy effect */}
            <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: 'linear-gradient(to bottom, var(--primary), transparent)' }}></div>
            
            <IconComponent size={16} className="text-white relative z-10" />
          </div>
          <div className="flex flex-col items-center mt-[2px]">
             <span className="text-[9px] text-white font-medium leading-none tracking-wide">{label}</span>
             <div 
               className="rounded-full w-1 h-1 mt-1" 
               style={{ backgroundColor: 'var(--primary)', boxShadow: '0 0 4px 1px var(--primary)' }}
             ></div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col justify-center items-center h-full opacity-70">
        <div className="flex justify-center items-center w-8 h-8">
          <IconComponent size={20} className="text-[#8D8D93]" />
        </div>
        <div className="flex flex-col items-center mt-[2px]">
           <span className="text-[9px] text-[#8D8D93] font-medium leading-none tracking-wide">{label}</span>
           <div className="w-1 h-1 mt-1 opacity-0"></div>
        </div>
      </div>
    );
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-[999] select-none" style={{ height: 'calc(75px + env(safe-area-inset-bottom))' }}>
      
      {/* Safe Area Fill for iOS */}
      <div className="absolute bottom-0 left-0 w-full bg-[#0F1012]" style={{ height: 'env(safe-area-inset-bottom)' }}></div>

      {/* --- Seamless Edge Fillers for screens wider than 390px --- */}
      {/* Left Filler */}
      <div 
        className="absolute left-0 h-[53px] pointer-events-none z-0"
        style={{ 
           width: 'calc(50vw - 194px)', /* 195px half, overlap slightly to prevent gap */
           bottom: 'env(safe-area-inset-bottom)',
           background: 'linear-gradient(180deg, #2A303E 0%, #0F1012 100%)',
           boxShadow: 'inset 0 1px 10px 0 rgba(0,0,0,0.1)'
        }}
      >
        <div className="absolute top-0 left-0 w-full h-[1px] bg-white opacity-[0.08]"></div>
        <div className="absolute top-0 left-0 w-full h-[1px]" style={{ backgroundColor: 'var(--primary)', opacity: 0.1 }}></div>
      </div>
      
      {/* Right Filler */}
      <div 
        className="absolute right-0 h-[53px] pointer-events-none z-0"
        style={{ 
           width: 'calc(50vw - 194px)',
           bottom: 'env(safe-area-inset-bottom)',
           background: 'linear-gradient(180deg, #2A303E 0%, #0F1012 100%)',
           boxShadow: 'inset 0 1px 10px 0 rgba(0,0,0,0.1)'
        }}
      >
        <div className="absolute top-0 left-0 w-full h-[1px] bg-white opacity-[0.08]"></div>
        <div className="absolute top-0 left-0 w-full h-[1px]" style={{ backgroundColor: 'var(--primary)', opacity: 0.1 }}></div>
      </div>


      {/* Background SVG Wrapper (Fixed 390px width so the curve NEVER stretches horizontally) */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 w-[390px] h-[75px] pointer-events-none z-0"
        style={{ bottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Background SVG 1 - Theme Glow Stroke */}
        <svg
          viewBox="0 0 390 85"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full absolute left-0"
          preserveAspectRatio="none"
        >
          <path
            d="M0.127414 41.0584C-1.80969 31.9455 1.23036 22.4887 8.11488 16.2117C11.9519 12.7132 16.7405 10.4318 21.8747 9.65612L76.6032 1.38779C81.1953 0.694025 85.8308 0.327558 90.4748 0.291162L127.438 0.00147879C140.179 -0.0983762 152.539 4.82113 161.779 13.5941C180.692 31.5502 210.556 31.6483 229.38 13.5995C238.577 4.78147 250.855 -0.0929896 263.596 0.0163236L302 0.345825L360.427 7.88484C362.804 8.19144 365.144 8.72731 367.417 9.48495C386.42 15.819 396.973 36.0836 391.268 55.2843L389.925 59.8046C384.631 77.6253 368.252 85 349.661 85H209.999H195.749H181.974H48.5098C26.3463 85 7.20278 74.3438 2.59452 52.6647L0.127414 41.0584Z"
            fill="var(--primary)"
            fillOpacity="0.1"
            style={{ mixBlendMode: 'overlay' }}
          />
          <path
            d="M127.441 0.501099C140.052 0.402267 152.288 5.27251 161.436 13.9572C180.539 32.0944 210.707 32.1958 229.726 13.9601C238.828 5.23238 250.982 0.408532 263.592 0.516724L301.963 0.844849L360.363 8.38098C362.707 8.68343 365.017 9.21176 367.259 9.95911C386.005 16.2079 396.417 36.1997 390.789 55.1417L389.446 59.6622C384.215 77.2707 368.03 84.5 349.661 84.5H48.5098C26.5824 84.5 7.64316 74.0089 3.08398 52.5607L0.616211 40.9542C-1.28385 32.015 1.69889 22.7386 8.45215 16.5812C12.216 13.1495 16.913 10.9114 21.9492 10.1505L76.6777 1.88196C81.2463 1.19175 85.8583 0.827358 90.4785 0.791138L127.441 0.501099Z"
            stroke="url(#paint0_linear_38_51_nav)"
            strokeOpacity="0.2"
            style={{ mixBlendMode: 'overlay' }}
          />
          <defs>
            <linearGradient id="paint0_linear_38_51_nav" x1="194.75" y1="0" x2="194.75" y2="85" gradientUnits="userSpaceOnUse">
              <stop stopColor="white" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Background SVG 2 - Main Gradient Fill */}
        <svg
          viewBox="0 0 390 85"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full absolute left-0 shadow-[0_1px_10px_0_rgba(0,0,0,0.10)_inset]"
          preserveAspectRatio="none"
        >
          <path
            d="M0 25C0 11.1929 11.1929 0 25 0H133.639C140.352 0 146.871 2.25153 152.153 6.3944L188.798 35.1358C192.436 37.9888 197.555 37.9765 201.179 35.1061L237.315 6.48335C242.616 2.28464 249.18 0 255.942 0H365C378.807 0 390 11.1929 390 25V60C390 73.8071 378.807 85 365 85H300H218.234C213.067 85 208.218 82.5045 205.214 78.2998L201.621 73.2692C198.399 68.7585 191.677 68.8121 188.528 73.3735L185.27 78.091C182.283 82.4173 177.361 85 172.104 85H25C11.1929 85 0 73.8071 0 60V25Z"
            fill="url(#paint0_linear_40_54_nav)"
          />
          <defs>
            <linearGradient id="paint0_linear_40_54_nav" x1="195" y1="0" x2="195" y2="85" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2A303E" />
              <stop offset="1" stopColor="#0F1012" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Floating Center Button & Theme Glow Spread */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none z-10"
        style={{ bottom: 'calc(38px + env(safe-area-inset-bottom))' }}
      >
        {/* Wide Theme Glow spread beautifully across the notch */}
        <div 
          className="absolute pointer-events-none"
          style={{ 
            top: '-5px', 
            width: '260px', 
            height: '110px',
            background: 'radial-gradient(ellipse at center, var(--primary) 0%, transparent 60%)',
            opacity: 0.35,
            filter: 'blur(12px)',
          }}
        ></div>

        {/* Pin Shape Link */}
        <NavLink 
          to="/dashboard/exams"
          className={({ isActive }) => `relative w-[56px] h-[61px] flex justify-center items-center pointer-events-auto transition-transform active:scale-95 ${isActive ? 'scale-105' : ''}`}
        >
          {/* Main Pin Shape */}
          <svg
            width="56"
            height="61"
            viewBox="0 0 56 61"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0 w-full h-full drop-shadow-lg"
          >
            <path
              d="M25.3808 59.859C26.5164 61.4131 28.8358 61.4131 29.9714 59.859L45.9519 37.991C56.8811 23.0353 46.1996 2 27.6761 2C9.15261 2 -1.52887 23.0353 9.4003 37.991L25.3808 59.859Z"
              fill="url(#paint0_linear_40_67_nav)"
            />
            <defs>
              <linearGradient id="paint0_linear_40_67_nav" x1="29.0992" y1="-23" x2="28.1606" y2="78.9895" gradientUnits="userSpaceOnUse">
                <stop stopColor="var(--primary)" />
                <stop offset="1" stopColor="var(--primary)" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Inner Light Reflection Path */}
          <svg
            width="42"
            height="54"
            viewBox="0 0 42 54"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute top-[2px] left-[7px] w-[42px] h-[54px]"
          >
            <path
              d="M18.593 52.7837C19.629 54.2014 21.7449 54.2014 22.7809 52.7837L37.3596 32.8339C47.3301 19.1901 37.5856 -1.14441e-05 20.687 -1.14441e-05C3.78833 -1.14441e-05 -5.95617 19.1901 4.01431 32.8339L18.593 52.7837Z"
              fill="url(#paint0_linear_40_58_nav)"
            />
            <defs>
              <linearGradient id="paint0_linear_40_58_nav" x1="21.129" y1="-0.0465391" x2="21.129" y2="70.2361" gradientUnits="userSpaceOnUse">
                <stop stopColor="white" stopOpacity="0.4" />
                <stop offset="1" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Exam Icon */}
          <ClipboardList size={22} className="text-white relative z-10 -top-[2px]" strokeWidth={2.5} />
        </NavLink>
      </div>

      {/* Nav Items Container (Height 53px wraps exactly the flat part of the updated SVG and perfectly centers items) */}
      <div 
        className="absolute left-0 w-full h-[53px] flex px-1"
        style={{ bottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Left Side Items */}
        <div className="flex-[0.43] flex justify-around items-center h-full">
          <NavLink 
            to="/dashboard"
            end
            className="relative z-10 flex flex-col items-center justify-center w-full h-full transition-transform active:scale-95"
          >
            {({ isActive }) => renderIcon(Home, "Dashboard", isActive)}
          </NavLink>
          <NavLink 
            to="/dashboard/practice"
            className="relative z-10 flex flex-col items-center justify-center w-full h-full transition-transform active:scale-95"
          >
            {({ isActive }) => renderIcon(Target, "Practice", isActive)}
          </NavLink>
        </div>
        
        {/* Spacer for center notch */}
        <div className="flex-[0.14]"></div>

        {/* Right Side Items */}
        <div className="flex-[0.43] flex justify-around items-center h-full">
          <NavLink 
            to="/dashboard/create-custom-quiz"
            className="relative z-10 flex flex-col items-center justify-center w-full h-full transition-transform active:scale-95"
          >
            {({ isActive }) => renderIcon(FilePlus, "Custom Test", isActive)}
          </NavLink>
          <NavLink 
            to="/dashboard/results"
            className="relative z-10 flex flex-col items-center justify-center w-full h-full transition-transform active:scale-95"
          >
            {({ isActive }) => renderIcon(LineChart, "Results", isActive)}
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default StudentBottomNav;
