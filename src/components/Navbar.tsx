// navigation bar shown at the top of every page
// uses anchor links with hash routing so the page doesn't reload when switching sections

export default function Navbar() {
  return (
    <header className="border-b border-cyan-400/10 bg-[#070d1a]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

        {/* logo / home link */}
        <a href="#home" className="flex items-center gap-3 text-lg font-semibold text-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-sm font-bold text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.28)]">
            BCU
          </span>
          <span className="tracking-wide">BCU Blockchain</span>
        </a>

        {/* main nav links — hidden on mobile, shown on md+ */}
        <nav className="hidden gap-6 text-sm font-medium text-slate-300 md:flex">
          <a href="#home" className="transition hover:text-cyan-300">Home</a>
          <a href="#product" className="transition hover:text-cyan-300">Solution</a>
          <a href="#pricing" className="transition hover:text-cyan-300">Project Plan</a>
          <a href="#contact" className="transition hover:text-cyan-300">Feasibility</a>
          <a href="#leaderboard-page" className="transition hover:text-cyan-300">Leaderboard</a>
          <a href="#teacher" className="transition hover:text-cyan-300">Teacher Portal</a>
          <a href="#references" className="transition hover:text-cyan-300">References</a>
        </nav>
      </div>
    </header>
  );
}
