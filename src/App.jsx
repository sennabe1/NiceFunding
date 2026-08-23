import React from "react";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Login from "./Login";
import Dashboard from "./pages/Dashboard";
import SavingPlans from "./pages/SavingPlans";
import NextMonthDemand from "./pages/NextMonthDemand";
import Insights from "./pages/Insights";

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

