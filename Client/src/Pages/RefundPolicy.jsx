import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RefundPolicy() {
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
        <h1 style={{ fontSize: '32px', marginBottom: '8px', color: 'var(--violet, #A78BFA)' }}>Refunds & Cancellation Policy</h1>
        <p style={{ color: 'var(--text-secondary, #9ca3af)', marginBottom: '32px', fontSize: '14px' }}>Last updated: January 1, 2025 · Effective for all purchases made on or after this date</p>
        
        <div style={{ lineHeight: '1.8', color: 'var(--text-secondary, #9ca3af)', fontSize: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <p>You may be eligible for a full refund in the following circumstances:</p>
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
  );
}
