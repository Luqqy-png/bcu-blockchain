// simple footer shown at the bottom of the main site pages
// not shown on the teacher portal or any full-screen views

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-cyan-400/10 bg-[#070d1a]/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
        <span>© {new Date().getFullYear()} BCU Blockchain</span>
        <span>Birmingham City University blockchain project.</span>
      </div>
    </footer>
  );
}
