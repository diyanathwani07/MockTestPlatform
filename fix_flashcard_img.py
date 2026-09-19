import re

with open(r'c:\Users\HP\OneDrive\Desktop\MockTestSeries\Client\src\admin\ManageFlashcards.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imageDragActive state
content = content.replace(
    'const [isUploading, setIsUploading] = useState(false);',
    'const [isUploading, setIsUploading] = useState(false);\n  const [imageDragActive, setImageDragActive] = useState(false);'
)

# Update handleImageUpload
old_upload = r'''  const handleImageUpload = async \(e\) => \{
    const file = e\.target\.files\[0\];
    if \(!file\) return;

    const data = new FormData\(\);
    data\.append\("image", file\);
    data\.append\("folder", "flashcards"\);

    setIsUploading\(true\);
    try \{
      const token = localStorage\.getItem\("token"\);
      const res = await axios\.post\(\$\{import\.meta\.env\.VITE_API_URL\}/api/upload/image, data, \{
        headers: \{
          Authorization: Bearer \$\{token\},
          "Content-Type": "multipart/form-data"
        \}
      \}\);
      setFormData\(prev => \(\{ \.\.\.prev, imageUrl: res\.data\.imageUrl \}\)\);
    \} catch \(err\) \{
      console\.error\("Image upload failed", err\);
      alert\("Failed to upload image\."\);
    \} finally \{
      setIsUploading\(false\);
    \}
  \};'''

new_upload = '''  const processImageFile = async (file) => {
    if (!file) return;

    const data = new FormData();
    data.append("image", file);
    data.append("folder", "flashcards");

    setIsUploading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(${import.meta.env.VITE_API_URL}/api/upload/image, data, {
        headers: {
          Authorization: Bearer ,
          "Content-Type": "multipart/form-data"
        }
      });
      setFormData(prev => ({ ...prev, imageUrl: res.data.imageUrl }));
    } catch (err) {
      console.error("Image upload failed", err);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (e) => {
    processImageFile(e.target.files[0]);
  };'''

content = re.sub(old_upload, new_upload, content, flags=re.DOTALL)

# Update form field
old_field = r'''                  <div className="form-field" style=\{\{ marginBottom: "12px" \}\}>
                    <label style=\{\{ fontSize: "12px", color: "var\(--text-secondary\)", marginBottom: "4px" \}\}>Card Image \(Optional\)</label>
                    <div style=\{\{ display: "flex", alignItems: "center", gap: "10px" \}\}>
                      <input type="file" accept="image/\*" onChange=\{handleImageUpload\} style=\{\{ fontSize: "13px" \}\} />
                      \{isUploading && <span style=\{\{ fontSize: "12px", color: "var\(--violet\)" \}\}>Uploading\.\.\.</span>\}
                      \{formData\.imageUrl && !isUploading && \(
                        <a href=\{formData\.imageUrl\} target="_blank" rel="noreferrer" style=\{\{ fontSize: "12px", color: "var\(--text-primary\)" \}\}>View Image</a>
                      \)\}
                    </div>
                  </div>'''

new_field = '''                  <div className="form-field" style={{ marginBottom: "12px" }}>
                    <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", display: "block", fontWeight: "600" }}>Card Image (Optional)</label>
                    <div 
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setImageDragActive(true); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setImageDragActive(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setImageDragActive(false); }}
                      onDrop={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        setImageDragActive(false); 
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          processImageFile(e.dataTransfer.files[0]);
                        }
                      }}
                      style={{ 
                        border: imageDragActive ? "2px dashed var(--violet, #6E3FF3)" : "1px dashed var(--border-color, #333)", 
                        borderRadius: "10px", 
                        padding: "16px", 
                        textAlign: "center", 
                        backgroundColor: imageDragActive ? "rgba(110, 63, 243, 0.05)" : "rgba(255, 255, 255, 0.02)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {isUploading ? (
                        <span style={{ fontSize: "13px", color: "var(--violet, #6E3FF3)", fontWeight: "500" }}>Uploading image...</span>
                      ) : formData.imageUrl ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                          <img src={formData.imageUrl} alt="Flashcard" style={{ maxHeight: "120px", borderRadius: "8px", objectFit: "contain", border: "1px solid var(--border-color, #333)" }} />
                          <div style={{ display: "flex", gap: "16px" }}>
                            <a href={formData.imageUrl} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "white", textDecoration: "none", background: "rgba(255,255,255,0.1)", padding: "4px 10px", borderRadius: "4px" }}>View Full Image</a>
                            <button type="button" onClick={() => setFormData(prev => ({...prev, imageUrl: ""}))} style={{ fontSize: "12px", color: "#F87171", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>Remove</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                          <div style={{ color: "var(--text-secondary, #9CA3AF)", marginBottom: "4px" }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          </div>
                          <span style={{ fontSize: "13px", color: "var(--text-secondary, #9CA3AF)" }}>Drag & drop an image here, or</span>
                          <label style={{ cursor: "pointer", color: "var(--violet, #6E3FF3)", fontSize: "13px", fontWeight: "600" }}>
                            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                            browse to upload
                          </label>
                        </div>
                      )}
                    </div>
                  </div>'''

content = re.sub(old_field, new_field, content, flags=re.DOTALL)

with open(r'c:\Users\HP\OneDrive\Desktop\MockTestSeries\Client\src\admin\ManageFlashcards.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
