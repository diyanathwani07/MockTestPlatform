const fs = require("fs");
let code = fs.readFileSync("Client/src/admin/AiPlans.jsx", "utf8");

code = code.replace(/aiCredits: 500,/g, "");
code = code.replace(/aiCredits: plan\.aiCredits,/g, "");

const inputBlock = `<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <label style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "500" }}>AI Credits (For Quizzes)</label>
                          <input
                            type="number"
                            value={formData.aiCredits}
                            onChange={(e) => setFormData({ ...formData, aiCredits: parseInt(e.target.value) || 0 })}
                            placeholder="e.g. 500"
                            style={{
                              padding: "10px 14px",
                              borderRadius: "8px",
                              border: "1px solid var(--border-color)",
                              background: "rgba(255,255,255,0.02)",
                              color: "var(--text-primary)",
                              fontSize: "14px"
                            }}
                          />
                        </div>`;

code = code.replace(inputBlock, "");

fs.writeFileSync("Client/src/admin/AiPlans.jsx", code);

