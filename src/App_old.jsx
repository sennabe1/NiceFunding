import React from "react";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Login from "./Login";

/* ✅ NAV STYLE */
const navBtn = {
  marginLeft: 10,
  padding: "8px 14px",
  background: "#49d1e9",
  color: "#080808",
  border: "none",
  borderRadius: 5,
  cursor: "pointer",
};

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  /* ✅ AUTO LOGIN ON REFRESH */
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      
/*       if (data.user?.email) {
        const { data: member } = await supabase
          .from("members")
          .select("*")
          .eq("email", data.user.email)
          .single();

        setCurrentUser(member);
      } */
      //console.log("CurrentUser:", member);

      setLoading(false);       
    };

    getUser();
  }, []);


useEffect(() => {
    const hash = window.location.hash;

    if (hash && hash.includes("access_token")) {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  }, []);


useEffect(() => {
  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user || null);
    }
  );

  return () => {
    listener.subscription.unsubscribe();
  };
}, []);

useEffect(() => {
  const loadMember = async () => {
    if (!user?.email) return;

    const { data: member } = await supabase
      .from("members")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();


      if (!member) {
        alert("❌ You are not authorized to access this app");

        await supabase.auth.signOut();
        setUser(null);
        return;
      }
      setCurrentUser(member);
  };
  loadMember();
}, [user]);   // ✅ TRIGGER WHEN USER CHANGES  
  

if (loading) {
  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      <h3>🔄 Money flowing in...</h3>
    </div>
  );
}


  /* ✅ SHOW LOGIN IF NOT LOGGED IN */
  if (!user) {
    return <Login setUser={setUser} />;
  }


  return (
    <div style={{ padding: 20 }}>

        {/* ✅ RESPONSIVE HEADER */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",      // ✅ mobile first
            alignItems: "center",
            gap: 8,
            padding: "12px",
            background: "#435d83",
            color: "white",
            borderRadius: 8,
            marginBottom: 20,
          }}
        >

{/*         <h2
          style={{
            color: "white",
            margin: 0,
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)", // ✅ center
          }}
        >
          💰 NICE Savings Scheme
        </h2>
        
        <h5>
          Welcome {currentUser?.name}  {/*|| user?.email}/}
          {currentUser?.role && ` (${currentUser.role})`}
          {/*console.log("CurrentUser:-", currentUser)/}
        </h5> */}


        {/* ✅ TITLE */}
        <div
          style={{
            fontSize: "28px",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          💰 NICE Savings Scheme
        </div>

        {/* ✅ USER INFO */}
        <div style={{ fontSize: "14px", opacity: 1.0, textAlign: "left" }}>
          Welcome {currentUser?.name} {/*|| user?.email*/}
          {currentUser?.role && ` (${currentUser.role})`}
        </div>


        <div>
          <button style={navBtn} onClick={() => setPage("dashboard")}>
            Dashboard
          </button>
          <button style={navBtn} onClick={() => setPage("plans")}>
            Saving Plans
          </button>
          <button style={navBtn} onClick={() => setPage("demand")}>
            Next Month Demand
          </button>
          <button style={navBtn} onClick={() => setPage("insights")}>
            Insights
          </button>

          
          {/* ✅ LOGOUT */}
          <button
            style={navBtn}
            onClick={async () => {
              await supabase.auth.signOut();
              setUser(null);
            }}
          >
            Logout
          </button>

        </div>
      </div>

      {page === "dashboard" && <Dashboard currentUser={currentUser}/>}
      {page === "plans" && <SavingPlans currentUser={currentUser} />}
      {page === "demand" && <NextMonthDemand />}
      {page === "insights" && <Insights />}
    </div>
  );
}

