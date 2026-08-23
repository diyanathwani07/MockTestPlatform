import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Sparkles, Image, Video, FileText, X } from 'lucide-react';

export default function AIQuestionGenerator({ quizMeta, activeSection, onQuestionsAdded, onClose }) {
  const [mode, setMode] = useState('prompt'); // 'prompt' | 'image' | 'video'
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [successPrompt, setSuccessPrompt] = useState('');
  const [successFileUrl, setSuccessFileUrl] = useState(null);
  const [successFileType, setSuccessFileType] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  React.useEffect(() => {
    if (quizMeta && quizMeta.aiSourceType) {
      if (quizMeta.aiSourceType === 'prompt') {
        setSuccessPrompt(quizMeta.aiSourcePrompt || quizMeta.description || '');
        setSuccessFileUrl(null);
        setSuccessFileType(null);
        setSuccessMsg('Questions were successfully generated from this AI Prompt.');
      } else if (quizMeta.aiSourceType === 'image') {
        setSuccessPrompt('uploaded Image');
        setSuccessFileUrl(quizMeta.aiSourceUrl || null);
        setSuccessFileType('image');
        setSuccessMsg('Questions were successfully generated from this uploaded Image.');
      } else if (quizMeta.aiSourceType === 'video') {
        setSuccessPrompt('uploaded Video');
        setSuccessFileUrl(quizMeta.aiSourceUrl || null);
        setSuccessFileType('video');
        setSuccessMsg('Questions were successfully generated from this uploaded Video.');
      }
    }
  }, [quizMeta]);

  const fileInputRef = useRef(null);

  // Caps
  const maxCount = mode === 'prompt' ? 20 : 15;
  const currentCount = Math.min(count, maxCount);

  // File size limit checks
  const maxVideoSize = 100 * 1024 * 1024; // 100MB
  const maxImageSize = 10 * 1024 * 1024; // 10MB

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setErrorMsg('');
    if (mode === 'image') {
      if (!selectedFile.type.startsWith('image/')) {
        setErrorMsg('Please select an image file (PNG, JPG, JPEG, WEBP).');
        return;
      }
      if (selectedFile.size > maxImageSize) {
        setErrorMsg('Image size exceeds 10MB limit.');
        return;
      }
    } else if (mode === 'video') {
      if (!selectedFile.type.startsWith('video/')) {
        setErrorMsg('Please select a video file (MP4, WEBM, etc.).');
        return;
      }
      if (selectedFile.size > maxVideoSize) {
        setErrorMsg('Video size exceeds 100MB limit.');
        return;
      }
    }
    setFile(selectedFile);
  };

  const handleClearFile = (e) => {
    e.stopPropagation();
    setFile(null);
  };

  const addQuestionsToQuizDirectly = (qs, sourceInfo, promptText, sourceUrl) => {
    onQuestionsAdded([{
      sectionTitle: 'Default',
      questions: qs.map(q => ({
        questionEnglish: q.questionEnglish,
        questionHindi: q.questionHindi || '',
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        explanations: q.explanations || {
          correct: q.explanation || '',
          incorrect: {},
          conceptSummary: '',
          didYouKnow: ''
        }
      }))
    }], sourceInfo, promptText, sourceUrl);
    
    if (sourceInfo === 'AI Prompt') {
      setSuccessPrompt(promptText);
      setSuccessFileUrl(null);
      setSuccessFileType(null);
    } else {
      setSuccessPrompt(sourceInfo);
      if (sourceUrl) {
        setSuccessFileUrl(sourceUrl);
        setSuccessFileType(mode);
      } else if (file) {
        setSuccessFileUrl(URL.createObjectURL(file));
        setSuccessFileType(mode);
      }
    }
    
    setSuccessMsg(`${qs.length} questions successfully generated and added to the quiz.`);
    setLoading(false);
  };

  const handleGenerate = async () => {
    setErrorMsg('');
    setLoading(true);
    setStatusText('Sending request to Gemini AI...');

    const token = localStorage.getItem('token');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      // Detect BPSC option count: 5 options if markingPattern is bpsc
      const optionCount = quizMeta.markingPattern === 'bpsc' ? 5 : 4;
      const negativeMarkingEnabled = activeSection.negativeMarking > 0;

      if (mode === 'prompt') {
        if (!topic.trim()) {
          setErrorMsg('Please enter a topic or instruction prompt.');
          setLoading(false);
          return;
        }

        const res = await axios.post(`${apiBase}/api/ai/questions/from-prompt`, {
          topic,
          count: currentCount,
          subject: quizMeta.subject || 'General',
          examContext: quizMeta.examName || '',
          negativeMarkingEnabled,
          optionCount
        }, config);

        if (res.data && res.data.questions) {
          addQuestionsToQuizDirectly(res.data.questions, 'AI Prompt', topic);
        }
      } else if (mode === 'image') {
        if (!file) {
          setErrorMsg('Please upload or drag & drop an image.');
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('count', currentCount);
        formData.append('subject', quizMeta.subject || 'General');
        formData.append('optionCount', optionCount);

        const res = await axios.post(`${apiBase}/api/ai/questions/from-image`, formData, {
          headers: {
            ...config.headers,
            'Content-Type': 'multipart/form-data'
          }
        });

        if (res.data && res.data.questions) {
          addQuestionsToQuizDirectly(res.data.questions, 'uploaded Image', null, res.data.sourceUrl);
        }
      } else if (mode === 'video') {
        if (!file) {
          setErrorMsg('Please upload or drag & drop a video.');
          setLoading(false);
          return;
        }

        setStatusText('Uploading video to Cloudinary...');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('count', currentCount);
        formData.append('subject', quizMeta.subject || 'General');
        formData.append('optionCount', optionCount);

        const startRes = await axios.post(`${apiBase}/api/ai/questions/from-video/start`, formData, {
          headers: {
            ...config.headers,
            'Content-Type': 'multipart/form-data'
          }
        });

        const jobId = startRes.data.jobId;
        pollVideoJobStatus(jobId, config, apiBase);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to generate questions. Please try again.');
      setLoading(false);
    }
  };

  const pollVideoJobStatus = async (jobId, config, apiBase) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${apiBase}/api/ai/questions/from-video/status/${jobId}`, config);
        const { status, resultQuestions, videoCloudinaryUrl, errorMessage } = res.data;

        if (status === 'uploading') {
          setStatusText('Uploading video to server & Cloudinary...');
        } else if (status === 'processing') {
          setStatusText('Processing video in Gemini Files API...');
        } else if (status === 'generating') {
          setStatusText('Generating structured questions using Gemini AI...');
        } else if (status === 'done') {
          clearInterval(interval);
          addQuestionsToQuizDirectly(resultQuestions, 'uploaded Video', null, videoCloudinaryUrl);
          setLoading(false);
        } else if (status === 'failed') {
          clearInterval(interval);
          setErrorMsg(errorMessage || 'Video generation job failed.');
          setLoading(false);
        }
      } catch (err) {
        clearInterval(interval);
        setErrorMsg('Failed to fetch video generation status.');
        setLoading(false);
      }
    }, 4000);
  };

  const labelStyle = { fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' };
  const inputStyle = { width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid var(--border-color)', padding: '10px 14px', outline: 'none', background: 'var(--bg-input)', color: 'var(--text-primary)', boxSizing: 'border-box', fontSize: '13.5px', marginBottom: '16px' };

  return (
    <div style={{ marginTop: '16px', marginBottom: '16px', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '12px', padding: '16px', position: 'relative', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: 'var(--violet)' }} />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>✨ AI Question Generator</h3>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
      </div>

      {successMsg ? (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', marginBottom: '12px' }}>
            <Sparkles size={20} style={{ color: '#10B981' }} />
          </div>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--text-primary)', fontWeight: '700' }}>Questions Added!</h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{successMsg}</p>
          {successPrompt && (
            <div style={{ textAlign: 'left', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginTop: '14px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Generation Source:</span>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.4', marginBottom: successFileUrl ? '10px' : '0' }}>{successPrompt}</p>
              
              {successFileType === 'image' && successFileUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  <img 
                    src={successFileUrl} 
                    alt="Uploaded source" 
                    onClick={() => setPreviewUrl(successFileUrl)}
                    style={{ maxWidth: '80px', maxHeight: '80px', borderRadius: '6px', border: '1.5px solid var(--border-color)', cursor: 'zoom-in', transition: 'transform 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>🔍 Click to zoom</span>
                </div>
              )}

              {successFileType === 'video' && successFileUrl && (
                <div style={{ marginTop: '8px' }}>
                  <video 
                    src={successFileUrl} 
                    controls 
                    style={{ maxWidth: '160px', borderRadius: '6px', border: '1.5px solid var(--border-color)' }}
                  />
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setSuccessMsg('');
              setSuccessPrompt('');
              setSuccessFileUrl(null);
              setSuccessFileType(null);
              setFile(null);
            }}
            style={{
              marginTop: '16px',
              padding: '8px 14px',
              background: 'rgba(110, 63, 243, 0.1)',
              color: 'var(--violet, #6E3FF3)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔄 Generate More / Change Source
          </button>
        </div>
      ) : (
        <div>
          {/* Segmented Mode Selector Toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '10px', padding: '3px', border: '1.5px solid var(--border-color)', marginBottom: '18px' }}>
          {['prompt', 'image', 'video'].map(m => {
            const isActive = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setFile(null); setErrorMsg(''); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'var(--bg-card)' : 'transparent',
                  color: isActive ? 'var(--violet)' : 'var(--text-secondary)',
                  fontWeight: isActive ? '700' : '600',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {m === 'prompt' && <FileText size={15} />}
                {m === 'image' && <Image size={15} />}
                {m === 'video' && <Video size={15} />}
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            );
          })}
        </div>

        {loading ? (
          
          /* Loading/Generation State */
          <div style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div className="ai-spinner" style={{ width: '36px', height: '36px', border: '3.5px solid rgba(139, 92, 246, 0.2)', borderTopColor: '#8B5CF6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' }}>{statusText}</span>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>This can take a minute, please do not close the window.</span>
          </div>

        ) : (

          /* Configuration Form */
          <div>
            {mode === 'prompt' && (
              <div>
                <label style={labelStyle}>Topic or Prompt Description</label>
                <textarea 
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  style={{ ...inputStyle, height: '90px', resize: 'vertical' }}
                  placeholder="e.g. Fundamental Rights in Indian Constitution Article 14 to 18..."
                />
              </div>
            )}

            {(mode === 'image' || mode === 'video') && (
              <div>
                <label style={labelStyle}>{mode === 'image' ? 'Image Upload' : 'Video Upload'}</label>
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    padding: '24px 16px', 
                    border: dragActive ? '2.5px dashed var(--violet)' : '1.5px dashed var(--border-color)', 
                    borderRadius: '10px', 
                    backgroundColor: dragActive ? 'rgba(110, 63, 243, 0.04)' : 'var(--bg-input)', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept={mode === 'image' ? 'image/*' : 'video/*'} 
                    style={{ display: 'none' }} 
                  />
                  {file && mode === 'image' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt="Upload preview" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewUrl(URL.createObjectURL(file));
                        }}
                        style={{ maxWidth: '140px', maxHeight: '140px', borderRadius: '8px', objectFit: 'contain', border: '1.5px solid var(--border-color)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'zoom-in' }} 
                      />
                      <span 
                        onClick={handleClearFile} 
                        style={{ display: 'inline-block', background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: '700', textTransform: 'uppercase' }}
                      >
                        Remove Image
                      </span>
                    </div>
                  ) : (
                    <>
                      {mode === 'image' ? <Image size={28} style={{ color: 'var(--text-muted)' }} /> : <Video size={28} style={{ color: 'var(--text-muted)' }} />}
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', wordBreak: 'break-all', padding: '0 10px' }}>
                        {file ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                            <span>{file.name}</span>
                            <span 
                              onClick={handleClearFile} 
                              style={{ display: 'inline-block', background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', cursor: 'pointer', fontWeight: '700', textTransform: 'uppercase' }}
                            >
                              Remove
                            </span>
                          </span>
                        ) : (
                          dragActive ? 'Drop file to upload' : 'Click to upload or Drag & Drop file'
                        )}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {mode === 'image' ? 'Supports PNG, JPG, JPEG, WEBP (Max 10MB)' : 'Supports MP4, WEBM (Max 100MB, Max 10 mins)'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Count Selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Number of Questions</span>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Maximum cap: {maxCount} questions</p>
              </div>
              <input 
                type="number"
                min="1"
                max={maxCount}
                value={count}
                onChange={e => setCount(Math.min(parseInt(e.target.value, 10) || 1, maxCount))}
                style={{ width: '80px', height: '38px', borderRadius: '8px', border: '1.5px solid var(--border-color)', outline: 'none', background: 'var(--bg-input)', color: 'var(--text-primary)', textAlign: 'center', fontWeight: '600' }}
              />
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #EF4444', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', fontSize: '12.5px', fontWeight: '600', marginBottom: '16px' }}>
                {errorMsg}
              </div>
            )}

            {/* Action Button */}
            <button
              type="button"
              onClick={handleGenerate}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #6E3FF3, #8B5CF6)',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(110, 63, 243, 0.15)'
              }}
            >
              <Sparkles size={16} />
              Generate Questions
            </button>
          </div>
        )}
        </div>
      )}
      {previewUrl && (
        <div 
          onClick={() => setPreviewUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={previewUrl} 
            alt="Full size preview" 
            style={{
              maxWidth: '90%',
              maxHeight: '82vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              cursor: 'default'
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: '#fff',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700'
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
