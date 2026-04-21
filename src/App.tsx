import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Portal from "./Portal";
import { API } from "./config";

function getCurrentPage() {
  if (window.location.hash === "#leaderboard-page") return "leaderboard";
  if (window.location.hash === "#teacher") return "teacher";
  return "leaderboard";
}

function shortAddress(addr: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
}

export default function App() {
  const [currentPage, setCurrentPage] = useState(getCurrentPage());
  const [leaderboardData, setLeaderboardData] = useState<{ wallet_address: string; balance: string }[]>([]);

  useEffect(() => {
    fetch(`${API}/leaderboard`)
      .then(res => res.json())
      .then(data => setLeaderboardData(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const handleHashChange = () => setCurrentPage(getCurrentPage());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (currentPage === "teacher") return <Portal />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_20%),linear-gradient(180deg,_#050816_0%,_#0a1020_45%,_#0b1324_100%)] text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-14 space-y-12">

        {/* leaderboard */}
        <section id="leaderboard-page">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Birmingham City University</p>
              <h1 className="mt-2 text-4xl font-bold text-white md:text-5xl">BCU Token Leaderboard</h1>
              <p className="mt-3 text-slate-400">Live rankings — updated every time a student scans in or receives an academic reward</p>
            </div>
          </div>

          {leaderboardData.length >= 3 && (
            <div className="rounded-3xl border border-cyan-400/10 bg-white/5 p-8 backdrop-blur mb-6">
              <div className="flex items-end justify-center gap-4">
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
                      No students registered yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* references */}
        <section id="references">
          <h2 className="text-2xl font-bold text-white mb-6">References</h2>
          <div className="space-y-3">
            {[
              "Grech, A. and Camilleri, A. (2017). Blockchain in Education. Publications Office of the European Union.",
              "OpenZeppelin Docs. Smart contract security guidance and reusable Solidity standards.",
              "IBM. Blockchain overview and explanation of blockchain use cases and system design.",
              "Solidity Documentation. Core language reference for Ethereum smart contract development."
            ].map(ref => (
              <div key={ref} className="rounded-xl border border-cyan-400/10 bg-white/5 px-5 py-4 text-sm text-slate-400">{ref}</div>
            ))}
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