function Insights() {
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


const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN");


/* ========================================================== */
/* ✅ DASHBOARD  */
/* ========================================================== */

function Dashboard( {currentUser }) {
  const [dashboard, setDashboard] = useState({});
  const [ledger, setLedger] = useState([]);
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState([]);
  const [summarySearch, setSummarySearch] = useState("");
  const [summarySort, setSummarySort] = useState({ key: "loan_os", direction: "desc" });
  //const [currentUser, setCurrentUser] = useState(null);

  const [editId, setEditId] = useState(null);

  const [report, setReport] = useState([]);
  const [reportSort, setReportSort] = useState({ key: "year", direction: "asc" });
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [profitShare, setProfitShare] = useState(0);
  const [totalSavingTillFY, setTotalSavingTillFY] = useState(0);
  const [outstandingLoan, setOutstandingLoan] = useState(0);  

  const [prevPrincipal, setPrevPrincipal] = useState(0);

  const years = [2022, 2023, 2024, 2025, 2026, 2027];

  const percentage = 0; //Number(form.service_percentage || 0);

  const service_charge = 0;
//    (Number(form.loan || 0) * percentage) / 100;  

  const [form, setForm] = useState({
    date: "",
    member_id: "",
    monthly_principal: "",
    loan: "",
    savings: "",
    interest_demand: "",
    interest_collected: "",
    interest_os: "",
    service_charge: "",
    service_percentage: ""
  });

  /* ✅ STYLES (UNCHANGED) */

  const th = {
  padding: "12px",
  borderBottom: "2px solid #960e0e",
  fontWeight: "bold",
  fontSize: "14px",
  };

  const td = {
  padding: "10px",
  fontSize: "14px",
  };

  const editBtn = {
  marginRight: 6,
  padding: "6px 10px",
  background: "#2007ff",
  border: "none",
  borderRadius: 5,
  cursor: "pointer",
  };

  const deleteBtn = {
  padding: "6px 10px",
  background: "#dc3545",
  color: "white",
  border: "none",
  borderRadius: 5,
  cursor: "pointer",
  };

  const card = {
    padding: "15px",
    borderRadius: "10px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  };

  const value = {
    marginTop: "10px",
    fontSize: "20px",
    fontWeight: "bold",
  };
  
  const inputStyle = {
  width: "100%",
  padding: "8px",
  marginTop: "5px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  fontSize: "14px",
  };

  useEffect(() => {
    loadAll();
  }, []);

  /* ✅ LOAD ALL DATA */
  const loadAll = async () => {
    loadMembers();
    loadLedger();
    loadDashboard();
    loadSummary();
    loadProfitShare();
    //loadSavingsTillFY();
    //loadCurrentUser();
  };

  const loadCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();

    const email = data.user?.email;

    if (!email) return;

    const { data: member } = await supabase
      .from("members")
      .select("*")
      .eq("email", email)
      //.single();
      .maybeSingle();
      setCurrentUser(member);
  };

  const isAdmin = currentUser?.role?.toLowerCase() === "admin";
  
  

  const loadMembers = async () => {
    const { data } = await supabase.from("members").select("*").order("id");
    setMembers(data || []);
  };

  const loadLedger = async () => {
    const { data } = await supabase
      .from("ledger")
      .select("*, members(name)")
      .order("date", { ascending: false });

    setLedger(
      (data || []).map(row => ({
        ...row,
        name: row.members?.name
      }))
    );
  };

  const loadDashboard = async () => {
    const { data, error } = await supabase.rpc("dashboard_summary");
    
    if (error) {
      console.log(error);
      return;
    }


    if (data && data.length > 0) {
      setDashboard(data[0]);
    } else {
      setDashboard({});
    }
  };

  const loadSummary = async () => {
    const { data, error } = await supabase.rpc("member_summary");

    if (error) {
      console.log(error);
      return;
    }

    setSummary(data || []);
  };

  /* ✅ SAVE ENTRY */
  const saveEntry = async () => {
    if (!form.member_id || !form.date) return alert("Enter data");

    const payload = {      
      date: form.date,
      member_id: Number(form.member_id),
      loan: Number(form.loan || 0),
      savings: Number(form.savings || 0),
      monthly_principal: Number(form.monthly_principal || 0),
      interest_demand: Number(form.interest_demand || 0),
      interest_collected: Number(form.interest_collected || 0),
      interest_os: Number(form.interest_os || 0),
      principal: Number(form.principal || 0),
      service_charge: (Number(form.service_charge || 0)),
      service_percentage: form.service_percentage || "2%",
      status: form.status || "Pending"
    };
    //console.log("FINAL PAYLOAD:", payload);

    if (editId !== null) {
      await supabase.from("ledger").update(payload).eq("id", editId);
    } else {
      await supabase.from("ledger").insert([payload]);
    }

    //console.log("EDIT ID:", editId);
    //console.log("FORM:", form);

    setEditId(null);
    
    setForm({
      date: "",
      member_id: "",
      monthly_principal: "",
      loan: "",
      savings: "",
      interest_demand: "",
      interest_collected: "",
      interest_os: "",
      service_charge: "",
      service_percentage: "",
      status: ""
    });

    loadAll();
  };

  const deleteEntry = async (id) => {
    if (!window.confirm("Delete entry?")) return;

    await supabase.from("ledger").delete().eq("id", id);
    loadAll();
  };

  const editEntry = (row) => {
    setEditId(row.id);
    setForm({

        date: row.date?.split("T")[0],
        member_id: row.member_id,
        loan: row.loan,
        savings: row.savings,
        monthly_principal: row.monthly_principal,
        interest_demand: row.interest_demand,
        interest_collected: row.interest_collected,
        interest_os: row.interest_os,
        principal: row.principal,
        service_charge: row.service_charge,
        service_percentage: row.service_percentage,
        status: row.status
    });
  };


  const resetForm = () => {
    setEditId(null);  // ✅ exit edit mode

    setForm({
      date: "",
      member_id: "",
      monthly_principal: "",
      loan: "",
      savings: "",
      interest_demand: "",
      interest_collected: "",
      interest_os: "",
      principal: "",
      service_charge: "",
      service_percentage: "",
      status: ""
    });
  };
    
  const calculatePrincipal = (loan, mps) => {
    return (
      Number(prevPrincipal || 0) +
      Number(loan || 0) -
      Number(mps || 0)
    );
  };
  const populateEntry = async () => {
    if (!form.member_id) {
      alert("Please select a member first");
      return;
    }

    const memberId = Number(form.member_id);

    // ✅ 1. Current date
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0];
    //console.log("Formated Date:-", formattedDate);
    // ✅ 2. Previous month date
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const startDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth(), 1);

    // ✅ 3. Get previous month ledger
    const { data: prevData } = await supabase
      .from("ledger")
      .select("*")
      .eq("member_id", memberId)
      .gte("date", startDate.toISOString())
      .lt("date", endDate.toISOString())
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
      //console.log("ledger prev Data:-", prevData);      

    // ✅ 4. Get savings from saving_plans
    const { data: plan } = await supabase
      .from("saving_plans")
      .select("*")
      .lte("start_month", formattedDate)
      .gte("end_month", formattedDate)
      .limit(1)
      .maybeSingle();

    //console.log("Saving_Plans Data:-", plan);
      // ✅ Derived values
    //const monthly_principal = prevData?.monthly_principal || 0;
    
    const prevMPS = Number(prevData?.monthly_principal || 0);
    const prevPrincipal = Number(prevData?.principal || 0);
    const principal = Math.max(prevPrincipal - prevMPS, 0);


    setPrevPrincipal(prevData?.principal || 0);




    // ✅ Apply rule
    const monthly_principal =
    prevMPS > prevPrincipal ? prevPrincipal : prevMPS;

    const interest_demand = Number(
      ((prevPrincipal * 0.8) / 100).toFixed(0)
    );

    const interest_collected = interest_demand;

    const interest_os =
      interest_demand - interest_collected;

    const savings = Number(plan?.saving_amount || 0);
    const servicePercentage = 2;
    const loan = 0;
    const populatedServiceCharge = (servicePercentage * loan) / 100;

    // ✅ Set form
    setForm({
      date: formattedDate,
      member_id: memberId,
      monthly_principal,
      loan,
      savings,
      interest_demand,
      interest_collected,
      interest_os,
      principal,      
      service_charge: populatedServiceCharge,
      service_percentage: String(servicePercentage),
      status: "Pending",
    });
  };

  const toggleMember = (id) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const toggleYear = (y) => {
    setSelectedYears(prev =>
      prev.includes(y) ? prev.filter(v => v !== y) : [...prev, y]
    );
  };

  
  const getFinancialYear = (year) => {
    const startYear = String(year).slice(-2);
    const endYear = String(year + 1).slice(-2);

    return `Apr-${startYear} to Mar-${endYear}`;
  };

  const totals = report.reduce(
    (acc, row) => {
      acc.monthly_principal += Number(row.monthly_principal || 0);
      acc.interest_demand += Number(row.interest_demand || 0);
      acc.interest_collected += Number(row.interest_collected || 0);
      acc.interest_os += Number(row.interest_os || 0);
      acc.principal += Number(row.principal || 0);
      acc.loan += Number(row.loan || 0);
      acc.savings += Number(row.savings || 0);
      acc.service_charge += Number(row.service_charge || 0);
      acc.savingsAndProfit += Number(row.savings || 0);
      return acc;
    },
    {
      monthly_principal: 0,
      interest_demand: 0,
      interest_collected: 0,
      interest_os: 0,
      principal: 0,
      loan: 0,
      savings: 0,
      service_charge: 0,
      outstanding_principal: 0,
      savingsAndProfit: 0,
    }
  );

  const latestReportRow = report[report.length - 1];
  totals.outstanding_principal = Number(latestReportRow?.principal || 0);

  const sortReport = (key) => {
    setReportSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };
  const sortedReport = [...report].sort((first, second) => {
    const firstValue = ["name", "month"].includes(reportSort.key)
      ? String(first[reportSort.key] || "")
      : Number(first[reportSort.key] || 0);
    const secondValue = ["name", "month"].includes(reportSort.key)
      ? String(second[reportSort.key] || "")
      : Number(second[reportSort.key] || 0);
    const comparison = firstValue < secondValue ? -1 : firstValue > secondValue ? 1 : 0;
    return reportSort.direction === "asc" ? comparison : -comparison;
  });
  const sortIndicator = (key) => reportSort.key === key
    ? reportSort.direction === "asc" ? " ↑" : " ↓"
    : "";

  const savingsByMember = ledger.reduce((totalsByMember, row) => {
    const memberName = row.name;
    totalsByMember[memberName] =
      (totalsByMember[memberName] || 0) + Number(row.savings || 0);
    return totalsByMember;
  }, {});

