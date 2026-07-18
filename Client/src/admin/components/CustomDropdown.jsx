import React, { useState, useRef, useEffect } from 'react';

const CustomDropdown = ({ options, value, onChange, name }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="relative inline-block w-full text-left font-sans" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between w-full px-4 py-2.5 text-[15px] font-normal transition-colors duration-200 border rounded-[8px] focus:outline-none"
        style={{
          background: 'var(--bg-panel)',
          borderColor: isOpen ? 'var(--violet)' : 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
      >
        <span>{selectedOption ? selectedOption.label : 'Select...'}</span>
        <svg
          className={`w-4 h-4 ml-1.5 -mr-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 origin-top-right rounded-lg shadow-lg border border-gray-700 overflow-hidden" style={{ backgroundColor: '#1e2028' }}>
          <ul className="p-2 text-sm font-medium text-gray-300">
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    const syntheticEvent = {
                      target: {
                        name: name,
                        value: option.value
                      }
                    };
                    onChange(syntheticEvent);
                    setIsOpen(false);
                  }}
                  className={`inline-flex items-center w-full p-2 rounded transition-colors duration-150 ${
                    value === option.value 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-700 hover:text-white text-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
