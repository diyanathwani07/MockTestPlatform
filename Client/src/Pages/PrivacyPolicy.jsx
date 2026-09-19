import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('interpretation');

  const sections = [
    { id: 'interpretation', title: 'Interpretation & Definitions' },
    { id: 'collecting', title: 'Collecting & Using Your Data' },
    { id: 'tracking', title: 'Tracking Technologies & Cookies' },
    { id: 'use', title: 'Use of Your Personal Data' },
    { id: 'retention', title: 'Retention & Transfer' },
    { id: 'disclosure', title: 'Disclosure of Your Data' },
    { id: 'children', title: "Children's Privacy" },
    { id: 'links', title: 'Links to Other Websites' },
    { id: 'changes', title: 'Changes to This Policy' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      let current = 'interpretation';
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
        <h1 style={{ textAlign: 'center', paddingLeft: '320px',  fontSize: '32px', color: 'var(--violet, #A78BFA)', marginBottom: '40px' }}>Privacy Policy</h1>
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
          
          <div id="interpretation">
            <p style={{ marginBottom: '16px' }}>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>
            <p style={{ marginBottom: '16px' }}>We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.</p>
            
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>Interpretation & Definitions</h2>
            <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>Interpretation</h3>
            <p style={{ marginBottom: '16px' }}>The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>
            
            <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>Definitions</h3>
            <p style={{ marginBottom: '16px' }}>For the purposes of this Privacy Policy:</p>
            <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</li>
              <li><strong>Company</strong> (referred to as either �the Company�, �We�, �Us� or �Our� in this Agreement) refers to PrepMark (prepmark.vercel.app).</li>
              <li><strong>Affiliate</strong> means an entity that controls, is controlled by or is under common control with a party, where �control� means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.</li>
              <li><strong>Account</strong> means a unique account created for You to access our Service or parts of our Service.</li>
              <li><strong>Website</strong> refers to PrepMark, accessible from prepmark.vercel.app</li>
              <li><strong>Service</strong> refers to the Website.</li>
              <li><strong>Country</strong> refers to: Uttar Pradesh, India</li>
              <li><strong>Service Provider</strong> means any natural or legal person who processes the data on behalf of the Company. It refers to third-party companies or individuals employed by the Company to facilitate the Service, to provide the Service on behalf of the Company, to perform services related to the Service or to assist the Company in analyzing how the Service is used.</li>
              <li><strong>Third-party Social Media Service</strong> refers to any website or any social network website through which a User can log in or create an account to use the Service.</li>
              <li><strong>Personal Data</strong> is any information that relates to an identified or identifiable individual.</li>
              <li><strong>Cookies</strong> are small files that are placed on Your computer, mobile device or any other device by a website, containing the details of Your browsing history on that website among its many uses.</li>
              <li><strong>Usage Data</strong> refers to data collected automatically, either generated by the use of the Service or from the Service infrastructure itself (for example, the duration of a page visit).</li>
            </ul>
          </div>

          <div id="collecting">
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>Collecting & Using Your Personal Data</h2>
            <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>Types of Data Collected</h3>
            <h4 style={{ color: '#fff', fontSize: '16px', marginBottom: '8px' }}>Personal Data</h4>
            <p style={{ marginBottom: '16px' }}>While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to: Email address, First name and last name, Phone number, and Usage Data.</p>
            
            <h4 style={{ color: '#fff', fontSize: '16px', marginBottom: '8px' }}>Usage Data</h4>
            <p style={{ marginBottom: '16px' }}>Usage Data is collected automatically when using the Service. Usage Data may include information such as Your Device�s Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>
            <p style={{ marginBottom: '16px' }}>When You access the Service by or through a mobile device, We may collect certain information automatically, including, but not limited to, the type of mobile device You use, Your mobile device unique ID, the IP address of Your mobile device, Your mobile operating system, the type of mobile Internet browser You use, unique device identifiers and other diagnostic data.</p>
            <p>We may also collect information that Your browser sends whenever You visit our Service or when You access the Service by or through a mobile device.</p>
          </div>

          <div id="tracking">
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>Tracking Technologies & Cookies</h2>
            <p style={{ marginBottom: '16px' }}>We use Cookies and similar tracking technologies to track the activity on Our Service and store certain information. Tracking technologies used are beacons, tags, and scripts to collect and track information and to improve and analyze Our Service.</p>
            <p style={{ marginBottom: '16px' }}>You can instruct Your browser to refuse all Cookies or to indicate when a Cookie is being sent. However, if You do not accept Cookies, You may not be able to use some parts of our Service.</p>
            <p style={{ marginBottom: '16px' }}>Cookies can be �Persistent� or �Session� Cookies. Persistent Cookies remain on your personal computer or mobile device when You go offline, while Session Cookies are deleted as soon as You close your web browser.</p>
            <p style={{ marginBottom: '16px' }}>We use both session and persistent Cookies for the purposes set out below:</p>
            <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Necessary / Essential Cookies</strong> (Session Cookies): These Cookies are essential to provide You with services available through the Website and to enable You to use some of its features.</li>
              <li><strong>Cookies Policy / Notice Acceptance Cookies</strong> (Persistent Cookies): These Cookies identify if users have accepted the use of cookies on the Website.</li>
              <li><strong>Functionality Cookies</strong> (Persistent Cookies): These Cookies allow us to remember choices You make when You use the Website, such as remembering your login details or language preference.</li>
            </ul>
          </div>

          <div id="use">
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>Use of Your Personal Data</h2>
            <p style={{ marginBottom: '16px' }}>The Company may use Personal Data for the following purposes:</p>
            <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <li>To provide and maintain our Service, including to monitor the usage of our Service.</li>
              <li>To manage Your Account: to manage Your registration as a user of the Service.</li>
              <li>For the performance of a contract: the development, compliance and undertaking of the purchase contract for the products, items or services You have purchased.</li>
              <li>To contact You: To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication.</li>
              <li>To provide You with news, special offers and general information about other goods, services and events.</li>
              <li>To manage Your requests: To attend and manage Your requests to Us.</li>
            </ul>
            
            <p>We may share your personal information in the following situations: With Service Providers, For Business transfers, With Affiliates, With Business partners, and With other users when You share personal information in public areas.</p>
          </div>

          <div id="retention">
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>Retention & Transfer</h2>
            <p style={{ marginBottom: '16px' }}>The Company will retain Your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy.</p>
            <p>Your information, including Personal Data, is processed at the Company�s operating offices and in any other places where the parties involved in the processing are located. Your consent to this Privacy Policy followed by Your submission of such information represents Your agreement to that transfer.</p>
          </div>

          <div id="disclosure">
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>Disclosure of Your Personal Data</h2>
            <p>Under certain circumstances, the Company may be required to disclose Your Personal Data if required to do so by law or in response to valid requests by public authorities.</p>
          </div>

          <div id="children">
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>Children's Privacy</h2>
            <p>Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under the age of 13.</p>
          </div>

          <div id="links">
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>Links to Other Websites</h2>
            <p>Our Service may contain links to other websites that are not operated by Us. We strongly advise You to review the Privacy Policy of every site You visit.</p>
          </div>

          <div id="changes">
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>Changes to This Privacy Policy</h2>
            <p>We may update our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page.</p>
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

