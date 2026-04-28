import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { BCU_COURSES } from "./courses";
import QRCode from "qrcode";
import { API } from "./config";

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

type LeaderboardEntry = {
    wallet_address: string;
    balance: string;
    full_name: string;
};

export default function Portal() {
    const [view, setView] = useState<"login" | "register">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [regName, setRegName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regCourse, setRegCourse] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regDone, setRegDone] = useState(false);

    const [teacher, setTeacher] = useState<TeacherProfile | null>(() => {
        const saved = sessionStorage.getItem("teacher");
        return saved ? JSON.parse(saved) : null;
    });
    const [activeTab, setActiveTab] = useState<"sessions" | "rewards" | "leaderboard">("sessions");

    const [moduleCode, setModuleCode] = useState("");
    const [qrToken, setQrToken] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [sessionCreated, setSessionCreated] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [students, setStudents] = useState<Student[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [grades, setGrades] = useState<Record<string, string>>({});
    const [rewardStatus, setRewardStatus] = useState<Record<string, RewardStatus>>({});
    const [sendingFor, setSendingFor] = useState<string | null>(null);

    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);

    useEffect(() => {
        if (canvasRef.current && qrToken) {
            QRCode.toCanvas(canvasRef.current, qrToken, { width: 240 });
        }
    }, [qrToken]);

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
                setQrToken((payload.new as { qr_token: string }).qr_token);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [sessionId]);

    useEffect(() => {
        if (activeTab !== "rewards" || !teacher || students.length > 0) return;
        setStudentsLoading(true);
        fetch(`${API}/students?course=${encodeURIComponent(teacher.course)}`)
            .then(res => res.json())
            .then(data => { setStudents(data); setStudentsLoading(false); })
            .catch(() => setStudentsLoading(false));
    }, [activeTab, teacher, students.length]);

    useEffect(() => {
        if (activeTab !== "leaderboard" || !teacher || leaderboard.length > 0) return;
        setLeaderboardLoading(true);

        Promise.all([
            fetch(`${API}/students?course=${encodeURIComponent(teacher.course)}`).then(r => r.json()),
            fetch(`${API}/leaderboard`).then(r => r.json())
        ]).then(([courseStudents, globalBoard]) => {
            const entries: LeaderboardEntry[] = courseStudents
                .map((s: Student) => {
                    const entry = globalBoard.find((e: { wallet_address: string }) => e.wallet_address === s.wallet_address);
                    return {
                        wallet_address: s.wallet_address,
                        full_name: s.full_name,
                        balance: entry ? entry.balance : "0"
                    };
                })
                .sort((a: LeaderboardEntry, b: LeaderboardEntry) => parseInt(b.balance) - parseInt(a.balance));
            setLeaderboard(entries);
            setLeaderboardLoading(false);
        }).catch(() => setLeaderboardLoading(false));
    }, [activeTab, teacher, leaderboard.length]);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) { setError(authError.message); setLoading(false); return; }

        const res = await fetch(`${API}/teacher-profile?email=${encodeURIComponent(email)}`);
        if (!res.ok) {
            setError("No teacher profile found for this account.");
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

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        const { error: authError } = await supabase.auth.signUp({ email: regEmail, password: regPassword });
        if (authError) { setError(authError.message); setLoading(false); return; }

        const res = await fetch(`${API}/register-teacher`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: regEmail, full_name: regName, course: regCourse })
        });

        const data = await res.json();
        if (!res.ok) { setError(data.error || "Registration failed"); setLoading(false); return; }

        setRegDone(true);
        setLoading(false);
    }

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

    async function sendReward(student: Student) {
        const grade = parseInt(grades[student.student_id] || "");
        if (!grade || grade < 1 || grade > 100) {
            setRewardStatus(prev => ({ ...prev, [student.student_id]: { type: "error", message: "Enter a grade (1–100)" } }));
            return;
        }

        setSendingFor(student.student_id);
        setRewardStatus(prev => { const next = { ...prev }; delete next[student.student_id]; return next; });

        try {
            const res = await fetch(`${API}/reward`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ student_id: student.student_id, grade, teacher_email: teacher?.email })
            });
            const data = await res.json();
            setRewardStatus(prev => ({
                ...prev,
                [student.student_id]: { type: res.ok ? "success" : "error", message: data.message || data.error }
            }));
        } catch {
            setRewardStatus(prev => ({ ...prev, [student.student_id]: { type: "error", message: "Request failed" } }));
        }
        setSendingFor(null);
    }

    if (!teacher) {
        if (view === "register" && regDone) {
            return (
                <div className="min-h-screen bg-[#050816] flex items-center justify-center px-6">
                    <div className="w-full max-w-md rounded-3xl border border-cyan-400/10 bg-white/5 p-8 text-center backdrop-blur">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10">
                            <span className="text-2xl text-emerald-400">✓</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Account created</h1>
                        <p className="mt-2 text-sm text-slate-400">You can now sign in to the teacher portal.</p>
                        <button onClick={() => { setView("login"); setError(""); }}
                            className="mt-6 w-full rounded-xl bg-cyan-400 py-3 font-semibold text-black hover:bg-cyan-300 transition">
                            Go to sign in
                        </button>
                    </div>
                </div>
            );
        }

        if (view === "register") {
            return (
                <div className="min-h-screen bg-[#050816] flex items-center justify-center px-6">
                    <div className="w-full max-w-md rounded-3xl border border-cyan-400/10 bg-white/5 p-8 backdrop-blur">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Birmingham City University</p>
                        <h1 className="mt-4 text-3xl font-bold text-white">Teacher registration</h1>
                        <p className="mt-2 text-sm text-slate-400">Register with your BCU email. You can only reward students on your own course.</p>
                        <form onSubmit={handleRegister} className="mt-8 flex flex-col gap-4">
                            <input type="text" placeholder="Full name" value={regName} onChange={e => setRegName(e.target.value)} required
                                className="w-full rounded-xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400/40" />
                            <input type="email" placeholder="BCU email address" value={regEmail} onChange={e => setRegEmail(e.target.value)} required
                                className="w-full rounded-xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400/40" />
                            <select value={regCourse} onChange={e => setRegCourse(e.target.value)} required
                                className="w-full rounded-xl border border-cyan-400/10 bg-[#0a1020] px-4 py-3 text-white outline-none focus:border-cyan-400/40 appearance-none">
                                <option value="" disabled>Select your course</option>
                                {BCU_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input type="password" placeholder="Password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required
                                className="w-full rounded-xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400/40" />
                            {error && <p className="text-sm text-red-400">{error}</p>}
                            <button type="submit" disabled={loading}
                                className="w-full rounded-xl bg-cyan-400 py-3 font-semibold text-black transition hover:bg-cyan-300 disabled:opacity-50">
                                {loading ? "Creating account..." : "Create account"}
                            </button>
                            <p className="text-center text-sm text-slate-500">Already have an account?{" "}
                                <button type="button" onClick={() => { setView("login"); setError(""); }} className="text-cyan-300 hover:underline">Sign in</button>
                            </p>
                        </form>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-[#050816] flex items-center justify-center px-6">
                <div className="w-full max-w-md rounded-3xl border border-cyan-400/10 bg-white/5 p-8 backdrop-blur">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Birmingham City University</p>
                    <h1 className="mt-4 text-3xl font-bold text-white">Teacher Portal</h1>
                    <p className="mt-2 text-sm text-slate-400">Sign in to create sessions and manage academic rewards</p>
                    <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-4">
                        <input type="email" placeholder="BCU email address" value={email} onChange={e => setEmail(e.target.value)} required
                            className="w-full rounded-xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400/40" />
                        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
                            className="w-full rounded-xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400/40" />
                        {error && <p className="text-sm text-red-400">{error}</p>}
                        <button type="submit" disabled={loading}
                            className="w-full rounded-xl bg-cyan-400 py-3 font-semibold text-black transition hover:bg-cyan-300 disabled:opacity-50">
                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                        <p className="text-center text-sm text-slate-500">New teacher?{" "}
                            <button type="button" onClick={() => { setView("register"); setError(""); setRegDone(false); }} className="text-cyan-300 hover:underline">Register here</button>
                        </p>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.1),_transparent_40%),linear-gradient(180deg,_#050816_0%,_#0a1020_100%)] px-6 py-10">
            <div className="mx-auto max-w-5xl">

                {/* header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">Teacher Portal</p>
                        <h1 className="mt-2 text-4xl font-bold text-white">{teacher.full_name}</h1>
                        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                            <span className="text-xs font-semibold text-cyan-300">{teacher.course}</span>
                        </div>
                    </div>
                    <button onClick={async () => {
                        await supabase.auth.signOut();
                        sessionStorage.removeItem("teacher");
                        setTeacher(null);
                        setEmail(""); setPassword("");
                    }} className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-2 text-sm text-red-400 transition hover:bg-red-400/10">
                        Sign out
                    </button>
                </div>

                {/* tab bar */}
                <div className="flex gap-1 rounded-2xl border border-cyan-400/10 bg-white/5 p-1 w-fit mb-8 backdrop-blur">
                    {(["sessions", "rewards", "leaderboard"] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`rounded-xl px-6 py-2.5 text-sm font-semibold capitalize transition ${activeTab === tab ? "bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]" : "text-slate-400 hover:text-white"}`}>
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === "sessions" && (
                    <div className="rounded-3xl border border-cyan-400/10 bg-white/5 p-8 backdrop-blur">
                        <h2 className="text-xl font-bold text-white">Generate Attendance QR</h2>
                        <p className="mt-1 text-sm text-slate-400">The QR refreshes automatically after each scan — students can't share or reuse it.</p>

                        {!sessionCreated ? (
                            <form onSubmit={createSession} className="mt-6 flex flex-col gap-4 max-w-sm">
                                <input type="text" placeholder="Module code e.g. CMP6200" value={moduleCode}
                                    onChange={e => setModuleCode(e.target.value)} required
                                    className="w-full rounded-xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400/40" />
                                <button type="submit"
                                    className="w-full rounded-xl bg-cyan-400 py-3 font-semibold text-black transition hover:bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                                    Generate QR code
                                </button>
                            </form>
                        ) : (
                            <div className="mt-8 flex flex-col items-center gap-6">
                                <div className="rounded-2xl border border-cyan-400/20 bg-white p-6 shadow-[0_0_40px_rgba(34,211,238,0.15)]">
                                    <canvas ref={canvasRef} />
                                </div>
                                <p className="text-sm text-slate-400">Students scan this to earn <span className="font-bold text-cyan-300">10 BCU tokens</span></p>
                                <p className="font-mono text-xs text-slate-600">Token: {qrToken}</p>
                                <button onClick={() => { setSessionCreated(false); setModuleCode(""); }}
                                    className="rounded-xl border border-cyan-400/10 bg-white/5 px-6 py-3 text-sm text-cyan-300 transition hover:bg-white/10">
                                    Create another session
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "rewards" && (
                    <div className="rounded-3xl border border-cyan-400/10 bg-white/5 p-8 backdrop-blur">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">Academic Rewards</h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    Showing students in <span className="font-semibold text-cyan-300">{teacher.course}</span>. Grade × 10 = BCU tokens. Max 1000 per student per day.
                                </p>
                            </div>
                            <button onClick={() => { setStudents([]); setGrades({}); setRewardStatus({}); }}
                                className="rounded-lg border border-cyan-400/10 bg-white/5 px-3 py-2 text-xs text-cyan-300 hover:bg-white/10 transition">
                                ↻ Refresh
                            </button>
                        </div>

                        <div className="mt-6 overflow-hidden rounded-2xl border border-cyan-400/10">
                            {studentsLoading ? (
                                <div className="px-6 py-12 text-center text-sm text-slate-500">Loading students...</div>
                            ) : students.length === 0 ? (
                                <div className="px-6 py-12 text-center text-sm text-slate-500">
                                    No students registered for <span className="text-white">{teacher.course}</span> yet
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-cyan-400/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        <tr>
                                            <th className="px-5 py-4">Student</th>
                                            <th className="px-5 py-4 w-36">Grade (%)</th>
                                            <th className="px-5 py-4 w-32">Tokens</th>
                                            <th className="px-5 py-4 w-28"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map(student => {
                                            const gradeVal = parseInt(grades[student.student_id] || "");
                                            const tokenPreview = !isNaN(gradeVal) && gradeVal >= 1 && gradeVal <= 100 ? gradeVal * 10 : null;
                                            const status = rewardStatus[student.student_id];
                                            const isSending = sendingFor === student.student_id;

                                            return (
                                                <tr key={student.student_id} className="border-t border-cyan-400/10 hover:bg-white/5 transition">
                                                    <td className="px-5 py-4">
                                                        <p className="font-semibold text-white">{student.full_name}</p>
                                                        <p className="text-xs text-slate-500">{student.email}</p>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <input type="number" min="1" max="100" placeholder="0–100"
                                                            value={grades[student.student_id] || ""}
                                                            onChange={e => setGrades(prev => ({ ...prev, [student.student_id]: e.target.value }))}
                                                            className="w-full rounded-lg border border-cyan-400/10 bg-white/5 px-3 py-2 text-white placeholder-slate-600 outline-none focus:border-cyan-400/40" />
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        {tokenPreview !== null
                                                            ? <span className="font-bold text-emerald-300">{tokenPreview} BCU</span>
                                                            : <span className="text-slate-600">—</span>}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        {status ? (
                                                            <span className={`text-xs font-semibold ${status.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                                                                {status.type === "success" ? "Sent ✓" : status.message}
                                                            </span>
                                                        ) : (
                                                            <button onClick={() => sendReward(student)} disabled={isSending}
                                                                className="rounded-lg bg-cyan-400 px-4 py-2 text-xs font-semibold text-black transition hover:bg-cyan-300 disabled:opacity-50 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
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
                    </div>
                )}

                {activeTab === "leaderboard" && (
                    <div className="rounded-3xl border border-cyan-400/10 bg-white/5 p-8 backdrop-blur">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">Course Leaderboard</h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    Live token rankings for <span className="font-semibold text-cyan-300">{teacher.course}</span>, pulled directly from the blockchain.
                                </p>
                            </div>
                            <button onClick={() => setLeaderboard([])}
                                className="rounded-lg border border-cyan-400/10 bg-white/5 px-3 py-2 text-xs text-cyan-300 hover:bg-white/10 transition">
                                ↻ Refresh
                            </button>
                        </div>

                        {leaderboardLoading ? (
                            <div className="mt-8 text-center text-sm text-slate-500">Loading leaderboard...</div>
                        ) : leaderboard.length === 0 ? (
                            <div className="mt-8 text-center text-sm text-slate-500">No students registered yet</div>
                        ) : (
                            <>
                                {leaderboard.length >= 3 && (
                                    <div className="mt-8 flex items-end justify-center gap-4">

                                        {/* 2nd place */}
                                        <div className="flex flex-col items-center gap-3 flex-1">
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-white">{leaderboard[1].full_name}</p>
                                                <p className="text-2xl font-black text-slate-300">{leaderboard[1].balance}</p>
                                                <p className="text-xs text-slate-500">BCU tokens</p>
                                            </div>
                                            <div className="w-full h-28 rounded-t-2xl bg-gradient-to-b from-slate-400/30 to-slate-400/10 border border-slate-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(148,163,184,0.1)]">
                                                <span className="text-4xl font-black text-slate-300">2</span>
                                            </div>
                                        </div>

                                        {/* 1st place — tallest with trophy */}
                                        <div className="flex flex-col items-center gap-3 flex-1">
                                            <div className="text-4xl">🏆</div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-white">{leaderboard[0].full_name}</p>
                                                <p className="text-3xl font-black text-yellow-300">{leaderboard[0].balance}</p>
                                                <p className="text-xs text-slate-500">BCU tokens</p>
                                            </div>
                                            <div className="w-full h-44 rounded-t-2xl bg-gradient-to-b from-yellow-400/30 to-yellow-400/10 border border-yellow-400/40 flex items-center justify-center shadow-[0_0_40px_rgba(250,204,21,0.2)]">
                                                <span className="text-5xl font-black text-yellow-300">1</span>
                                            </div>
                                        </div>

                                        {/* 3rd place */}
                                        <div className="flex flex-col items-center gap-3 flex-1">
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-white">{leaderboard[2].full_name}</p>
                                                <p className="text-2xl font-black text-orange-300">{leaderboard[2].balance}</p>
                                                <p className="text-xs text-slate-500">BCU tokens</p>
                                            </div>
                                            <div className="w-full h-20 rounded-t-2xl bg-gradient-to-b from-orange-400/30 to-orange-400/10 border border-orange-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(251,146,60,0.1)]">
                                                <span className="text-4xl font-black text-orange-300">3</span>
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {/* full table */}
                                <div className="mt-6 overflow-hidden rounded-2xl border border-cyan-400/10">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-cyan-400/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            <tr>
                                                <th className="px-5 py-4">Rank</th>
                                                <th className="px-5 py-4">Student</th>
                                                <th className="px-5 py-4 text-right">BCU Tokens</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leaderboard.map((entry, i) => (
                                                <tr key={i} className={`border-t border-cyan-400/10 hover:bg-white/5 transition ${i === 0 ? "bg-yellow-400/5" : ""}`}>
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold
                                                            ${i === 0 ? "bg-yellow-400/20 text-yellow-300" :
                                                              i === 1 ? "bg-slate-400/20 text-slate-300" :
                                                              i === 2 ? "bg-orange-400/20 text-orange-300" :
                                                              "bg-white/5 text-slate-400"}`}>
                                                            {i + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 font-semibold text-white">{entry.full_name}</td>
                                                    <td className="px-5 py-4 text-right">
                                                        <span className="font-bold text-emerald-300">{entry.balance}</span>
                                                        <span className="ml-1 text-xs text-slate-500">BCU</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
