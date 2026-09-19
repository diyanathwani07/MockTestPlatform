import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsConditions() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('general');

  const sections = [
    { id: 'general', title: 'General Terms of Use' },
    { id: 'intellectual', title: 'Intellectual Property' },
    { id: 'educational', title: 'Educational Purpose' },
    { id: 'payments', title: 'Payments & Orders' },
    { id: 'liability', title: 'Liability & Disputes' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      let current = 'general';
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
      {/* Header Area */}
      <div style={{ padding: '40px 20px 20px', maxWidth: '1400px', margin: '0' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '24px', fontSize: '16px', fontWeight: '600' }}
        >
          <ArrowLeft size={20} /> Back
        </button>
        <h1 style={{ textAlign: 'center',  fontSize: '32px', color: 'var(--violet, #A78BFA)', marginBottom: '40px' }}>Terms and Conditions</h1>
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
          
          <div id="general">
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>General Terms of Use</h2>
            <p style={{ marginBottom: '16px' }}>Welcome, if you continue to browse and use this website you are agreeing to comply with and be bound by the following terms and conditions of use, which together with our privacy policy govern PrepMark's relationship with you in relation to this website.</p>
            <p style={{ marginBottom: '16px' }}>The term 'PrepMark' or 'us' or 'we' refers to the owner of the website. The term 'you' refers to the user or viewer of our website.</p>
            <p style={{ marginBottom: '16px' }}>The use of this website is subject to the following terms of use:</p>
            <ol style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li>The content of the pages of this website is for your general information and use only. It is subject to change without notice.</li>
              <li>Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials found or offered on this website for any particular purpose.</li>
              <li>You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.</li>
              <li>Your use of any information or materials on this website is entirely at your own risk, for which we shall not be liable.</li>
              <li>It shall be your own responsibility to ensure that any products, services or information available through this website meet your specific requirements.</li>
              <li>Unauthorized use of this website by you may give rise to a claim for damages and/or be a criminal offense. From time to time this website may also include links to other websites.</li>
              <li>These links are provided for your convenience to provide further information. They do not signify that we endorse the website(s). We take no responsibility for the content of the linked website(s).</li>
              <li>You may not create a link to this website from another website or document without PrepMark's prior consent. Your use of this website and any dispute arising out of such use of the website is subject to the laws of India or other regulatory authority.</li>
            </ol>
          </div>

          <div id="intellectual">
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>Intellectual Property</h2>
            <ol style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li>This website contains material which is owned by or licensed to us. This material includes, but is not limited to, the design, layout, look, appearance and graphics.</li>
              <li>Reproduction is prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions.</li>
              <li>All trademarks reproduced in this website which are not the property of, or licensed to, the operator are acknowledged on the website.</li>
            </ol>
          </div>

          <div id="educational">
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>Educational Purpose</h2>
            <ol style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li><strong style={{ color: '#fff' }}>Educational Purpose Only:</strong> This app is designed solely for educational purposes to help users develop skills. We do not guarantee any income or financial success from using this app.</li>
              <li><strong style={{ color: '#fff' }}>No Income Assurance:</strong> The skills and knowledge provided are for personal growth and learning. We do not promise or imply any job placement, business success, or earnings.</li>
              <li><strong style={{ color: '#fff' }}>User Responsibility:</strong> You are responsible for how you use the skills learned from this app. The app creators are not liable for any outcomes resulting from your usage.</li>
            </ol>
          </div>

          <div id="payments">
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>Payments & Orders</h2>
            <ol style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li><strong style={{ color: '#fff' }}>Other Terms:</strong> Credit Card orders will commence on receiving the authorization/confirmation from the Credit Card/respective Payment Gateway companies.</li>
              <li><strong style={{ color: '#fff' }}>Non-Refundable:</strong> All payments made in the app are final. No refunds will be provided under any circumstances.</li>
            </ol>
          </div>

          <div id="liability">
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>Liability & Disputes</h2>
            <p>By continuing to use the app, you accept and agree to these terms.</p>
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
