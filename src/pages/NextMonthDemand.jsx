import React from "react";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { formatCurrency } from "../lib/format";

export default function NextMonthDemand() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(null);
  const [draft, setDraft] = useState(null);

  const th = { padding: "12px", borderBottom: "2px solid #960e0e", fontWeight: "bold", fontSize: "14px" };
  const td = { padding: "10px", fontSize: "14px" };

  useEffect(() => {
    loadDemand();
  }, []);

  const loadDemand = async () => {
    setLoading(true);

    // 1. All members
    const { data: members } = await supabase.from("members").select("*").order("id");

    // 2. Active saving plan for today
    const today = new Date().toISOString().split("T")[0];
    const { data: plan } = await supabase
      .from("saving_plans")
      .select("*")
      .lte("start_month", today)
      .gte("end_month", today)
      .limit(1)
      .maybeSingle();

    const savings = Number(plan?.saving_amount || 0);

    // 3. For each member, get latest ledger entry to find current principal & MPS
    const results = await Promise.all(
      (members || []).map(async (m) => {
        const { data: latest } = await supabase
          .from("ledger")
          .select("principal, monthly_principal")
          .eq("member_id", m.id)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        const prevPrincipal = Number(latest?.principal || 0);
        const prevMPS = Number(latest?.monthly_principal || 0);

        const interest_demand = Number(((prevPrincipal * 0.8) / 100).toFixed(0));
        const monthly_principal = prevMPS > prevPrincipal ? prevPrincipal : prevMPS;
        const total = savings + interest_demand + monthly_principal;

        return { name: m.name, savings, interest_demand, monthly_principal, total };
      })
    );

    setRows(results);
    setLoading(false);
  };

  const totals = rows.reduce(
    (acc, r) => {
      acc.savings += r.savings;
      acc.interest_demand += r.interest_demand;
      acc.monthly_principal += r.monthly_principal;
      acc.total += r.total;
      return acc;
    },
    { savings: 0, interest_demand: 0, monthly_principal: 0, total: 0 }
  );

  const startEdit = (row) => {
    setEditingName(row.name);
    setDraft({ ...row });
  };

  const updateDraft = (field, value) => {
    const nextDraft = { ...draft, [field]: field === "name" ? value : Number(value || 0) };
    if (field !== "name") {
      nextDraft.total =
        Number(nextDraft.savings || 0) +
        Number(nextDraft.interest_demand || 0) +
        Number(nextDraft.monthly_principal || 0);
    }
    setDraft(nextDraft);
  };

  const saveEdit = () => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.name === editingName ? draft : row))
    );
    setEditingName(null);
    setDraft(null);
  };

  const exportToExcel = () => {
    const headers = ["Member", "Savings", "Interest Demand", "Monthly Principal", "Total"];
    const values = rows.map((row) => [
      row.name,
      row.savings,
      row.interest_demand,
      row.monthly_principal,
      row.total,
    ]);
    const csv = [headers, ...values]
      .map((line) => line.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "next-month-demand.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p style={{ textAlign: "center", marginTop: 40 }}>🔄 Loading...</p>;

  return (
    <div className="demand-page" style={{ padding: 20, fontFamily: "Arial" }}>
      <h1 className="page-title" style={{ textAlign: "center", fontSize: "32px", marginBottom: 20 }}>
        📅 Next Month Demand
      </h1>

      <div className="sheet-panel demand-panel" style={{ border: "1px solid #ddd", borderRadius: 10, padding: 15, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", background: "#f9fafb" }}>
        <div className="demand-toolbar">
          <p>Review and adjust the projected collection before exporting.</p>
          <button className="export-button" onClick={exportToExcel}>⇩ Export to Excel</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "600px", borderCollapse: "collapse", textAlign: "center" }}>
            <thead>
              <tr style={{ background: "#e9ecef" }}>
                <th style={th}>Member</th>
                <th style={th}>Savings</th>
                <th style={th}>Interest Demand</th>
                <th style={th}>Monthly Principal</th>
                <th style={th}>Total</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f9f9f9", borderBottom: "1px solid #eee" }}>
                  {editingName === r.name ? (
                    <>
                      <td style={td}><input className="demand-edit-input" value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} /></td>
                      <td style={td}><input className="demand-edit-input" type="number" value={draft.savings} onChange={(e) => updateDraft("savings", e.target.value)} /></td>
                      <td style={td}><input className="demand-edit-input" type="number" value={draft.interest_demand} onChange={(e) => updateDraft("interest_demand", e.target.value)} /></td>
                      <td style={td}><input className="demand-edit-input" type="number" value={draft.monthly_principal} onChange={(e) => updateDraft("monthly_principal", e.target.value)} /></td>
                      <td style={{ ...td, fontWeight: "bold" }}>₹{formatCurrency(draft.total)}</td>
                      <td style={td}>
                        <button className="row-action save-action" onClick={saveEdit}>Save</button>
                        <button className="row-action cancel-action" onClick={() => { setEditingName(null); setDraft(null); }}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={td}>{r.name}</td>
                      <td style={td}>₹{formatCurrency(r.savings)}</td>
                      <td style={td}>₹{formatCurrency(r.interest_demand)}</td>
                      <td style={td}>₹{formatCurrency(r.monthly_principal)}</td>
                      <td style={{ ...td, fontWeight: "bold" }}>₹{formatCurrency(r.total)}</td>
                      <td style={td}><button className="row-action edit-action" onClick={() => startEdit(r)}>Edit</button></td>
                    </>
                  )}
                </tr>
              ))}
              <tr style={{ background: "#e0f2fe", fontWeight: "bold", borderTop: "2px solid #333" }}>
                <td style={td}>TOTAL</td>
                <td style={td}>₹{formatCurrency(totals.savings)}</td>
                <td style={td}>₹{formatCurrency(totals.interest_demand)}</td>
                <td style={td}>₹{formatCurrency(totals.monthly_principal)}</td>
                <td style={td}>₹{formatCurrency(totals.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
