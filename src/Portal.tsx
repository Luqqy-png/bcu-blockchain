// Teacher portal — handles login, registration, session QR generation and academic rewards
// Only teachers with a BCU email can register and they can only send tokens to students on their course

import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { BCU_COURSES } from "./courses";
import QRCode from "qrcode";
import { API } from "./config";

// shapes for the data we get back from the backend
type TeacherProfile = {
    full_name: string;
    course: string;
    email: string;
};

type Student = {
    student_id: string;
    full_name: string;
    email: string;
    course: string;
    wallet_address: string;
};

type RewardStatus = {
    type: "success" | "error";
    message: string;
};

export default function Portal() {
    // controls whether we show the login or register form before signing in
    const [view, setView] = useState<"login" | "register">("login");

    // login form fields
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // register form fields — kept separate from login so they don't interfere
    const [regName, setRegName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regCourse, setRegCourse] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regDone, setRegDone] = useState(false);

    // restore teacher session from sessionStorage on page load so refresh doesn't log them out
    const [teacher, setTeacher] = useState<TeacherProfile | null>(() => {
        const saved = sessionStorage.getItem("teacher");
        return saved ? JSON.parse(saved) : null;
    });
    const [activeTab, setActiveTab] = useState<"sessions" | "rewards">("sessions");

    // sessions tab state
    const [moduleCode, setModuleCode] = useState("");
    const [qrToken, setQrToken] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [sessionCreated, setSessionCreated] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // rewards tab state
    const [students, setStudents] = useState<Student[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [rewardModule, setRewardModule] = useState("");
    const [grades, setGrades] = useState<Record<string, string>>({});
    const [rewardStatus, setRewardStatus] = useState<Record<string, RewardStatus>>({});
    const [sendingFor, setSendingFor] = useState<string | null>(null);

    // redraw the QR code whenever the token changes — using useEffect here because
    // the inline ref callback approach only fires on mount, not on token updates
    useEffect(() => {
        if (canvasRef.current && qrToken) {
            QRCode.toCanvas(canvasRef.current, qrToken, { width: 220 });
        }
    }, [qrToken]);

    // subscribe to Supabase Realtime on the sessions table so the QR updates
    // automatically on the teacher's screen whenever a student scans it
    useEffect(() => {
        if (!sessionId) return;

        const channel = supabase
            .channel(`session-${sessionId}`)
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "sessions",
                filter: `session_id=eq.${sessionId}`
            }, (payload) => {
                // backend rotates the token after each scan — this picks up the new one
                setQrToken((payload.new as { qr_token: string }).qr_token);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [sessionId]);

    // fetch students when the rewards tab opens — filtered to the teacher's course only
    useEffect(() => {
        if (activeTab !== "rewards" || !teacher || students.length > 0) return;

        setStudentsLoading(true);
        fetch(`${API}/students?course=${encodeURIComponent(teacher.course)}`)
            .then(res => res.json())
            .then(data => { setStudents(data); setStudentsLoading(false); })
            .catch(() => setStudentsLoading(false));
    }, [activeTab, teacher, students.length]);

    // sign in with Supabase auth then fetch the teacher profile from our teachers table
    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        // check they actually have a teacher profile — students signing in here would have no record
        const res = await fetch(`${API}/teacher-profile?email=${encodeURIComponent(email)}`);
        if (!res.ok) {
            setError("No teacher profile found for this account. Register first.");
            await supabase.auth.signOut();
            setLoading(false);
            return;
        }

        const profile = await res.json();
        const teacherData = { ...profile, email };
        sessionStorage.setItem("teacher", JSON.stringify(teacherData));
        setTeacher(teacherData);
        setLoading(false);
    }

    // teacher registration — auth is handled client-side via Supabase signUp,
    // then the backend just inserts the teacher record into our teachers table
    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        // create the Supabase auth user first — email confirmation is disabled in the dashboard
        // so this works immediately without needing to click any link
        const { error: authError } = await supabase.auth.signUp({
            email: regEmail,
            password: regPassword
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        // now create the teacher profile record on the backend
        const res = await fetch(`${API}/register-teacher`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: regEmail,
                full_name: regName,
                course: regCourse
            })
        });

        const data = await res.json();
        if (!res.ok) {
            setError(data.error || "Registration failed");
            setLoading(false);
            return;
        }

        setRegDone(true);
        setLoading(false);
    }

    // create a session row in Supabase and generate the initial QR token
    async function createSession(e: React.FormEvent) {
        e.preventDefault();

        const token = crypto.randomUUID().replace(/-/g, "");

        const { data, error: sessionError } = await supabase.from("sessions").insert({
            module_code: moduleCode,
            session_date: new Date().toISOString().split("T")[0],
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            qr_token: token,
            qr_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        }).select().single();

        if (sessionError) {
            setError(sessionError.message);
        } else {
            setQrToken(token);
            setSessionId(data.session_id);
            setSessionCreated(true);
        }
    }

    // send academic performance tokens to a student — grade × 10 = tokens, max 1000
    async function sendReward(student: Student) {
        const grade = parseInt(grades[student.student_id] || "");

        if (!rewardModule.trim()) {
            setRewardStatus(prev => ({ ...prev, [student.student_id]: { type: "error", message: "Enter a module code first" } }));
            return;
        }
        if (!grade || grade < 1 || grade > 100) {
            setRewardStatus(prev => ({ ...prev, [student.student_id]: { type: "error", message: "Grade must be 1–100" } }));
            return;
        }

        setSendingFor(student.student_id);
        // clear any previous status for this student before sending
        setRewardStatus(prev => { const next = { ...prev }; delete next[student.student_id]; return next; });

        try {
            const res = await fetch(`${API}/reward`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_id: student.student_id,
                    module_code: rewardModule.trim().toUpperCase(),
                    grade,
                    teacher_email: teacher?.email // backend uses this to verify course access
                })
            });

            const data = await res.json();
            setRewardStatus(prev => ({
                ...prev,
                [student.student_id]: {
                    type: res.ok ? "success" : "error",
                    message: data.message || data.error
                }
            }));
        } catch {
            setRewardStatus(prev => ({ ...prev, [student.student_id]: { type: "error", message: "Request failed" } }));
        }

        setSendingFor(null);
    }

    // ── Not logged in — show login or registration form ───────────────────────

    if (!teacher) {
        // success screen shown after registration completes
        if (view === "register" && regDone) {
            return (
                <div className="min-h-screen bg-[#050816] flex items-center justify-center px-6">
                    <div className="w-full max-w-md rounded-3xl border border-cyan-400/10 bg-white/5 p-8 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10">
                            <span className="text-2xl text-emerald-400">✓</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Account created</h1>
                        <p className="mt-2 text-sm text-slate-400">
                            You can now sign in to the teacher portal.
                        </p>
                        <button
                            onClick={() => { setView("login"); setError(""); }}
                            className="mt-6 w-full rounded-xl bg-cyan-400 py-3 font-semibold text-black hover:bg-cyan-300"
                        >
                            Go to sign in
                        </button>
                    </div>
                </div>
            );
        }

        if (view === "register") {
            return (
                <div className="min-h-screen bg-[#050816] flex items-center justify-center px-6">
                    <div className="w-full max-w-md rounded-3xl border border-cyan-400/10 bg-white/5 p-8">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                            Birmingham City University
                        </p>
                        <h1 className="mt-4 text-3xl font-bold text-white">Teacher registration</h1>
                        <p className="mt-2 text-sm text-slate-400">
                            Register with your BCU email. You can only reward students on your own course.
                        </p>
                        <form onSubmit={handleRegister} className="mt-8 flex flex-col gap-4">
                            <input
                                type="text"
                                placeholder="Full name"
                                value={regName}
                                onChange={(e) => setRegName(e.target.value)}
                                required
                                className="w-full rounded-xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400/40"
                            />
                            <input
                                type="email"
                                placeholder="BCU email address"
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                                required
                                className="w-full rounded-xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400/40"
                            />
                            <select
                                value={regCourse}
                                onChange={(e) => setRegCourse(e.target.value)}
                                required
                                className="w-full rounded-xl border border-cyan-400/10 bg-[#0a1020] px-4 py-3 text-white outline-none focus:border-cyan-400/40 appearance-none"
                            >
                                <option value="" disabled>Select your course</option>
                                {BCU_COURSES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <input
                                type="password"
                                placeholder="Password"
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                                required
                                className="w-full rounded-xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400/40"
                            />
                            {error && <p className="text-sm text-red-400">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-xl bg-cyan-400 py-3 font-semibold text-black transition hover:bg-cyan-300 disabled:opacity-50"
                            >
                                {loading ? "Creating account..." : "Create account"}
                            </button>
                            <p className="text-center text-sm text-slate-500">
                                Already have an account?{" "}
                                <button type="button" onClick={() => { setView("login"); setError(""); }} className="text-cyan-300 hover:underline">
                                    Sign in
                                </button>
                            </p>
                        </form>
                    </div>
                </div>
            );
        }

        // default login view
        return (
            <div className="min-h-screen bg-[#050816] flex items-center justify-center px-6">
                <div className="w-full max-w-md rounded-3xl border border-cyan-400/10 bg-white/5 p-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                        Birmingham City University
                    </p>
                    <h1 className="mt-4 text-3xl font-bold text-white">Teacher Portal</h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Sign in to create sessions and manage academic rewards
                    </p>
                    <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-4">
                        <input
                            type="email"
                            placeholder="BCU email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full rounded-xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400/40"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full rounded-xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400/40"
                        />
                        {error && <p className="text-sm text-red-400">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl bg-cyan-400 py-3 font-semibold text-black transition hover:bg-cyan-300 disabled:opacity-50"
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                        <p className="text-center text-sm text-slate-500">
                            New teacher?{" "}
                            <button type="button" onClick={() => { setView("register"); setError(""); }} className="text-cyan-300 hover:underline">
                                Register here
                            </button>
                        </p>
                    </form>
                </div>
            </div>
        );
    }

    // ── Logged in — teacher dashboard ─────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#050816] px-6 py-14">
            <div className="mx-auto max-w-4xl">

                {/* header shows the teacher's name and which course they're assigned to */}
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                            Teacher Portal
                        </p>
                        <h1 className="mt-2 text-3xl font-bold text-white">{teacher.full_name}</h1>
                        <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1">
                            <span className="text-xs font-semibold text-cyan-300">{teacher.course}</span>
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            sessionStorage.removeItem("teacher");
                            setTeacher(null);
                            setEmail("");
                            setPassword("");
                        }}
                        className="rounded-xl border border-red-400/10 bg-red-400/5 px-4 py-2 text-sm text-red-400 transition hover:bg-red-400/10"
                    >
                        Sign out
                    </button>
                </div>

                {/* tab switcher between QR session creation and academic rewards */}
                <div className="mt-8 flex gap-2 rounded-2xl border border-cyan-400/10 bg-white/5 p-1 w-fit">
                    <button
                        onClick={() => setActiveTab("sessions")}
                        className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${activeTab === "sessions" ? "bg-cyan-400 text-black" : "text-slate-300 hover:text-white"}`}
                    >
                        Sessions
                    </button>
                    <button
                        onClick={() => setActiveTab("rewards")}
                        className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${activeTab === "rewards" ? "bg-cyan-400 text-black" : "text-slate-300 hover:text-white"}`}
                    >
                        Academic Rewards
                    </button>
                </div>

                {/* ── Sessions tab ── */}
                {activeTab === "sessions" && (
                    <div className="mt-8">
                        <p className="text-sm text-slate-400">
                            Generate a QR code for students to scan and earn BCU tokens. The QR refreshes automatically after each scan so it can't be reused.
                        </p>
                        {!sessionCreated ? (
                            <form onSubmit={createSession} className="mt-6 flex flex-col gap-4 max-w-md">
                                <input
                                    type="text"
                                    placeholder="Module code e.g. CMP6200"
                                    value={moduleCode}
                                    onChange={(e) => setModuleCode(e.target.value)}
                                    required
                                    className="w-full rounded-xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400/40"
                                />
                                <button
                                    type="submit"
                                    className="w-full rounded-xl bg-cyan-400 py-3 font-semibold text-black transition hover:bg-cyan-300"
                                >
                                    Generate QR code
                                </button>
                            </form>
                        ) : (
                            <div className="mt-8 flex flex-col items-center gap-6">
                                <div className="rounded-2xl border border-cyan-400/10 bg-white p-6">
                                    <canvas ref={canvasRef} />
                                </div>
                                <p className="text-sm text-slate-400">Students scan this to earn 10 BCU tokens</p>
                                <p className="font-mono text-xs text-slate-600">Token: {qrToken}</p>
                                <button
                                    onClick={() => { setSessionCreated(false); setModuleCode(""); }}
                                    className="rounded-xl border border-cyan-400/10 bg-white/5 px-6 py-3 text-sm text-cyan-300 transition hover:bg-white/10"
                                >
                                    Create another session
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Academic rewards tab ── */}
                {activeTab === "rewards" && (
                    <div className="mt-8">
                        <p className="text-sm text-slate-400">
                            Showing students enrolled in <span className="font-semibold text-cyan-300">{teacher.course}</span>.
                            Each student can only receive one academic reward per module — max 1000 tokens.
                        </p>

                        {/* module code applies to the whole batch so the teacher sets it once */}
                        <div className="mt-4 max-w-sm">
                            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Module code</label>
                            <input
                                type="text"
                                placeholder="e.g. CMP6200"
                                value={rewardModule}
                                onChange={(e) => setRewardModule(e.target.value.toUpperCase())}
                                className="mt-2 w-full rounded-xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400/40"
                            />
                        </div>

                        <div className="mt-6 overflow-hidden rounded-2xl border border-cyan-400/10">
                            {studentsLoading ? (
                                <div className="px-6 py-10 text-center text-sm text-slate-500">Loading students...</div>
                            ) : students.length === 0 ? (
                                <div className="px-6 py-10 text-center text-sm text-slate-500">
                                    No students registered for <span className="text-white">{teacher.course}</span> yet
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-cyan-400/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3">Student</th>
                                            <th className="px-4 py-3 w-32">Grade (%)</th>
                                            <th className="px-4 py-3 w-32">Tokens</th>
                                            <th className="px-4 py-3 w-28"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map((student) => {
                                            const gradeVal = parseInt(grades[student.student_id] || "");
                                            // show a live preview of how many tokens the grade will award
                                            const tokenPreview = !isNaN(gradeVal) && gradeVal >= 1 && gradeVal <= 100
                                                ? gradeVal * 10
                                                : null;
                                            const status = rewardStatus[student.student_id];
                                            const isSending = sendingFor === student.student_id;

                                            return (
                                                <tr key={student.student_id} className="border-t border-cyan-400/10 hover:bg-white/5">
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-white">{student.full_name}</p>
                                                        <p className="text-xs text-slate-500">{student.email}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="100"
                                                            placeholder="0–100"
                                                            value={grades[student.student_id] || ""}
                                                            onChange={(e) => setGrades(prev => ({
                                                                ...prev,
                                                                [student.student_id]: e.target.value
                                                            }))}
                                                            className="w-full rounded-lg border border-cyan-400/10 bg-white/5 px-3 py-2 text-white placeholder-slate-600 outline-none focus:border-cyan-400/40"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {tokenPreview !== null
                                                            ? <span className="font-semibold text-emerald-300">{tokenPreview} BCU</span>
                                                            : <span className="text-slate-600">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {status ? (
                                                            <span className={`text-xs font-medium ${status.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                                                                {status.type === "success" ? "Sent ✓" : "Error"}
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => sendReward(student)}
                                                                disabled={isSending}
                                                                className="rounded-lg bg-cyan-400 px-4 py-2 text-xs font-semibold text-black transition hover:bg-cyan-300 disabled:opacity-50"
                                                            >
                                                                {isSending ? "Sending..." : "Send"}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* show any error messages below the table so they don't get lost */}
                        {Object.values(rewardStatus).some(s => s.type === "error") && (
                            <div className="mt-4 space-y-1">
                                {students
                                    .filter(s => rewardStatus[s.student_id]?.type === "error")
                                    .map(s => (
                                        <p key={s.student_id} className="text-xs text-red-400">
                                            {s.full_name}: {rewardStatus[s.student_id].message}
                                        </p>
                                    ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
