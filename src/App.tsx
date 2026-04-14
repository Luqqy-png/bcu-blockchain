// main app component — handles routing and the leaderboard page
// I'm using window.location.hash instead of react-router because this is a single page
// and I didn't want to set up a proper router just for a few sections

import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Portal from "./Portal";
import { API } from "./config";

// reads the current hash to figure out which page to show
// returns "leaderboard", "teacher", or just "home" as the default
function getCurrentPage() {
  if (window.location.hash === "#leaderboard-page") return "leaderboard";
  if (window.location.hash === "#teacher") return "teacher";
  return "home";
}

export default function App()
{
  const [currentPage, setCurrentPage] = useState(getCurrentPage());

  // leaderboard data comes from the backend — wallet address + live token balance
  // using wallet address instead of name to keep it anonymous (more competitive that way)
  const [leaderboardData, setLeaderboardData] = useState<{ wallet_address: string; balance: string }[]>([]);

  // trims the wallet address down to something readable in the UI
  // e.g. 0x1234...5678 — enough to be unique without showing the whole thing
  function shortAddress(addr: string) {
    return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
  }

  // fetch the leaderboard from the backend on first load
  // the backend queries the smart contract directly so the balance can't be faked in the DB
  useEffect(() => {
    fetch(`${API}/leaderboard`)
      .then(res => res.json())
      .then(data => setLeaderboardData(data))
      .catch(err => console.error(err));
  }, []);

  // listen for hash changes so navigating with anchor links updates the page state
  // I need to remove the listener on cleanup or it accumulates across re-renders
  useEffect(() => {
    const handleHashChange = () => setCurrentPage(getCurrentPage());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // teacher portal is a full-screen component so it gets its own render path
  if (currentPage === "teacher") return <Portal />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_20%),linear-gradient(180deg,_#050816_0%,_#0a1020_45%,_#0b1324_100%)] text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-14">
        {currentPage === "leaderboard" ? (
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Birmingham City University</p>
                <h1 className="mt-2 text-4xl font-bold text-white md:text-5xl">BCU Token Leaderboard</h1>
                <p className="mt-3 text-slate-400">Live rankings — updated every time a student scans in or receives an academic reward</p>
              </div>
              <a href="#home" className="hidden rounded-xl border border-cyan-400/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-white/10 md:inline-flex">
                Back to home
              </a>
            </div>

            {/* stepped podium — 2nd left, 1st centre (tallest), 3rd right */}
            {leaderboardData.length >= 3 && (
              <div className="rounded-3xl border border-cyan-400/10 bg-white/5 p-8 backdrop-blur">
                <div className="flex items-end justify-center gap-4">

                  {/* 2nd place */}
                  <div className="flex flex-col items-center gap-3 flex-1">
                    <div className="text-center">
                      <p className="font-mono text-sm font-bold text-white">{shortAddress(leaderboardData[1].wallet_address)}</p>
                      <p className="text-2xl font-black text-slate-300">{leaderboardData[1].balance}</p>
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
                      <p className="font-mono text-sm font-bold text-white">{shortAddress(leaderboardData[0].wallet_address)}</p>
                      <p className="text-3xl font-black text-yellow-300">{leaderboardData[0].balance}</p>
                      <p className="text-xs text-slate-500">BCU tokens</p>
                    </div>
                    <div className="w-full h-44 rounded-t-2xl bg-gradient-to-b from-yellow-400/30 to-yellow-400/10 border border-yellow-400/40 flex items-center justify-center shadow-[0_0_40px_rgba(250,204,21,0.2)]">
                      <span className="text-5xl font-black text-yellow-300">1</span>
                    </div>
                  </div>

                  {/* 3rd place */}
                  <div className="flex flex-col items-center gap-3 flex-1">
                    <div className="text-center">
                      <p className="font-mono text-sm font-bold text-white">{shortAddress(leaderboardData[2].wallet_address)}</p>
                      <p className="text-2xl font-black text-orange-300">{leaderboardData[2].balance}</p>
                      <p className="text-xs text-slate-500">BCU tokens</p>
                    </div>
                    <div className="w-full h-20 rounded-t-2xl bg-gradient-to-b from-orange-400/30 to-orange-400/10 border border-orange-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(251,146,60,0.1)]">
                      <span className="text-4xl font-black text-orange-300">3</span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* full sorted table — backend already orders by balance descending */}
            <div className="overflow-hidden rounded-3xl border border-cyan-400/10 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="border-b border-cyan-400/10 px-6 py-4">
                <h2 className="font-semibold text-white">Full Rankings</h2>
                <p className="text-xs text-slate-500">{leaderboardData.length} students registered</p>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-cyan-400/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4 text-right">BCU Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.length > 0 ? (
                    leaderboardData.map((entry, index) => (
                      <tr key={index} className={`border-t border-cyan-400/10 transition hover:bg-white/5 ${index === 0 ? "bg-yellow-400/5" : ""}`}>
                        <td className="px-6 py-4">
                          {/* colour-coded rank badges — gold, silver, bronze, then plain */}
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold
                            ${index === 0 ? "bg-yellow-400/20 text-yellow-300" :
                              index === 1 ? "bg-slate-400/20 text-slate-300" :
                              index === 2 ? "bg-orange-400/20 text-orange-300" :
                              "bg-white/5 text-slate-400"}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-white">{shortAddress(entry.wallet_address)}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-emerald-300">{entry.balance}</span>
                          <span className="ml-1 text-xs text-slate-500">BCU</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t border-cyan-400/10">
                      <td className="px-6 py-8 text-center text-slate-500" colSpan={3}>
                        No students registered yet — backend must be running
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* back button only appears on smaller screens where the top one is hidden */}
            <div className="md:hidden">
              <a href="#home" className="inline-flex rounded-xl border border-cyan-400/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-white/10">
                Back to home
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* hero section — project intro */}
            <section id="home" className="rounded-3xl border border-cyan-400/10 bg-white/5 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Birmingham City University project</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight text-white md:text-6xl">BCU Blockchain</h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                BCU Blockchain is a Birmingham City University project concept focused on how blockchain can be used in a structured and practical way.
              </p>
              {/* quick stats grid — just for visual context on the project scope */}
              <div className="mt-8 grid gap-4 md:grid-cols-4">
                {[["BCU","University focus"],["Web3","Technical direction"],["MVP","First app target"],["iOS","Future app platform"]].map(([title, sub]) => (
                  <div key={title} className="rounded-2xl border border-cyan-400/10 bg-white/5 p-5 text-center">
                    <div className="text-3xl font-bold text-white">{title}</div>
                    <p className="mt-2 text-sm text-slate-400">{sub}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* solution section */}
            <section id="product" className="mt-12 rounded-3xl border border-cyan-400/10 bg-white/5 p-8 shadow-sm">
              <h2 className="text-3xl font-bold text-white">Solution</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">A blockchain-based platform designed around a real use case to show how transparent digital records and secure verification can be applied in a university setting.</p>
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                {[
                  ["Problem Statement","Many digital systems rely on centralised storage with limited transparency, creating issues around trust and record integrity."],
                  ["Target Users","Birmingham City University students, with possible future use by staff or university services."],
                  ["Core Features","Attendance tracking via QR code, token rewards on the blockchain, a live leaderboard, and a teacher portal."],
                  ["Why Blockchain","Blockchain ensures transparency and immutability — attendance records and token rewards cannot be altered once written to the chain."]
                ].map(([title, text]) => (
                  <article key={title} className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-6">
                    <h3 className="text-xl font-semibold text-white">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{text}</p>
                  </article>
                ))}
              </div>
            </section>

            {/* project plan section — covers aim, objectives, scope, and timeline */}
            <section id="pricing" className="mt-12 rounded-3xl border border-cyan-400/10 bg-white/5 p-8 shadow-sm">
              <h2 className="text-3xl font-bold text-white">Project Plan</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">The aim, objectives, scope, and development timeline of the project.</p>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {[
                  ["Aim","To design and build a blockchain-based attendance and reward system for BCU that demonstrates real-world feasibility."],
                  ["Objectives","Research blockchain in education, develop an ERC-20 token, build a mobile app, deploy to testnet, and evaluate the system."],
                  ["Scope","Proof of concept on Sepolia testnet. Simulated student data. Not a full production system."]
                ].map(([title, text]) => (
                  <article key={title} className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-6">
                    <h3 className="text-xl font-semibold text-white">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{text}</p>
                  </article>
                ))}
              </div>
              <div className="mt-8 rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-6">
                <h3 className="text-xl font-semibold text-emerald-300">Timeline</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">Research and planning completed November 2025. Smart contract and backend developed April 2026. Dissertation submission May 2026.</p>
              </div>
            </section>

            {/* feasibility section — I added ethics here because it felt natural to group them */}
            <section id="contact" className="mt-12 rounded-3xl border border-cyan-400/10 bg-white/5 p-8 shadow-sm">
              <h2 className="text-3xl font-bold text-white">Feasibility and Ethics</h2>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {[
                  ["Feasibility","Demonstrated through a working prototype on Sepolia testnet with real token transactions verified on Etherscan."],
                  ["Risks","Smart contract risk mitigated by testnet. Time constraints managed through weekly milestones. All data is simulated."],
                  ["Ethics","No real student data used. GDPR compliant. All blockchain transactions use test wallets with no financial value."]
                ].map(([title, text]) => (
                  <article key={title} className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-6">
                    <h3 className="text-xl font-semibold text-white">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{text}</p>
                  </article>
                ))}
              </div>
            </section>

            {/* references — keeping these here so the marker can see sources easily */}
            <section id="references" className="mt-12 rounded-3xl border border-cyan-400/10 bg-white/5 p-8 shadow-sm">
              <h2 className="text-3xl font-bold text-white">References</h2>
              <div className="mt-8 space-y-4">
                {[
                  "Grech, A. and Camilleri, A. (2017). Blockchain in Education. Publications Office of the European Union.",
                  "OpenZeppelin Docs. Smart contract security guidance and reusable Solidity standards.",
                  "IBM. Blockchain overview and explanation of blockchain use cases and system design.",
                  "Solidity Documentation. Core language reference for Ethereum smart contract development."
                ].map(ref => (
                  <div key={ref} className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-5 text-sm leading-7 text-slate-300">{ref}</div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