/*   const groupedTotals = report.reduce((acc, row) => {
    const fy = row.financial_year;

    if (!acc[fy]) {
      acc[fy] = {
        monthly_principal: 0,
        interest_demand: 0,
        interest_collected: 0,
        interest_os: 0,
        principal: 0,
        loan: 0,
        savings: 0,
        service_charge: 0,
        outstanding_principal: 0,
        savingsAndProfit: 0,        
      };
    }

    acc[fy].monthly_principal += Number(row.monthly_principal || 0);
    acc[fy].interest_demand += Number(row.interest_demand || 0);
    acc[fy].interest_collected += Number(row.interest_collected || 0);
    acc[fy].interest_os += Number(row.interest_os || 0);
    acc[fy].principal += Number(row.principal || 0);
    acc[fy].loan += Number(row.loan || 0);
    acc[fy].savings += Number(row.savings || 0);
    acc[fy].service_charge += Number(row.service_charge || 0);
    acc[fy].outstanding_principal = Number(row.principal || 0);
    acc[fy].savingsAndProfit += Number(row.savings || 0);    

    return acc;
  }, {}); */


  const loadProfitShare = async () => {
    const { data, error } = await supabase.rpc(
      "profit_share_till_financial_year",
      { p_financial_year: 2023 }
    );

    if (error) {
      console.error(error);
      return;
    }

    // console.log("Profit Share:", data);
    return data;
  };

  const loadReport = async () => {


    if (!selectedMember || !selectedYear) {
      alert("Select member and year");
      return;
    }


    const { data, error } = await supabase.rpc("monthly_report", {
      member_ids: [selectedMember],
      years: [selectedYear],
    });

    if (error) {
      console.log(error);
      return;
    }

    setReport(data || []);

    // ✅ 2. LOAD PROFIT SHARE
    const { data: profitData, error: profitError } =
      await supabase.rpc("profit_share_till_financial_year", {
        p_financial_year: selectedYear,
      });
/*     console.log("selectedMember:",selectedMember);
    console.log("selectedYear:",selectedYear);    
    console.log("profit_share_till_financial_year:",profitData); */

    if (!profitError && profitData?.length > 0) {
      setProfitShare(
        Number(profitData[0].profit_share_per_person || 0)
      );
    }

    const { data: outstandingLoan , error: outstandingLoanError } =
      await supabase.rpc("outstandingloan_till_financial_year", {
        p_member_id: selectedMember,
        p_financial_year: selectedYear,
      });
/*     console.log("selectedMember:",selectedMember);
    console.log("selectedYear:",selectedYear);    
    console.log("outstandingloan_till_financial_year:",outstandingLoan); */

    if (outstandingLoanError) {
      console.error("Loan Error:", outstandingLoanError);
      return;
    }

    if (!outstandingLoanError && outstandingLoan?.length > 0) {
      setOutstandingLoan(
        Number(outstandingLoan[0].outstanding_loan || 0)
      );
    }    

    const { data: SavingsTillFY, error: SavingsTillFYError } = await supabase.rpc(
      "savings_till_financial_year",
      {
        p_member_id: selectedMember,
        p_financial_year: selectedYear,
      }
    );

    // console.log("Savings till selected FY:",SavingsTillFY);
    if (SavingsTillFYError) {
      console.error("Savings Error:", SavingsTillFYError);
      return;
    }

    if (SavingsTillFY?.length > 0) {
      setTotalSavingTillFY(
        Number(SavingsTillFY[0].total_savings || 0)
      );
    }   

  };


  const finalAmount =
    Number(totalSavingTillFY || 0) +
    Number(profitShare || 0);


  const totalSavings = Number(dashboard.total_savings || 0);
  const totalLoan = Number(dashboard.total_loan || 0);
  const LoanPaid = Number(dashboard.loan_paid || 0);
  const netProfit = Number(dashboard.net_profit || 0);

  /* ✅ NEW CALCULATIONS */
  const loanOS = totalLoan-LoanPaid;


  const savingPerHead = Number(
    ((totalSavings + netProfit) / (members.length || 1)).toFixed(2)
  );




  const cashInBank =
    totalSavings + netProfit - loanOS;

  const sortSummary = (key) => {
    setSummarySort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };
  const summarySortIndicator = (key) => summarySort.key === key
    ? summarySort.direction === "asc" ? " ↑" : " ↓"
    : "";
  const filteredSummary = summary
    .filter((row) => String(row.name || "").toLowerCase().includes(summarySearch.toLowerCase()))
    .sort((first, second) => {
      const firstValue = summarySort.key === "name"
        ? String(first.name || "")
        : summarySort.key === "loan_os"
          ? Number(first.total_loan || 0) - Number(first.loan_paid || 0)
          : Number(first[summarySort.key] || 0);
      const secondValue = summarySort.key === "name"
        ? String(second.name || "")
        : summarySort.key === "loan_os"
          ? Number(second.total_loan || 0) - Number(second.loan_paid || 0)
          : Number(second[summarySort.key] || 0);
      const comparison = firstValue < secondValue ? -1 : firstValue > secondValue ? 1 : 0;
      return summarySort.direction === "asc" ? comparison : -comparison;
    });

   return (
    <div className="dashboard-page" style={{ padding: 20, fontFamily: "Arial" }}>
      {/* ✅ DASHBOARD */}
        <div style={{ padding: 20, fontFamily: "Arial", color: "Black" }}>
          {/* <h1 style={{ marginBottom: 10,fontSize: "32px", opacity: 1.0, textAlign: "center" }}>💰 Savings Dashboard</h1> */}

<h2
  className="dashboard-title"
  style={{
    textAlign: "center",
    margin: "10px 0 15px",
    fontSize: "32px",
  }}
>
  📊 Savings Dashboard
</h2>
          <br></br>
          <br></br>
          {/* ✅ DASHBOARD CARDS */}
          <div
            className="kpi-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 15,
            }}
          >
            <div className="kpi-card" style={{ ...card, background: "#e0f2fe" }}>
              <h3>💰 Team's Savings</h3>
              <p style={value}>₹{formatCurrency(dashboard.total_savings)}</p>
            </div>

      {/* <div style={{ ...card, background: "linear-gradient(135deg, #435d83, #e0ebf1)" }}> */}
            <div className="kpi-card" style={{ ...card, background: "#fef9c3" }}>
              <h3>📈 Net Profit</h3>
              <p style={{ ...value, color: "green" }}>
                ₹{formatCurrency(dashboard.net_profit)}
              </p>
            </div>

            <div className="kpi-card" style={{ ...card, background: "#f8d2da" }}>
              <h3>💼 Total Fund Value</h3>
              <p style={value}>₹{formatCurrency(dashboard.total_savings+dashboard.net_profit)}</p>
            </div>

            {/* ✅ Saving per Head */}
            <div className="kpi-card" style={{ ...card, background: "#f0fdf4" }}>
              <h3>👤 Saving per Head</h3>
              <p style={value}>
              ₹{formatCurrency(savingPerHead.toFixed(0))}
              </p>
            </div>

            <div className="kpi-card" style={{ ...card, background: "#ede9fe" }}>
              <h3>📤 Loan given so far</h3>
              <p style={value}>₹{formatCurrency(dashboard.total_loan)}</p>
            </div>

            <div className="kpi-card" style={{ ...card, background: "#fef9c3" }}>
              <h3>📥 Loan Coll. so far</h3>
              <p style={value}>₹{formatCurrency(dashboard.loan_paid)}</p>
            </div>

            {/* <div style={{ ...card, background: "#fee2e2" }}>
              <h3>📉 Pending</h3>
              <p style={{ ...value, color: "red" }}>
                ₹{dashboard.interest_pending}
              </p>
            </div> */}

            {/* ✅ Cash in Bank */}
            <div className="kpi-card" style={{ ...card, background: "#e0f7fa" }}>
              <h3>🏦 Cash in Bank</h3>
              <p style={{ ...value, color: "green" }}>
              ₹{formatCurrency(cashInBank.toFixed(0))}
              </p>
            </div>

            <div className="kpi-card" style={{ ...card, background: "#fef9c3" }}>
              <h3>💸 SC Profit</h3>
              <p style={value}>₹{formatCurrency(dashboard.sc_profit)}</p>
            </div>

            <div className="kpi-card" style={{ ...card, background: "#dcfce7" }}>
              <h3>💵 Int Profit</h3>
              <p style={value}>₹{formatCurrency(dashboard.interest_profit)}</p>
            </div>

            {/* ✅ Loan O/S */}
            <div className="kpi-card" style={{ ...card, background: "#ffe4e6" }}>
              <h3>📉 Loan O/S</h3>
              <p style={{ ...value, color: "red" }}>
              ₹{formatCurrency(loanOS)}
              </p>
            </div>
            
          </div>
        </div>

        <hr />

        {/* ✅ MEMBER SUMMARY */}
        <h1 style={{ marginBottom: 15,fontSize: "32px", opacity: 1.0, textAlign: "center" }}>👥 Member Summary</h1>
        <br></br>     
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 15,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            background: "#f9fafb",
          }}
        >
          <div className="summary-toolbar">
            <input
              type="search"
              placeholder="Search member"
              value={summarySearch}
              onChange={(event) => setSummarySearch(event.target.value)}
              aria-label="Search member summary"
            />
            <span>{filteredSummary.length} of {summary.length} members</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              className="member-summary-table"
              style={{
                width: "100%",
                minWidth: "900px",
                borderCollapse: "collapse",
                textAlign: "center",
              }}
            >
              <thead>
                <tr style={{ background: "#e9ecef" }}>
                  <th style={th}><button className="sort-heading" onClick={() => sortSummary("name")}>Member{summarySortIndicator("name")}</button></th>
                  <th style={th}><button className="sort-heading" onClick={() => sortSummary("total_savings")}>Savings{summarySortIndicator("total_savings")}</button></th>
                  <th style={th}><button className="sort-heading" onClick={() => sortSummary("total_loan")}>Loan Taken{summarySortIndicator("total_loan")}</button></th>
                  <th style={th}><button className="sort-heading" onClick={() => sortSummary("loan_paid")}>Loan Paid{summarySortIndicator("loan_paid")}</button></th>
                  <th style={th}><button className="sort-heading" onClick={() => sortSummary("loan_os")}>Loan O/S{summarySortIndicator("loan_os")}</button></th>
                  <th style={th}><button className="sort-heading" onClick={() => sortSummary("interest_profit")}>Interest Paid{summarySortIndicator("interest_profit")}</button></th>
                  <th style={th}><button className="sort-heading" onClick={() => sortSummary("sc_profit")}>SC Paid{summarySortIndicator("sc_profit")}</button></th>
                </tr>
              </thead>

              <tbody>
                {filteredSummary.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      background: i % 2 === 0 ? "#ffffff" : "#f9f9f9",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <td style={td}>{row.name}</td>

                     <td style={td}>
                      {/* ₹{formatCurrency(savingsByMember[row.name] || 0)} */}
                      ₹{formatCurrency(savingPerHead.toFixed(0))}
                    </td>

                    <td style={td}>₹{formatCurrency(row.total_loan)}</td>

                    <td style={td}>₹{formatCurrency(row.loan_paid)}</td>

                    <td style={td}>₹{formatCurrency(row.total_loan-row.loan_paid)}</td>

                    <td style={td}>₹{formatCurrency(row.interest_profit)}</td>

                    <td style={td}>₹{formatCurrency(row.sc_profit)}</td>


{/*                     <td
                      style={{
                        ...td,
                        color:
                          row.interest_pending > 0 ? "red" : "green",
                        fontWeight: "bold",
                      }}
                    >
                      ₹{row.interest_pending}
                    </td>
 */}
 
{/*                     <td
                      style={{
                        ...td,
                        color: "green",
                        fontWeight: "bold",
                      }}
                    >
                      ₹{row.net_profit}
                    </td> */}
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      <br></br>
      <hr />

      {/* ✅ LEDGER */}
      <h1 style={{ marginBottom: 15,fontSize: "32px", opacity: 1.0, textAlign: "center" }}>📒 Ledger</h1>
      <br></br>    

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 15,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          background: "#f4f6f8",
          color: "#212529"
        }}
      >
        <div
          style={{
            overflowX: "auto",     // ✅ Horizontal scroll
            overflowY: "auto",     // ✅ Vertical scroll
            maxHeight: "450px",    // ✅ Limit visible rows
          }}
        >
          <table
            style={{
              width: "990px",     // ✅ Force horizontal scroll
              borderCollapse: "collapse",
              textAlign: "center",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#e9ecef",
                  position: "sticky",   // ✅ Sticky header
                  top: 0,
                  zIndex: 2,
                }}
              >
                <th style={th}>Date</th>
                <th style={th}>Member</th>
                <th style={th}>Loan</th>
                <th style={th}>Savings</th>
                <th style={th}>M.P.S</th>
                <th style={th}>Outstanding Principal</th>
                <th style={th}>Int Dem</th>
                <th style={th}>Int Coll</th>
                <th style={th}>Int O/S</th>
                <th style={th}>SC</th>
                <th style={th}>SC %</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {ledger.map((row, index) => (
                <tr
                  key={row.id}
                  style={{
                    background: index % 2 === 0 ? "#ffffff" : "#f9f9f9",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {new Date(row.date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    })}
                  </td>

                  <td style={{ ...td, whiteSpace: "nowrap" }}>{row.name}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{row.loan}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{row.savings}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{row.monthly_principal}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{row.principal}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{row.interest_demand}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{row.interest_collected}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{row.interest_os}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{row.service_charge}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{row.service_percentage}</td>
                  
                    <td style={td}>
                      <button onClick={() => editEntry(row)} 
                        style={{...editBtn,                    
                          background: "#2007ff",
                          color: "#f4f4f8",
                          cursor: isAdmin ? "pointer" : "not-allowed",
                          opacity: isAdmin ? 1 : 0.6,
                        }}
                        disabled={!isAdmin}
                      >
                        Edit
                      </button>
                      <button onClick={() => deleteEntry(row.id)} 
                        style={{...deleteBtn,
                          background: "#dc3545",
                          color: "#f4f4f8",
                          cursor: isAdmin ? "pointer" : "not-allowed",
                          opacity: isAdmin ? 1 : 0.6,
                          margin: "0 10px"
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

      <br></br>
      <hr />

      {/* ✅ MONTHLY REPORT */}
      <h2 style={{ marginBottom: 10, color: "#111827" }}>
        
      </h2>
      <h1 style={{ marginBottom: 15,fontSize: "32px", opacity: 1.0, textAlign: "center" }}>📅 Monthly Report</h1>
      <br></br>       
      <div
        className="monthly-report-results"
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          background: "#f3f4f6",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          marginBottom: 20,
        }}
      >
        {/* ✅ FILTER SECTION */}
        <div style={{ marginBottom: 15 }}>
          <h4 style={{ color: "#374151" }}>Select Members</h4>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {members.map((m) => (
              <label
                key={m.id}
                style={{
                  background: "#e5e7eb",
                  color: "#1f2937",
                  padding: "6px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >

                <input
                  type="radio"
                  name="member"
                  value={m.id}
                  checked={selectedMember === m.id}
                  onChange={() => setSelectedMember(m.id)}
                />

                {m.name}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 15 }}>
          <h4 style={{ color: "#374151" }}>Select Financial Years</h4>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {years.map((y) => (
              <label
                key={y}
                style={{
                  background: "#e5e7eb",
                  color: "#1f2937",
                  padding: "6px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >



    <input
      type="radio"
      name="year"
      value={y}
      checked={selectedYear === y}
      onChange={() => setSelectedYear(y)}
    />

    {getFinancialYear(y)}   {/* ✅ updated */}
  </label>

            ))}
          </div>
        </div>

        {/* ✅ BUTTON */}
        <div className="report-toolbar">
          <span>{report.length ? `${report.length} monthly records` : "Choose a member and financial year"}</span>
          {report.length > 0 && <span>Click a column heading to sort</span>}
        </div>
        <button
          onClick={loadReport}
          style={{
            padding: "10px 18px",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 2px 6px rgba(37,99,235,0.4)",
          }}
        >
          Generate Report
        </button>
      </div>

      {/* ✅ TABLE */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 15,
          background: "#ffffff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            className="monthly-report-table"
            style={{
              width: "100%",
              minWidth: "1000px",
              borderCollapse: "collapse",
              textAlign: "center",
            }
        }
          >
            <thead>              
              <tr style={{ background: "#f1f5f9" }}>
                <th style={{ ...th, color: "#111827" }}><button className="sort-heading" onClick={() => sortReport("name")}>Member{sortIndicator("name")}</button></th>
                <th style={{ ...th, color: "#111827" }}><button className="sort-heading" onClick={() => sortReport("year")}>Year{sortIndicator("year")}</button></th>
                <th style={{ ...th, color: "#111827" }}><button className="sort-heading" onClick={() => sortReport("month")}>Month{sortIndicator("month")}</button></th>
                <th style={{ ...th, color: "#111827" }}><button className="sort-heading" onClick={() => sortReport("monthly_principal")}>M.P.S{sortIndicator("monthly_principal")}</button></th>
                <th style={{ ...th, color: "#111827" }}><button className="sort-heading" onClick={() => sortReport("interest_demand")}>Int Dem{sortIndicator("interest_demand")}</button></th>
                <th style={{ ...th, color: "#111827" }}><button className="sort-heading" onClick={() => sortReport("interest_collected")}>Int Coll{sortIndicator("interest_collected")}</button></th>
                <th style={{ ...th, color: "#111827" }}><button className="sort-heading" onClick={() => sortReport("interest_os")}>Int O/S{sortIndicator("interest_os")}</button></th>
                <th style={{ ...th, color: "#111827" }}><button className="sort-heading" onClick={() => sortReport("principal")}>Principal{sortIndicator("principal")}</button></th>
                <th style={{ ...th, color: "#111827" }}><button className="sort-heading" onClick={() => sortReport("loan")}>Loan{sortIndicator("loan")}</button></th>
                <th style={{ ...th, color: "#111827" }}><button className="sort-heading" onClick={() => sortReport("savings")}>Savings{sortIndicator("savings")}</button></th>
                <th style={{ ...th, color: "#111827" }}><button className="sort-heading" onClick={() => sortReport("service_charge")}>SC{sortIndicator("service_charge")}</button></th>
		            {/* <th style={{ ...th, color: "#111827" }}>Actions</th> */}
              </tr>
            </thead>
            <tbody>
              {sortedReport.map((r, i) => (
                <tr
                  key={i}
                  style={{
                    background: i % 2 === 0 ? "#ffffff" : "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <td style={{ ...td, color: "#2563eb", fontWeight: 500 }}>
                    {r.name}
                  </td>

                  <td style={{ ...td, color: "#374151" }}>{(r.year)}</td>
                  <td style={{ ...td, color: "#374151" }}>{r.month}</td>


                  <td style={{ ...td, color: "#374151" }}>
                    ₹{formatCurrency(r.monthly_principal)}
                  </td>

                  <td style={{ ...td, color: "#374151" }}>
                    ₹{formatCurrency(r.interest_demand)}
                  </td>

                  <td style={{ ...td, color: "#16a34a", fontWeight: "bold" }}>
                    ₹{formatCurrency(r.interest_collected)}
                  </td>

                  <td
                    style={{
                      ...td,
                      color: r.interest_os > 0 ? "#dc2626" : "#16a34a",
                      fontWeight: "bold",
                    }}
                  >
                    ₹{formatCurrency(r.interest_os)}
                  </td>

                  <td style={{ ...td, color: "#6b7280" }}>
                    ₹{formatCurrency(r.principal)}
                  </td>

                  <td style={{ ...td, color: "#374151" }}>
                    ₹{formatCurrency(r.loan)}
                  </td>

                  <td style={{ ...td, color: "#374151" }}>
                    ₹{formatCurrency(r.savings)}
                  </td>

                  <td style={{ ...td, color: "#6b7280" }}>
                    ₹{formatCurrency(r.service_charge)}
                  </td>

                  

                  {/* <td style={td}>
                    <button
                      onClick={() => editEntry(r)}
                      style={editBtn}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteEntry(r.id)}
                      style={deleteBtn}
                    >
                      Delete
                    </button>
                  </td> */}

                </tr>
              )
              )}
                <tr
                  className="monthly-report-total"
                  style={{
                    background: "#e0f2fe",
                    fontWeight: "bold",
                    borderTop: "2px solid #333",
                  }}
                >
                  <td colSpan="3">TOTAL</td>

                  <td>₹{formatCurrency(totals.monthly_principal)}</td>
                  <td>₹{formatCurrency(totals.interest_demand)}</td>
                  <td>₹{formatCurrency(totals.interest_collected)}</td>
                  <td>₹{formatCurrency(totals.interest_os)}</td>
                  <td>₹{formatCurrency(totals.outstanding_principal)}</td>
                  <td>₹{formatCurrency(totals.loan)}</td>
                  {/* <td>₹{formatCurrency(totals.savings)}</td> */}
                  <td>₹{formatCurrency(finalAmount)}</td>
                  <td>₹{formatCurrency(totals.service_charge)}</td>
                </tr>
                

{/*                 <tr style={{ background: "#d1fae5", fontWeight: "bold" }}>
                  <td colSpan="3">
                     TOTAL ({getFinancialYear()})
                  </td>

                  <td>₹{formatCurrency(groupedTotals[fy].monthly_principal)}</td>
                  <td>₹{formatCurrency(groupedTotals[fy].interest_demand)}</td>
                  <td>₹{formatCurrency(groupedTotals[fy].interest_collected)}</td>
                  <td>₹{formatCurrency(groupedTotals[fy].interest_os)}</td>
                  <td>₹{formatCurrency(groupedTotals[fy].outstanding_principal)}</td>
                  <td>₹{formatCurrency(groupedTotals[fy].loan)}</td>
                  <td>₹{formatCurrency(groupedTotals[fy].savings)}</td>
                  <td>₹{formatCurrency(groupedTotals[fy].service_charge)}</td> 
                </tr> */}


            </tbody>
          </table>
        </div>
      </div>

{selectedYear && (
  <div
    style={{
      marginTop: 20,
      padding: 15,
      background: "#ecfeff",
      borderRadius: 10,
      fontWeight: "bold",
    }}
  >
    <p>
      📊 Total Savings (till {getFinancialYear(selectedYear)}):  
      ₹{formatCurrency(totalSavingTillFY)}
    </p>

    <p>
      💰 Profit Share per Person:  
      ₹{formatCurrency(profitShare)}
    </p>

    <p style={{ fontSize: "18px", color: "#16a34a" }}>
      ✅ Final Amount (Savings + Profit):  
      ₹{formatCurrency(finalAmount)}
    </p>
  </div>
)}

      <br></br>
      <hr />

        
      {/* ✅ ADD ENTRY (ADMIN ONLY) */}
      
        <h2 style={{ marginBottom: 10 }}>

        </h2>
      <h1 style={{ marginBottom: 15,fontSize: "32px", opacity: 1.0, textAlign: "center" }}>
                  {editId ? "✏️ Edit Entry" : "➕ Add Entry"}
      </h1>
      <br></br>       

        <div
          style={{
            
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            background: "#ffffff",
            marginBottom: 20,

                  }}
        >

        {/* ✅ GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >


            {/* Date */}
            <div>
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm({ ...form, date: e.target.value })
                }
                style={inputStyle}
                disabled={!isAdmin} 
              />
            </div>

            {/* Member */}
            <div>
              <label>Member</label>
              <select
                value={form.member_id}
                onChange={(e) =>
                  setForm({ ...form, member_id: e.target.value })
                }
                style={inputStyle}
                disabled={!isAdmin} 
              >
                <option value="">Select Member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          
            {/* Monthly Principal */}
            <div>
              <label>M.P.S</label>
              <input
                placeholder="Monthly Principal"
                value={form.monthly_principal || ""}
                onChange={(e) =>
                  setForm({ ...form, monthly_principal: e.target.value })
                }

                // onBlur={() => {
                //     const updatedPrincipal =
                //       prevPrincipal +
                //       Number(form.loan || 0) -
                //       Number(form.monthly_principal || 0);

                //     setForm((prev) => ({
                //       ...prev,
                //       principal: updatedPrincipal,
                //     }));
                //   }}

                style={inputStyle}
                disabled={!isAdmin}
              />
            </div>

            {/* Loan */}
            <div>
              <label>Loan</label>
              <input
                placeholder="Loan"
                value={form.loan || ""}
                onChange={(e) =>{
                  
                const loan = Number(e.target.value || 0);

                const updatedPrincipal = calculatePrincipal(
                  loan,
                  form.monthly_principal
                );

                setForm((prev) => ({
                  ...prev,
                  loan,
                  service_charge: prev.service_percentage*loan/100,
                  principal: updatedPrincipal,
                }));

                }}
                
                /* onBlur={() => {
                  const updatedPrincipal =
                    prevPrincipal +
                    Number(form.loan || 0) -
                    Number(form.monthly_principal || 0);

                  setForm((prev) => ({
                    ...prev,
                    principal: updatedPrincipal,
                  }));
                }} */
  
                
                style={inputStyle}
                disabled={!isAdmin}
              />
            </div>

            {/* Savings */}
            <div>
              <label>Savings</label>
              <input
                placeholder="Savings"
                value={form.savings || ""}
                onChange={(e) =>
                  setForm({ ...form, savings: e.target.value })
                }
                style={inputStyle}
                disabled={!isAdmin}
              />
            </div>

            {/* Outstanding Principal */}
            <div>
              <label>Outstanding Principal</label>
              <input
                placeholder="Outstanding Principal"
                value={form.principal || ""}
                onChange={(e) =>
                    /* {const updatedPrincipal = Number(form.principal || 0)-
                    Number(form.monthly_principal || 0)+
                    Number(form.loan || 0);
                    console.log("updatedPrincipal:", updatedPrincipal);
                    //setForm({ ...form, principal: updatedPrincipal })

                    setForm((prev) => ({
                    ...prev,    
                    principal: updatedPrincipal,
                    }
                    ));
                    console.log("Form Principal:", form.principal);
                    } */
                  setForm({ ...form, principal: e.target.value || "" })
              }
                style={inputStyle}
                disabled={!isAdmin}
              />
              {/*console.log("Form New Principal:", form.principal)*/}

            </div>

            {/* Interest Demand */}
            <div>
              <label>Interest Demand</label>
              <input
                placeholder="Int Dem"
                value={form.interest_demand || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    interest_demand: e.target.value,
                  })
                }
                style={inputStyle}
                disabled={!isAdmin}
              />
            </div>

            {/* Interest Collected */}
            <div>
              <label>Interest Collected</label>
              <input
                placeholder="Int Coll"
                value={form.interest_collected || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    interest_collected: e.target.value,
                  })
                }
                style={inputStyle}
                disabled={!isAdmin}
              />
            </div>

            {/* Interest O/S */}
            <div>
              <label>Interest O/S</label>
              <input
                placeholder="Interest O/S"
                value={form.interest_os || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    interest_os: e.target.value,
                  })
                }
                style={inputStyle}
                disabled={!isAdmin}
              />
            </div>

            {/* Service charge */}
            <div>
              <label>Service charge</label>
              <input
                placeholder="Service charge"
                value={form.service_charge || ""}
                 onChange={(e) =>
                  setForm({
                    ...form,
                    service_charge: form.service_percentage*form.loan/100,
                  })
                }
                style={inputStyle}
                disabled={true}
              />
            </div>

          {/* Service charge % */}
          <div>
            <label>Service charge %</label>

            <select
              value={form.service_percentage || ""}
              onChange={(e) =>
                setForm({ ...form, service_charge: e.target.value*form.loan/100, service_percentage: e.target.value})
              }
              style={inputStyle}
              disabled={!isAdmin}
            >
              <option value="">Select SC%</option>
              <option value="1">1%</option>
              <option value="2">2%</option>
            </select>
          </div>

          {/* ✅ Status */}
          <div>
            <label>Status</label>

            <select
              value={form.status || ""}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value })
              }
              style={inputStyle}
              disabled={!isAdmin}
            >
              <option value="">Select Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
            </select>
          </div>
        </div>


          {/* ✅ BUTTON */}
          <button
            onClick={saveEntry}
            style={{
              marginTop: 20,
              padding: "10px 18px",
              background: editId ? "#0b07ff" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontWeight: "bold",
              cursor: isAdmin ? "pointer" : "not-allowed",
              opacity: isAdmin ? 1 : 0.6,
            }}
            disabled={!isAdmin}
          >
            {editId ? "Update Entry" : "Add Entry"}
          </button>
          {"  "}
          {/* ✅ RESET BUTTON */}
            <button
              onClick={resetForm}
              style={{
                padding: "10px 18px",
                background: "#e68313",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontWeight: "bold",
                cursor: isAdmin ? "pointer" : "not-allowed",
                opacity: isAdmin ? 1 : 0.6,
              }}
              disabled={!isAdmin}
            >
              Reset
            </button>

            <button
              onClick={populateEntry}
              disabled={!isAdmin}
              style={{
                padding: "10px 18px",
                background: isAdmin ? "#600ce6" : "#9ca3af",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: isAdmin ? "pointer" : "not-allowed",
                fontWeight: "bold",
                marginLeft: 10,
              }}
            >
              Populate
            </button>

            {/* ✅ MEMBER MESSAGE */}
            {!isAdmin && (
              <p style={{ color: "#dc2626", marginTop: 10 }}>
                🔒 Only Admin can modify data
              </p>
            )}

        </div>


    </div>    
  );
}

/* ========================================================== */
/* ✅ SAVING PLANS */
/* ========================================================== */

function SavingPlans({ currentUser }) {

  
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


/* ========================================================== */
/* ✅ NEXT MONTH DEMAND                                        */
/* ========================================================== */

function NextMonthDemand() {
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