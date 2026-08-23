import React from "react";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { formatCurrency } from "../lib/format";

export default function Insights() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("all");

  useEffect(() => {
    const loadInsights = async () => {
      const { data } = await supabase
        .from("ledger")
        .select("date, member_id, loan, savings, principal, interest_collected, service_charge, members(name)")
        .order("date", { ascending: true });

      setLedger(data || []);
      setLoading(false);
    };

    loadInsights();
  }, []);

  const financialYearForDate = (date) => {
    const value = new Date(date);
    const startYear = value.getMonth() >= 3 ? value.getFullYear() : value.getFullYear() - 1;
    return startYear;
  };
  const financialYearLabel = (startYear) =>
    `Apr-${String(startYear).slice(-2)} to Mar-${String(startYear + 1).slice(-2)}`;
  const availableYears = [...new Set(ledger
    .filter((row) => row.date)
    .map((row) => financialYearForDate(row.date)))].sort((a, b) => b - a);
  const filteredLedger = selectedYear === "all"
    ? ledger
    : ledger.filter((row) => row.date && financialYearForDate(row.date) === Number(selectedYear));

  const memberTotals = filteredLedger.reduce((totals, row) => {
    const name = row.members?.name || "Unknown";
    if (!totals[name]) totals[name] = { name, savings: 0, loan: 0, outstanding: 0, paid: 0 };
    totals[name].savings += Number(row.savings || 0);
    totals[name].loan += Number(row.loan || 0);
    totals[name].outstanding = Number(row.principal || 0);
    totals[name].paid += Number(row.interest_collected || 0);
    return totals;
  }, {});

  const members = Object.values(memberTotals).sort((a, b) => b.outstanding - a.outstanding);
  const monthlyTotals = filteredLedger.reduce((totals, row) => {
    const date = row.date ? new Date(row.date) : null;
    const monthIndex = date ? date.getMonth() : -1;
    const month = date ? date.toLocaleString("en-IN", { month: "short" }) : "Unknown";
    if (!totals[month]) totals[month] = { month, monthIndex, amount: 0 };
    totals[month].amount += Number(row.savings || 0);
    return totals;
  }, {});
  const financialYearStartMonth = selectedYear === "all" ? 0 : 3;
  const monthly = Object.values(monthlyTotals).sort((a, b) => {
    const orderA = (a.monthIndex - financialYearStartMonth + 12) % 12;
    const orderB = (b.monthIndex - financialYearStartMonth + 12) % 12;
    return orderA - orderB;
  });
  const totalSavings = filteredLedger.reduce((total, row) => total + Number(row.savings || 0), 0);
  const totalLoans = filteredLedger.reduce((total, row) => total + Number(row.loan || 0), 0);
  const totalInterest = filteredLedger.reduce((total, row) => total + Number(row.interest_collected || 0), 0);
  const totalService = filteredLedger.reduce((total, row) => total + Number(row.service_charge || 0), 0);
  const totalOutstanding = members.reduce((total, member) => total + member.outstanding, 0);
  const totalLoanPaid = Math.max(totalLoans - totalOutstanding, 0);
  const warnings = [];
  const duplicateKeys = {};
  filteredLedger.forEach((row) => {
    const memberName = row.members?.name || "Unknown member";
    const key = `${row.member_id}-${row.date}`;
    duplicateKeys[key] = (duplicateKeys[key] || 0) + 1;
    if (!row.date) warnings.push(`${memberName}: missing date`);
    if (Number(row.principal || 0) < 0) warnings.push(`${memberName}: negative principal`);
  });
  Object.entries(duplicateKeys).forEach(([key, count]) => {
    if (count > 1) warnings.push(`Duplicate member/date entries: ${key}`);
  });
  const maxOutstanding = Math.max(...members.map((member) => member.outstanding), 1);
  const maxMonthlySavings = Math.max(...monthly.map(({ amount }) => amount), 1);
  const maxMemberLoan = Math.max(...members.map((member) => member.loan), 1);
  const loanMembers = [...members].sort((a, b) => b.loan - a.loan);
  if (loading) return <p className="insights-loading">Loading insights...</p>;

  return (
    <div className="insights-page">
      <div className="insights-heading">
        <div>
          <p className="eyebrow">NICE Savings / Overview</p>
          <h1 className="page-title">Financial Insights</h1>
          <p className="insights-subtitle">A visual view of the savings scheme performance.</p>
        </div>
        <div className="insights-controls">
          <label htmlFor="insights-year">Period</label>
          <select id="insights-year" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
            <option value="all">All years</option>
            {availableYears.map((year) => <option value={year} key={year}>{financialYearLabel(year)}</option>)}
          </select>
          <div className="insight-stat"><span>Ledger entries</span><strong>{filteredLedger.length}</strong></div>
        </div>
      </div>

      <div className="insight-kpis">
        <div><span>Total savings</span><strong>₹{formatCurrency(totalSavings)}</strong></div>
        <div><span>Loans issued</span><strong>₹{formatCurrency(totalLoans)}</strong></div>
        <div><span>Interest collected</span><strong>₹{formatCurrency(totalInterest)}</strong></div>
        <div><span>Service charges</span><strong>₹{formatCurrency(totalService)}</strong></div>
      </div>

      <div className="insight-grid">
        <section className="insight-panel member-chart">
          <div className="panel-heading"><h2>Loan exposure by member</h2><span>Latest outstanding principal</span></div>
          {members.length === 0 ? <p>No ledger data available.</p> : members.map((member) => (
            <div className="bar-row" key={member.name}>
              <div className="bar-label"><span>{member.name}</span><strong>₹{formatCurrency(member.outstanding)}</strong></div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(member.outstanding / maxOutstanding) * 100}%` }} /></div>
            </div>
          ))}
        </section>

        <section className="insight-panel split-panel">
          <div className="panel-heading"><h2>Fund composition</h2><span>Collected value streams</span></div>
          <div className="donut-wrap">
            <div className="donut-chart"><div><strong>₹{formatCurrency(totalSavings)}</strong><span>Savings</span></div></div>
            <div className="legend"><p><i className="legend-dot savings-dot" />Savings <strong>₹{formatCurrency(totalSavings)}</strong></p><p><i className="legend-dot interest-dot" />Interest <strong>₹{formatCurrency(totalInterest)}</strong></p><p><i className="legend-dot service-dot" />Service charges <strong>₹{formatCurrency(totalService)}</strong></p></div>
          </div>
          <div className="composition-chart">
            <div className="composition-chart-title"><span>Loan position</span><small>Issued vs collected</small></div>
            <div className="composition-bar-row"><span>Issued</span><div className="composition-bar-track"><div className="composition-bar issued-bar" style={{ width: `${totalLoans ? 100 : 0}%` }} /></div><strong>₹{formatCurrency(totalLoans)}</strong></div>
            <div className="composition-bar-row"><span>Collected</span><div className="composition-bar-track"><div className="composition-bar collected-bar" style={{ width: `${totalLoans ? (totalLoanPaid / totalLoans) * 100 : 0}%` }} /></div><strong>₹{formatCurrency(totalLoanPaid)}</strong></div>
            <div className="composition-bar-row"><span>Outstanding</span><div className="composition-bar-track"><div className="composition-bar outstanding-bar" style={{ width: `${totalLoans ? (totalOutstanding / totalLoans) * 100 : 0}%` }} /></div><strong>₹{formatCurrency(totalOutstanding)}</strong></div>
          </div>
        </section>

        <section className="insight-panel health-panel">
          <div className="panel-heading"><h2>Repayment health</h2><span>Loan position</span></div>
          <div className="health-metrics">
            <div><span>Issued</span><strong>₹{formatCurrency(totalLoans)}</strong></div>
            <div><span>Estimated collected</span><strong>₹{formatCurrency(totalLoanPaid)}</strong></div>
            <div><span>Outstanding</span><strong>₹{formatCurrency(totalOutstanding)}</strong></div>
          </div>
          <div className="repayment-track"><div style={{ width: `${totalLoans ? Math.min((totalLoanPaid / totalLoans) * 100, 100) : 0}%` }} /></div>
          <p className="health-caption">{totalLoans ? `${((totalLoanPaid / totalLoans) * 100).toFixed(1)}% of issued loans collected` : "No loan activity in this period"}</p>
        </section>

        <section className="insight-panel member-loan-chart">
          <div className="panel-heading"><h2>Loan obtained vs paid</h2><span>All members</span></div>
          <div className="loan-chart-legend"><span><i className="legend-dot obtained-dot" />Obtained</span><span><i className="legend-dot paid-dot" />Paid</span><span><i className="legend-dot outstanding-dot" />O/S</span></div>
          {loanMembers.length === 0 ? <p>No loan data available.</p> : loanMembers.map((member) => {
            const paid = Math.max(member.loan - member.outstanding, 0);
            return (
              <div className="member-loan-row" key={member.name}>
                <div className="member-loan-name">{member.name}</div>
                <div className="member-loan-bars">
                  <div className="member-loan-bar-line"><span>Obtained</span><div className="member-loan-track"><div className="member-loan-bar obtained-bar" style={{ width: `${(member.loan / maxMemberLoan) * 100}%` }} /></div><strong>₹{formatCurrency(member.loan)}</strong></div>
                  <div className="member-loan-bar-line"><span>Paid</span><div className="member-loan-track"><div className="member-loan-bar paid-bar" style={{ width: `${(paid / maxMemberLoan) * 100}%` }} /></div><strong>₹{formatCurrency(paid)}</strong></div>
                  <div className="member-loan-bar-line"><span>O/S</span><div className="member-loan-track"><div className="member-loan-bar outstanding-bar" style={{ width: `${(member.outstanding / maxMemberLoan) * 100}%` }} /></div><strong>₹{formatCurrency(member.outstanding)}</strong></div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="insight-panel monthly-chart">
          <div className="panel-heading"><h2>Monthly savings activity</h2><span>Ledger trend</span></div>
          <div className="column-chart">
            {monthly.length === 0 ? <p>No monthly data available.</p> : monthly.map(({ month, amount }) => (
              <div className="column-item" key={month}><div className="column-track"><div className="column-fill" style={{ height: `${(amount / maxMonthlySavings) * 100}%` }} /></div><span>{month}</span><small>₹{formatCurrency(amount)}</small></div>
            ))}
          </div>
        </section>

        <section className="insight-panel warning-panel">
          <div className="panel-heading"><h2>Data quality</h2><span>{warnings.length ? "Review recommended" : "No issues detected"}</span></div>
          <p className="quality-note">Negative savings and loan entries are treated as repayment or adjustment entries. Only missing dates, negative principal, and duplicate member/date records are listed.</p>
          {warnings.length ? <ul>{warnings.slice(0, 8).map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul> : <p className="clear-message">✓ Ledger values look consistent for this period.</p>}
        </section>
      </div>
    </div>
  );
}


