import React, { useState, useEffect } from "react";
import { X, ArrowLeft, Gem, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import "../../css/AdminTickets.css";

const emptyPlan = () => ({
  planName: "",
  durationMonths: 1,
  originalPrice: 0,
  discountPercent: 0,
  price: 0,
  isActive: true,
});

function PaidPlanDrawer({ isOpen, onClose, onSave, plan, currency = "INR" }) {
  const [plans, setPlans] = useState([emptyPlan()]);
  const [expandedIndex, setExpandedIndex] = useState(0);

  // Sync state when plan/isOpen changes
  useEffect(() => {
    if (plan) {
      // Editing a single plan
      setPlans([{
        planName: plan.planName || "",
        durationMonths: plan.durationMonths || 1,
        originalPrice: plan.originalPrice || 0,
        discountPercent: plan.discountPercent || 0,
        price: plan.price || 0,
        isActive: plan.isActive !== undefined ? plan.isActive : true,
      }]);
      setExpandedIndex(0);
    } else {
      setPlans([emptyPlan()]);
      setExpandedIndex(0);
    }
  }, [plan, isOpen]);

  const updatePlan = (index, field, value) => {
    setPlans(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Auto-calculate selling price when originalPrice or discountPercent changes
      if (field === "originalPrice" || field === "discountPercent") {
        const op = field === "originalPrice" ? value : updated[index].originalPrice;
        const dp = field === "discountPercent" ? value : updated[index].discountPercent;
        updated[index].price = Math.round(op * (1 - dp / 100));
        if (updated[index].price < 0) updated[index].price = 0;
      }
      
      // Auto-calculate discount when selling price (price) changes
      if (field === "price") {
        const op = updated[index].originalPrice;
        const sp = value;
        if (op > 0) {
          const calculatedDiscount = Math.round(((op - sp) / op) * 100);
          updated[index].discountPercent = calculatedDiscount >= 0 && calculatedDiscount <= 100 ? calculatedDiscount : 0;
        } else {
          updated[index].discountPercent = 0;
        }
      }
      return updated;
    });
  };

  const addPlan = () => {
    setPlans(prev => [...prev, emptyPlan()]);
    setExpandedIndex(plans.length);
  };

  const removePlan = (index) => {
    if (plans.length <= 1) return;
    setPlans(prev => prev.filter((_, i) => i !== index));
    setExpandedIndex(0);
  };

  if (!isOpen) return null;

  const handleSave = () => {
    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      if (!p.planName.trim()) {
        alert(`Plan ${i + 1}: Please enter a plan name.`);
        setExpandedIndex(i);
        return;
      }
      if (p.durationMonths <= 0) {
        alert(`Plan ${i + 1}: Please select a valid duration.`);
        setExpandedIndex(i);
        return;
      }
    }

    const result = plans.map(p => ({
      ...p,
      discountLabel: p.discountPercent > 0 ? `${p.discountPercent}% OFF` : "",
    }));

    // If editing a single plan, return just that plan; otherwise return array
    if (plan) {
      onSave(result[0]);
    } else {
      onSave(result);
    }
  };

  const isEditMode = !!plan;
  const currencySymbol = currency === "USD" ? "$" : "₹";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px", width: "95%" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={onClose}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "6px", cursor: "pointer", color: "var(--text-secondary)" }}
            >
              <ArrowLeft size={18} />
            </button>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
              {isEditMode ? "Edit Paid Plan" : "Create Paid Plans"}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {plans.map((p, index) => {
            const isExpanded = expandedIndex === index;
            const savings = p.originalPrice - p.price;

            return (
              <div
                key={index}
                style={{
                  marginBottom: "16px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "14px",
                  overflow: "hidden",
                  background: "var(--bg-panel, #fff)",
                  boxShadow: isExpanded ? "0 4px 20px rgba(110, 63, 243, 0.06)" : "none",
                }}
              >
                {/* Collapsed Header */}
                <div
                  onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    cursor: "pointer",
                    background: isExpanded ? "rgba(110, 63, 243, 0.03)" : "transparent",
                    transition: "background 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(110, 63, 243, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--violet)", fontWeight: "800", fontSize: "13px" }}>
                      {index + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)" }}>
                        {p.planName || `Plan ${index + 1}`}
                      </div>
                      {!isExpanded && p.price > 0 && (
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                          {currencySymbol}{p.price} · {p.durationMonths} month{p.durationMonths > 1 ? "s" : ""}
                          {p.discountPercent > 0 && <span style={{ color: "#10B981", marginLeft: "6px" }}>({p.discountPercent}% OFF)</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {plans.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removePlan(index); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: "4px" }}
                        title="Remove plan"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
                  </div>
                </div>

                {/* Expanded Form */}
                {isExpanded && (
                  <div style={{ padding: "0 18px 18px 18px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Plan Active Toggle */}
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Active</span>
                      <div
                        onClick={() => updatePlan(index, "isActive", !p.isActive)}
                        style={{
                          width: "40px", height: "22px", borderRadius: "22px",
                          backgroundColor: p.isActive ? "var(--violet)" : "#ccc",
                          position: "relative", cursor: "pointer", transition: "0.3s",
                        }}
                      >
                        <div style={{
                          position: "absolute", top: "3px",
                          left: p.isActive ? "20px" : "3px",
                          width: "16px", height: "16px", borderRadius: "50%",
                          backgroundColor: "white", transition: "0.3s",
                        }} />
                      </div>
                    </div>

                    {/* Plan Name */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Plan Name</label>
                      <input
                        type="text"
                        placeholder="e.g. 1 Month Plan"
                        value={p.planName}
                        onChange={(e) => updatePlan(index, "planName", e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "14px", boxSizing: "border-box" }}
                      />
                    </div>

                    {/* Duration */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Duration</label>
                      <select
                        value={p.durationMonths}
                        onChange={(e) => updatePlan(index, "durationMonths", parseInt(e.target.value, 10))}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "14px" }}
                      >
                        <option value={1}>1 Month</option>
                        <option value={2}>2 Months</option>
                        <option value={3}>3 Months</option>
                        <option value={6}>6 Months</option>
                        <option value={12}>12 Months</option>
                      </select>
                    </div>

                    {/* Price Row */}
                    <div style={{ display: "flex", gap: "12px" }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Original Price ({currencySymbol})</label>
                        <input
                          type="number"
                          min="0"
                          value={p.originalPrice || ""}
                          onChange={(e) => updatePlan(index, "originalPrice", parseFloat(e.target.value) || 0)}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "14px", boxSizing: "border-box" }}
                        />
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Discount (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={p.discountPercent || ""}
                          onChange={(e) => updatePlan(index, "discountPercent", parseFloat(e.target.value) || 0)}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "14px", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    {/* Selling Price */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Selling Price ({currencySymbol})</label>
                      <input
                        type="number"
                        value={p.price}
                        onChange={(e) => updatePlan(index, "price", parseFloat(e.target.value) || 0)}
                        style={{
                          width: "100%", padding: "12px 14px", borderRadius: "8px",
                          border: "1px solid rgba(110, 63, 243, 0.2)",
                          background: "rgba(110, 63, 243, 0.04)",
                          color: "var(--violet)", fontWeight: "700", fontSize: "16px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    {/* Preview Summary */}
                    {p.price > 0 && (
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 16px", borderRadius: "10px",
                        background: "rgba(110, 63, 243, 0.04)",
                        border: "1px solid rgba(110, 63, 243, 0.1)",
                      }}>
                        <div>
                          <span style={{ fontSize: "22px", fontWeight: "800", color: "var(--violet)" }}>{currencySymbol}{p.price}</span>
                          {p.originalPrice > p.price && (
                            <span style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: "13px", marginLeft: "8px" }}>{currencySymbol}{p.originalPrice}</span>
                          )}
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                            for {p.durationMonths} month{p.durationMonths > 1 ? "s" : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                          {p.discountPercent > 0 && (
                            <span style={{ fontSize: "11px", backgroundColor: "#E6FDF4", color: "#10B981", padding: "3px 8px", borderRadius: "20px", fontWeight: "700" }}>
                              {p.discountPercent}% OFF
                            </span>
                          )}
                          {savings > 0 && (
                            <span style={{ fontSize: "11px", color: "var(--violet)", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                              <Gem size={12} /> Save {currencySymbol}{savings}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Another Plan Button */}
          {!isEditMode && (
            <button
              type="button"
              onClick={addPlan}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                border: "2px dashed rgba(110, 63, 243, 0.25)",
                background: "rgba(110, 63, 243, 0.03)",
                color: "var(--violet)",
                fontWeight: "700",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.target.style.background = "rgba(110, 63, 243, 0.08)"; }}
              onMouseLeave={(e) => { e.target.style.background = "rgba(110, 63, 243, 0.03)"; }}
            >
              <Plus size={18} /> Add Another Plan
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", padding: "16px 24px", borderTop: "1px solid var(--border-color)", background: "var(--bg-panel)", flexShrink: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-secondary)", fontWeight: "600", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "var(--violet)", color: "white", fontWeight: "600", cursor: "pointer" }}
          >
            {isEditMode ? "Update Plan" : `Create ${plans.length} Plan${plans.length > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaidPlanDrawer;
