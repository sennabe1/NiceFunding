import React from "react";
import { useState } from "react";
import { supabase } from "./supabaseClient";
 
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
 
  // ✅ EMAIL LOGIN
  const signInWithEmail = async () => {
    if (!email || !password) {
      alert("Enter email & password");
      return;
    }
 
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
 
    if (error) {
      alert(error.message);
    }
  };
 
  // ✅ GOOGLE LOGIN
  const signInWithGoogle = async () => {
    const redirectUrl =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? window.location.origin
        : "https://nicesavings.netlify.app/";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });
 
    if (error) {
      console.error("Google Login Error:", error);
    }
  };
 
  return (
    <div
      style={{
        maxWidth: 320,
        margin: "100px auto",
        textAlign: "center",
      }}
    >
      <h2>💰 NICE Savings Scheme</h2>
 
      {/* ✅ EMAIL LOGIN */}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginTop: 10,
        }}
      />
 
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginTop: 10,
        }}
      />
 
      <button
        onClick={signInWithEmail}
        style={{
          width: "100%",
          marginTop: 15,
          padding: 10,
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        Login
      </button>
 
      {/* ✅ DIVIDER */}
      <p style={{ margin: "20px 0", color: "#666" }}>OR</p>
 
      {/* ✅ GOOGLE LOGIN */}
      <button
        onClick={signInWithGoogle}
        style={{
          width: "100%",
          padding: 10,
          background: "#4285F4",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        🔐 Sign in with Google
      </button>
    </div>
  );
}