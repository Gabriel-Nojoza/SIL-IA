"use client";

interface ChatLayoutProps {
  header: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
  sidebar?: React.ReactNode;
  mobileSidebarOpen?: boolean;
  onMobileSidebarClose?: () => void;
}

export function ChatLayout({
  header,
  children,
  footer,
  sidebar,
  mobileSidebarOpen = false,
  onMobileSidebarClose,
}: ChatLayoutProps) {
  return (
    <main className="relative h-[100dvh] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-hero-grid bg-[length:42px_42px] opacity-20" />

      {/* Mobile sidebar drawer */}
      {sidebar ? (
        <>
          {/* Overlay */}
          <div
            className={`fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden ${
              mobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={onMobileSidebarClose}
          />
          {/* Drawer */}
          <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border/80 bg-[#0a0d14] transition-transform duration-300 lg:hidden ${
              mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {sidebar}
          </aside>
        </>
      ) : null}

      <div className="relative flex h-full w-full gap-0">
        {/* Desktop sidebar */}
        {sidebar ? (
          <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border/60 bg-card/60 lg:flex">
            {sidebar}
          </aside>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          {header}
          <section className="flex min-h-0 flex-1 flex-col">{children}</section>
          <div className="px-3 pb-3 pt-2 sm:px-6 sm:pb-5">{footer}</div>
        </div>
      </div>
    </main>
  );
}
