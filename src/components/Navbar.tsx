export default function Navbar() {
  return (
    <header className="border-b border-cyan-400/10 bg-[#070d1a]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#home" className="flex items-center gap-3 text-lg font-semibold text-white">
          <img src="/src/assets/bcu-logo.png" alt="BCU" className="h-10 w-10 object-contain" />
          <span className="tracking-wide">BCU Blockchain</span>
        </a>
        <nav className="hidden gap-6 text-sm font-medium text-slate-300 md:flex">
          <a href="#leaderboard-page" className="transition hover:text-cyan-300">Leaderboard</a>
          <a href="#teacher" className="transition hover:text-cyan-300">Teacher Portal</a>
          <a href="#references" className="transition hover:text-cyan-300">References</a>
        </nav>
      </div>
    </header>
  );
}
