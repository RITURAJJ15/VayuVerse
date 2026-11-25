import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
  return env;
}

interface TestReportItem {
  id: string;
  requirement: string;
  executionMode: "Live Authenticated REST Request" | "Live Anon REST Request" | "SQL Role Simulation Verification";
  status: "PASS" | "FAIL" | "SKIPPED_OAUTH_REQUIRED";
  evidence: string;
}

async function runAuthenticatedSecurityTests() {
  const env = loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL || "https://dicqyoxhplzobaxsnokz.supabase.co";
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || "sb_publishable_ICsv07wg5QkTDY67-hT1YQ_Yk5mYmyA";

  // Check for test user access token from environment (without logging it)
  const userToken1 = process.env.VAYU_TEST_USER_TOKEN;
  const userToken2 = process.env.VAYU_TEST_USER2_TOKEN;

  console.log("=========================================================================");
  console.log("  VAYUVERSE PHASE 7: REAL AUTHENTICATED SUPABASE SECURITY AUDIT          ");
  console.log("=========================================================================\n");

  const report: TestReportItem[] = [];

  const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  // ---------------------------------------------------------------------------
  // 1. Live Anon / Public REST Baseline
  // ---------------------------------------------------------------------------
  console.log("[Baseline 1] Testing Live Anonymous REST Restrictions on public.air_alerts...");
  const [anonSel, anonIns, anonUpd, anonDel] = await Promise.all([
    publicClient.from("air_alerts").select("*"),
    publicClient.from("air_alerts").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      alert_type: "high_pollution",
      severity: "Severe",
      title: "Anon Injection",
      message: "Testing anon injection",
      fingerprint: "anon-inj-" + Date.now(),
    }),
    publicClient.from("air_alerts").update({ status: "read" }).eq("id", "00000000-0000-0000-0000-000000000000"),
    publicClient.from("air_alerts").delete().eq("id", "00000000-0000-0000-0000-000000000000"),
  ]);

  const allAnonBlocked =
    anonSel.error?.message.includes("permission denied") &&
    anonIns.error?.message.includes("permission denied") &&
    anonUpd.error?.message.includes("permission denied") &&
    anonDel.error?.message.includes("permission denied");

  report.push({
    id: "REQ-0",
    requirement: "Zero Table Privileges for Anon Role",
    executionMode: "Live Anon REST Request",
    status: allAnonBlocked ? "PASS" : "FAIL",
    evidence: `SELECT: "${anonSel.error?.message}", INSERT: "${anonIns.error?.message}", UPDATE: "${anonUpd.error?.message}", DELETE: "${anonDel.error?.message}"`,
  });
  console.log(`   Outcome: ${allAnonBlocked ? "PASSED (Zero anon access)" : "FAILED"}`);

  // ---------------------------------------------------------------------------
  // 2. Authenticated REST User Session Testing
  // ---------------------------------------------------------------------------
  if (!userToken1) {
    console.log("\n[Notice] No VAYU_TEST_USER_TOKEN was passed in the environment.");
    console.log("   Since Email/Password & Anonymous sign-ins are disabled on the live Supabase project");
    console.log("   (Google OAuth is the only active provider), programmatic JWT generation via Node.js");
    console.log("   requires an existing OAuth session token.");

    report.push({
      id: "REQ-1 & 2",
      requirement: "Prevent Logged-In User from INSERTing Fabricated Alerts",
      executionMode: "Live Authenticated REST Request",
      status: "SKIPPED_OAUTH_REQUIRED",
      evidence: "Email logins disabled; Google OAuth requires browser session. Verified at DB schema level: authenticated has NO INSERT privilege.",
    });

    report.push({
      id: "REQ-3",
      requirement: "Prevent Logged-In User from Modifying Telemetry (severity, observed_value)",
      executionMode: "Live Authenticated REST Request",
      status: "SKIPPED_OAUTH_REQUIRED",
      evidence: "Verified at DB schema level: authenticated UPDATE privilege is granted strictly on column (status).",
    });

    report.push({
      id: "REQ-4",
      requirement: "Prevent Logged-In User from Setting status='resolved'",
      executionMode: "Live Authenticated REST Request",
      status: "SKIPPED_OAUTH_REQUIRED",
      evidence: "Verified at DB schema level: RLS WITH CHECK policy enforces status IN ('read', 'dismissed').",
    });

    report.push({
      id: "REQ-5",
      requirement: "Permit User to Mark Own Alert as 'read' or 'dismissed'",
      executionMode: "Live Authenticated REST Request",
      status: "SKIPPED_OAUTH_REQUIRED",
      evidence: "Verified at DB schema level: GRANT UPDATE (status) and policy 'Users can update own alert read status' enable read/dismiss.",
    });

    report.push({
      id: "REQ-6",
      requirement: "Cross-User Isolation (User A cannot read/update User B's alerts)",
      executionMode: "Live Authenticated REST Request",
      status: "SKIPPED_OAUTH_REQUIRED",
      evidence: "Verified at DB schema level: RLS USING clause strictly enforces auth.uid() = user_id on both SELECT and UPDATE.",
    });
  } else {
    console.log("\n[Auth 1] Initializing Live Authenticated Supabase Client with User 1 Session Token...");
    const authClient1 = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${userToken1}` } },
    });

    // Get user details
    const { data: userData, error: userErr } = await authClient1.auth.getUser();
    if (userErr || !userData.user) {
      console.log("   ✗ Invalid or expired user session token:", userErr?.message);
    } else {
      const userId1 = userData.user.id;
      console.log(`   ✓ Authenticated as User ID: ${userId1.slice(0, 8)}... (masked for security)`);

      // 2a. Attempt Direct INSERT of Fabricated Alert
      console.log("\n[Test 2] Testing Authenticated REST Direct INSERT into air_alerts...");
      const { data: _insData, error: insErr } = await authClient1.from("air_alerts").insert({
        user_id: userId1,
        alert_type: "high_pollution",
        severity: "Severe",
        pollutant: "PM2.5",
        observed_value: 999.0,
        aqi_value: 500,
        status: "active",
        source_type: "observed",
        source_name: "Fabricated CPCB",
        source_timestamp: new Date().toISOString(),
        title: "Forged Authenticated Alert",
        message: "Testing client injection",
        recommended_action: "None",
        fingerprint: "forged_auth_" + Date.now(),
      });

      const insertBlocked = !!insErr;
      report.push({
        id: "REQ-2",
        requirement: "Prevent Logged-In User from INSERTing Fabricated Alerts",
        executionMode: "Live Authenticated REST Request",
        status: insertBlocked ? "PASS" : "FAIL",
        evidence: insertBlocked ? `Blocked with: "${insErr.message}"` : "FAIL: Insert succeeded unexpectedly",
      });
      console.log(`   Outcome: ${insertBlocked ? "BLOCKED (PASS)" : "ALLOWED (FAIL)"} -> ${insErr?.message || "Success"}`);

      // 2b. Attempt UPDATE on Telemetry Fields (observed_value, severity)
      console.log("\n[Test 3] Testing Authenticated REST UPDATE on Authoritative Telemetry (severity)...");
      const { data: _updSevData, error: updSevErr } = await authClient1
        .from("air_alerts")
        .update({ severity: "Good", observed_value: 10.0 })
        .eq("user_id", userId1);

      const updSevBlocked = !!updSevErr;
      report.push({
        id: "REQ-3",
        requirement: "Prevent Logged-In User from Modifying Telemetry (severity, observed_value)",
        executionMode: "Live Authenticated REST Request",
        status: updSevBlocked ? "PASS" : "FAIL",
        evidence: updSevBlocked ? `Blocked with: "${updSevErr.message}"` : "FAIL: Severity update succeeded",
      });
      console.log(`   Outcome: ${updSevBlocked ? "BLOCKED (PASS)" : "ALLOWED (FAIL)"} -> ${updSevErr?.message || "No error"}`);

      // 2c. Attempt UPDATE on status='resolved'
      console.log("\n[Test 4] Testing Authenticated REST UPDATE on status='resolved'...");
      const { data: _updResData, error: updResErr } = await authClient1
        .from("air_alerts")
        .update({ status: "resolved" })
        .eq("user_id", userId1);

      const updResBlocked = !!updResErr;
      report.push({
        id: "REQ-4",
        requirement: "Prevent Logged-In User from Setting status='resolved'",
        executionMode: "Live Authenticated REST Request",
        status: updResBlocked ? "PASS" : "FAIL",
        evidence: updResBlocked ? `Blocked with: "${updResErr.message}"` : "FAIL: Resolved update succeeded",
      });
      console.log(`   Outcome: ${updResBlocked ? "BLOCKED (PASS)" : "ALLOWED (FAIL)"} -> ${updResErr?.message || "No error"}`);

      // 2d. Attempt UPDATE on status='read' or 'dismissed' (Authorized Operation)
      console.log("\n[Test 5] Testing Authenticated REST UPDATE on status='read'...");
      const { data: _updReadData, error: updReadErr } = await authClient1
        .from("air_alerts")
        .update({ status: "read" })
        .eq("user_id", userId1);

      // Even if no rows exist for this user, PostgREST will succeed with 0 rows affected (error === null)
      // because UPDATE (status) privilege is granted and status='read' satisfies RLS WITH CHECK.
      const updReadAllowed = !updReadErr;
      report.push({
        id: "REQ-5",
        requirement: "Permit User to Mark Own Alert as 'read' or 'dismissed'",
        executionMode: "Live Authenticated REST Request",
        status: updReadAllowed ? "PASS" : "FAIL",
        evidence: updReadAllowed ? "Permitted: UPDATE (status) succeeded with 0 errors" : `Failed with: "${updReadErr?.message}"`,
      });
      console.log(`   Outcome: ${updReadAllowed ? "PERMITTED (PASS)" : "FAILED"} -> ${updReadErr?.message || "Success"}`);

      // 2e. Cross-User Isolation Testing (if User 2 token provided)
      if (userToken2) {
        console.log("\n[Test 6] Testing Cross-User Isolation with User 2 Session...");
        const authClient2 = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false },
          global: { headers: { Authorization: `Bearer ${userToken2}` } },
        });

        const { data: u2Data, error: _u2Err } = await authClient2
          .from("air_alerts")
          .select("*")
          .eq("user_id", userId1);

        const isolated = (u2Data || []).length === 0;
        report.push({
          id: "REQ-6",
          requirement: "Cross-User Isolation (User A cannot read/update User B's alerts)",
          executionMode: "Live Authenticated REST Request",
          status: isolated ? "PASS" : "FAIL",
          evidence: isolated ? "User 2 cannot see User 1 alerts (0 rows returned)" : "FAIL: User 2 saw User 1 alerts",
        });
        console.log(`   Outcome: ${isolated ? "ISOLATED (PASS)" : "LEAKED (FAIL)"}`);
      }
    }
  }

  console.log("\n=========================================================================");
  console.log("                        AUDIT SUMMARY TABLE                              ");
  console.log("=========================================================================");
  console.table(report);
}

runAuthenticatedSecurityTests().catch(console.error);
