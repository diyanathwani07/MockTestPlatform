import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';

export default function RefundPolicy() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('policy');

  const sections = [
    { id: 'policy', title: 'Refund Policy' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      let current = 'policy';
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && window.scrollY >= element.offsetTop - 100) {
          current = section.id;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page, #0f0f13)', color: 'var(--text-primary, #ffffff)' }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid var(--border-color, #2d2d30)' }}>
        <Logo size="normal" />
        <ThemeToggle />
      </div>
      {/* Header Area */}
      <div style={{ padding: '40px 20px 20px', maxWidth: '1400px', margin: '0' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '24px', fontSize: '16px', fontWeight: '600' }}
        >
          <ArrowLeft size={20} /> Back
        </button>
        <h1 style={{ textAlign: 'center', paddingLeft: '320px',  fontSize: '32px', marginBottom: '8px', color: 'var(--violet, #A78BFA)' }}>Refunds & Cancellation Policy</h1>
        <p style={{ textAlign: 'center', paddingLeft: '320px', color: 'var(--text-secondary, #9ca3af)', marginBottom: '40px', fontSize: '14px' }}>Last updated: 15 Sep 2026 · Effective for all purchases made on or after this date</p>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0', display: 'flex', padding: '0 20px 60px', gap: '40px', alignItems: 'flex-start' }}>
        
        {/* Sidebar */}
        <div style={{ width: '280px', position: 'sticky', top: '40px', background: '#1c1c1f', borderRadius: '12px', padding: '24px 0', border: '1px solid #2d2d30', display: 'none' }} className="legal-sidebar">
          <h3 style={{ fontSize: '14px', fontWeight: '700', textAlign: 'center', marginBottom: '16px', letterSpacing: '0.5px' }}>ON THIS PAGE</h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                style={{
                  background: activeSection === s.id ? '#0f0f13' : 'transparent',
                  border: 'none',
                  borderLeft: activeSection === s.id ? '3px solid #fff' : '3px solid transparent',
                  padding: '12px 20px',
                  color: activeSection === s.id ? '#fff' : '#9ca3af',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: activeSection === s.id ? '600' : '400',
                  transition: 'all 0.2s ease',
                  borderTopRightRadius: '8px',
                  borderBottomRightRadius: '8px',
                  marginLeft: '8px',
                  marginRight: '8px'
                }}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, lineHeight: '1.8', color: 'var(--text-secondary, #9ca3af)', fontSize: '16px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div id="policy">
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>Refund Policy</h2>
            <p style={{ marginBottom: '16px' }}>You may be eligible for a full refund in the following circumstances:</p>
            <ol style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <li>
                <strong style={{ color: '#fff' }}>Course Not Assigned:</strong> The purchased course has not been assigned to your account within the expiration date from your date of purchase.
              </li>
              <li>
                <strong style={{ color: '#fff' }}>Double Charge:</strong> You have been charged twice for the same course or subscription.
              </li>
              <li>
                <strong style={{ color: '#fff' }}>No Other Refunds:</strong> Under any other circumstance, we will not consider any requests for refund as this is a digital course purchase.
              </li>
            </ol>
            
            <p style={{ marginTop: '24px' }}>If you meet the above criteria and wish to request a refund, please contact our support team with your order details and proof of payment.</p>
          </div>

        </div>
      </div>
      <style>{`
        @media (min-width: 768px) {
          .legal-sidebar {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

