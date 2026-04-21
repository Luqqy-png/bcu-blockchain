import { useState } from "react";
import { supabase } from "./supabaseClient";
import { API } from "./config";

type StudentProfile = {
    full_name: string;
    email: string;
    course: string;
    wallet_address: string;
    balance: string;
};

export default function StudentLogin() {
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState("");
    const [profile, setProfile]   = useState<StudentProfile | null>(null);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // step 1 — authenticate via Supabase (checks password hash etc.)
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) {
                setError(authError.message);
                setLoading(false);
                return;
            }

            // step 2 — pull student record and live leaderboard at the same time
            // Promise.all means both requests run in parallel which is faster
            const [studentRes, leaderboardRes] = await Promise.all([
                fetch(`${API}/students`),
                fetch(`${API}/leaderboard`)
            ]);

            const students   = await studentRes.json();
            const leaderboard = await leaderboardRes.json();

            // find this student by email in the list
            const student = students.find((s: { email: string }) => s.email === email);
            if (!student) {
                setError("No student record found. Contact your administrator.");
                setLoading(false);
                return;
            }

            // match up the leaderboard entry using wallet address
            // the leaderboard uses wallet_address not name so this avoids privacy issues
            const liveEntry = leaderboard.find(
                (e: { wallet_address: string }) => e.wallet_address === student.wallet_address
            );

            setProfile({
                full_name:      student.full_name,
                email:          student.email,
                course:         student.course,
                wallet_address: student.wallet_address,
                balance:        liveEntry ? liveEntry.balance : "0"
            });

        } catch {
            setError("Something went wrong. Make sure the backend is running.");
        }

        setLoading(false);
    }

    // just clears everything and signs out of Supabase
    async function handleSignOut() {
        await supabase.auth.signOut();
        setProfile(null);
        setEmail("");
        setPassword("");
    }

    // dashboard view shown after a successful login
    if (profile) {
        return (
            <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_20%),linear-gradient(180deg,_#050816_0%,_#0a1020_45%,_#0b1324_100%)] flex items-center justify-center px-6">
                <div className="w-full max-w-md space-y-4">
                    <div className="rounded-3xl border border-cyan-400/10 bg-white/5 p-8">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                            BCU Wallet
                        </p>
                        {/* just shows first name to keep the greeting clean */}
                        <h1 className="mt-3 text-2xl font-bold text-white">
                            Welcome, {profile.full_name.split(" ")[0]}
                        </h1>
                        <p className="mt-1 text-sm text-slate-400">{profile.course}</p>

                        <div className="mt-6 space-y-3">
                            <div className="rounded-2xl border border-cyan-400/10 bg-white/5 p-4">
                                <p className="text-xs text-slate-500">BCU Email</p>
                                <p className="mt-1 text-sm font-medium text-white">{profile.email}</p>
                            </div>
                            {/* full wallet address shown here — student might want to look it up on Etherscan */}
                            <div className="rounded-2xl border border-cyan-400/10 bg-white/5 p-4">
                                <p className="text-xs text-slate-500">Wallet Address</p>
                                <p className="mt-1 break-all font-mono text-xs text-cyan-300">
                                    {profile.wallet_address}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-4">
                                <p className="text-xs text-slate-500">BCU Token Balance</p>
                                <p className="mt-1 text-3xl font-bold text-emerald-300">
                                    {profile.balance} <span className="text-base font-normal text-slate-400">BCU</span>
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <a
                                href="#leaderboard-page"
                                className="flex-1 rounded-xl border border-cyan-400/10 bg-white/5 py-3 text-center text-sm font-semibold text-cyan-300 transition hover:bg-white/10"
                            >
                                Leaderboard
                            </a>
                            <button
                                onClick={handleSignOut}
                                className="flex-1 rounded-xl border border-red-400/10 bg-red-400/5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-400/10"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // login form shown before authentication
    return (
        <div className="min-h-screen bg-[#050816] flex items-center justify-center px-6">
            <div className="w-full max-w-md rounded-3xl border border-cyan-400/10 bg-white/5 p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                    Birmingham City University
                </p>
                <h1 className="mt-4 text-3xl font-bold text-white">Student sign in</h1>
                <p className="mt-2 text-sm text-slate-400">
                    Sign in to view your wallet and BCU token balance
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
                        No account yet?{" "}
                        <a href="#register" className="text-cyan-300 hover:underline">
                            Create one
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}
