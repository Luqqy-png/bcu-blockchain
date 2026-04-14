// student registration page — only for the iOS app side of the project
// web teachers use the portal registration instead (/Portal.tsx)
// this creates a Supabase auth account and then calls the backend to generate a wallet

import { useState } from "react";
import { supabase } from "./supabaseClient";
import { BCU_COURSES } from "./courses";
import { API } from "./config";

// capitalises the first letter of each word as the student types their name
// didn't want to rely on CSS for this because it affects the actual stored value
function toTitleCase(str: string) {
    return str
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export default function Register() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail]       = useState("");
    const [course, setCourse]     = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading]   = useState(false);
    const [done, setDone]         = useState(false);
    const [error, setError]       = useState("");

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFullName(toTitleCase(e.target.value));
    }

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        // validate the email domain before doing anything
        if (!email.endsWith("@bcu.ac.uk")) {
            setError("You must have a BCU email address");
            return;
        }

        setLoading(true);

        try {
            // step 1 — create the Supabase auth user (handles password hashing etc.)
            const { error: authError } = await supabase.auth.signUp({ email, password });
            if (authError) {
                setError(authError.message);
                setLoading(false);
                return;
            }

            // step 2 — call the backend to generate an Ethereum wallet and save the student record
            // the wallet is created using ethers.Wallet.createRandom() which works offline
            const res = await fetch(`${API}/setup-student`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, full_name: fullName, course })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to create wallet");
                setLoading(false);
                return;
            }

            setDone(true);
        } catch {
            setError("Something went wrong. Make sure the backend is running.");
        }

        setLoading(false);
    }

    // success screen shown after registration completes
    if (done) {
        return (
            <div className="min-h-screen bg-[#050816] flex items-center justify-center px-6">
                <div className="w-full max-w-md rounded-3xl border border-cyan-400/10 bg-white/5 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10">
                        <span className="text-2xl text-emerald-400">✓</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Registration successful</h1>
                    <p className="mt-3 text-sm leading-7 text-slate-400">
                        Check your BCU email to confirm your account. Your blockchain wallet has been created and will be ready when you sign in.
                    </p>
                    <a
                        href="#student-login"
                        className="mt-6 inline-block rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-black hover:bg-cyan-300"
                    >
                        Sign in
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050816] flex items-center justify-center px-6">
            <div className="w-full max-w-md rounded-3xl border border-cyan-400/10 bg-white/5 p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                    Birmingham City University
                </p>
                <h1 className="mt-4 text-3xl font-bold text-white">Create account</h1>
                <p className="mt-2 text-sm text-slate-400">
                    Register with your BCU email to get your blockchain wallet
                </p>

                <form onSubmit={handleRegister} className="mt-8 flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="Full name"
                        value={fullName}
                        onChange={handleNameChange}
                        required
                        className="w-full rounded-xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400/40"
                    />
                    <input
                        type="email"
                        placeholder="BCU email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full rounded-xl border border-cyan-400/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400/40"
                    />

                    {/* course dropdown — using a select so students can't type anything random */}
                    <select
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        required
                        className="w-full rounded-xl border border-cyan-400/10 bg-[#0a1020] px-4 py-3 text-white outline-none focus:border-cyan-400/40 appearance-none"
                    >
                        <option value="" disabled>Select your course</option>
                        {BCU_COURSES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

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
                        {loading ? "Creating account..." : "Create account"}
                    </button>

                    <p className="text-center text-sm text-slate-500">
                        Already have an account?{" "}
                        <a href="#student-login" className="text-cyan-300 hover:underline">Sign in</a>
                    </p>
                </form>
            </div>
        </div>
    );
}
