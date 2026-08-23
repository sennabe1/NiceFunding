import React from "react";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function SavingPlans({ currentUser }) {

  
  const isAdmin = currentUser?.role?.toLowerCase() === "admin";
  
  //console.log("Inside Saving plan, CurrentUser:-", currentUser);
  //console.log("Is Admin:-", isAdmin);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    start_month: "",
    end_month: "",
    saving_amount: ""
  });
  const [editId, setEditId] = useState(null);

  useEffect(() => { 
    loadPlans(); 
  }, []);

  /* ✅ LOAD PLANS */
  const loadPlans = async () => {
    const { data, error } = await supabase
      .from("saving_plans")
      .select("*")
      .order("id");

    if (!error) setPlans(data);
    else console.log("Load error:", error);
  };

  /* ✅ SAVE PLAN (INSERT / UPDATE) */
  const savePlan = async () => {
    if (editId) {
      await supabase
        .from("saving_plans")
        .update(form)
        .eq("id", editId);
    } else {
      await supabase
        .from("saving_plans")
        .insert([form]);
    }

    setForm({
      start_month: "",
      end_month: "",
      saving_amount: ""
    });

    setEditId(null);
    loadPlans();
  };

  /* ✅ DELETE PLAN */
  const deletePlan = async (id) => {
    if (!window.confirm("Delete?")) return;

    await supabase
      .from("saving_plans")
      .delete()
      .eq("id", id);

    loadPlans();
  };


  /* ✅ EDIT PLAN */
  const editPlan = (p) => {
    setForm({
      start_month: p.start_month?.split("T")[0],
      end_month: p.end_month?.split("T")[0],
      saving_amount: p.saving_amount,
    });

    setEditId(p.id);
  };

// ✅ display format
  const formatDisplay = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleString("default", {
      month: "long",
      year: "2-digit",
    });
  };

  const thStyle = {
    padding: "10px",
    borderBottom: "1px solid #ddd",
  };

  const tdStyle = {
    padding: "10px",
    borderBottom: "1px solid #eee",
  };

  const editBtn = {
    marginRight: 5,
    padding: "6px 10px",
    background: "#2007ff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  };

  const deleteBtn = {
    padding: "6px 10px",
    background: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  };

  const resetForm = () => {
    setEditId(null);  // ✅ exit edit mode

    setForm({
      start_month: "",
      end_month: "",
      saving_amount: ""
    });
  };

  return (
<div
  className="plans-page"
  style={{
    padding: 20,
    fontFamily: "Arial",
    maxWidth: 800,
    margin: "auto",
  }}
>
  <h1 className="page-title" style={{ textAlign: "center", marginBottom: 20 }}>
    💰 Saving Plans
  </h1>

  {/* ✅ TABLE CARD */}
  <div className="sheet-panel plans-list"
    style={{
      border: "1px solid #ddd",
      borderRadius: 10,
      padding: 15,
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    }}
  >
    <h3 className="panel-title" style={{ marginBottom: 10 }}>📊 Plans List</h3>

    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "center",
        }}
      >
        <thead>
          <tr style={{ background: "#f2f2f2" }}>
            <th style={thStyle}>Start</th>
            <th style={thStyle}>End</th>
            <th style={thStyle}>Amount</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {plans.map((p) => (
            <tr key={p.id}>
              <td style={tdStyle}>{formatDisplay(p.start_month)}</td>
              <td style={tdStyle}>{formatDisplay(p.end_month)}</td>
              <td style={tdStyle}>₹{p.saving_amount}</td>

              <td style={tdStyle}>
{/*                 <button
                  onClick={() => editPlan(p)}
                  style={editBtn}
                >
                  Edit
                </button>

                <button
                  onClick={() => deletePlan(p.id)}
                  style={deleteBtn}
                >
                  Delete
                </button> */}
                <button
                  onClick={() => editPlan(p)}
                  style={{
                    ...editBtn,
                    background: "#2007ff", // : "#9ca3af",
                    color: "#f4f4f8",
                    cursor: isAdmin ? "pointer" : "not-allowed",
                    opacity: isAdmin ? 1 : 0.6,
                  }}
                  disabled={!isAdmin}
                >
                  Edit
                </button>

                <button
                  onClick={() => deletePlan(p.id)}
                  style={{
                    ...deleteBtn,
                    background: "#dc3545",
                    cursor: isAdmin ? "pointer" : "not-allowed",
                    opacity: isAdmin ? 1 : 0.6,
                  }}
                  disabled={!isAdmin}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  <hr />

  {/* ✅ FORM CARD */}
  <h2 className="section-title">{editId ? "✏️ Edit Plan" : "➕ Add Plan"}</h2>
  <div className="sheet-panel plan-form"
    style={{
      border: "1px solid #ddd",
      borderRadius: 10,
      padding: 20,
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      marginBottom: 20,
    }}
  >
    <div className="plan-fields" style={{ display: "flex", gap: 15, flexWrap: "wrap" }}>
      
      <div style={{ flex: 1 }}>
        <label>Start Date</label>
        <input
          type="date"
          value={form.start_month}
          onChange={(e) =>
            setForm({ ...form, start_month: e.target.value })
          }
          style={{ width: "100%", padding: 8 }}
          disabled={!isAdmin}
        />
      </div>

      <div style={{ flex: 1 }}>
        <label>End Date</label>
        <input
          type="date"
          value={form.end_month}
          onChange={(e) =>
            setForm({ ...form, end_month: e.target.value })
          }
          style={{ width: "100%", padding: 8,
                    cursor: isAdmin ? "pointer" : "not-allowed",
                    opacity: isAdmin ? 1 : 0.6,
           }}
          disabled={!isAdmin}          
        />
      </div>

      <div style={{ flex: 1 }}>
        <label>Monthly Amount</label>
        <input
          placeholder="Enter Amount"
          value={form.saving_amount}
          onChange={(e) =>
            setForm({ ...form, saving_amount: e.target.value })
          }
          style={{ width: "100%", padding: 8,         
            cursor: isAdmin ? "pointer" : "not-allowed",
            opacity: isAdmin ? 1 : 0.6, 
          }}
          disabled={!isAdmin}
        />
      </div>
    </div>

    <button
      onClick={savePlan}
      style={{
        marginTop: 15,
        padding: "10px 15px",
        background: editId ? "#0b07ff" : "#28a745",
        color: "white",
        border: "none",
        borderRadius: 5,
        //background: isAdmin ? "#0b07ff": "#9ca3af",
        cursor: isAdmin ? "pointer" : "not-allowed",
        opacity: isAdmin ? 1 : 0.6,
      }}
      disabled={!isAdmin}

    >
      {editId ? "Update Plan" : "Add Plan"}
    </button>

              {"  "}
          {/* ✅ RESET BUTTON */}
            <button
              onClick={resetForm}
              style={{
                padding: "10px 18px",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontWeight: "bold",
                background: "#e68313",
                cursor: isAdmin ? "pointer" : "not-allowed",
                opacity: isAdmin ? 1 : 0.6,                
              }}
              disabled={!isAdmin}              
            >
              Reset
            </button>

  </div>
  <hr />

</div>
  );
}
