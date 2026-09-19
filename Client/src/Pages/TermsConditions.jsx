import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsConditions() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page, #0f0f13)', color: 'var(--text-primary, #ffffff)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '32px', fontSize: '16px', fontWeight: '600' }}
        >
          <ArrowLeft size={20} /> Back
        </button>
        <h1 style={{ fontSize: '32px', marginBottom: '24px', color: 'var(--violet, #A78BFA)' }}>Terms and Conditions</h1>
        
        <div style={{ lineHeight: '1.8', color: 'var(--text-secondary, #9ca3af)', fontSize: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <h2 style={{ color: '#fff', marginTop: '24px', fontSize: '24px' }}>General Terms of Use</h2>
          <p>Welcome, if you continue to browse and use this website you are agreeing to comply with and be bound by the following terms and conditions of use, which together with our privacy policy govern PrepMark's relationship with you in relation to this website.</p>
          <p>The term 'PrepMark' or 'us' or 'we' refers to the owner of the website. The term 'you' refers to the user or viewer of our website.</p>
          <p>The use of this website is subject to the following terms of use:</p>
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

          <h2 style={{ color: '#fff', marginTop: '24px', fontSize: '24px' }}>Intellectual Property</h2>
          <ol style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li>This website contains material which is owned by or licensed to us. This material includes, but is not limited to, the design, layout, look, appearance and graphics.</li>
            <li>Reproduction is prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions.</li>
            <li>All trademarks reproduced in this website which are not the property of, or licensed to, the operator are acknowledged on the website.</li>
          </ol>

          <h2 style={{ color: '#fff', marginTop: '24px', fontSize: '24px' }}>Educational Purpose</h2>
          <ol style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li><strong style={{ color: '#fff' }}>Educational Purpose Only:</strong> This app is designed solely for educational purposes to help users develop skills. We do not guarantee any income or financial success from using this app.</li>
            <li><strong style={{ color: '#fff' }}>No Income Assurance:</strong> The skills and knowledge provided are for personal growth and learning. We do not promise or imply any job placement, business success, or earnings.</li>
            <li><strong style={{ color: '#fff' }}>User Responsibility:</strong> You are responsible for how you use the skills learned from this app. The app creators are not liable for any outcomes resulting from your usage.</li>
          </ol>

          <h2 style={{ color: '#fff', marginTop: '24px', fontSize: '24px' }}>Payments & Orders</h2>
          <ol style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li><strong style={{ color: '#fff' }}>Other Terms:</strong> Credit Card orders will commence on receiving the authorization/confirmation from the Credit Card/respective Payment Gateway companies.</li>
            <li><strong style={{ color: '#fff' }}>Non-Refundable:</strong> All payments made in the app are final. No refunds will be provided under any circumstances.</li>
          </ol>

          <h2 style={{ color: '#fff', marginTop: '24px', fontSize: '24px' }}>Liability & Disputes</h2>
          <p>By continuing to use the app, you accept and agree to these terms.</p>

        </div>
      </div>
    </div>
  );
}
