"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { HiMenu, HiX } from "react-icons/hi";

// WalletMultiButton client-only
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(mod => mod.WalletMultiButton),
  { ssr: false }
);

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  const active = (href: string) =>
    pathname === href
      ? "text-primary font-semibold"
      : "text-gray-700 dark:text-gray-300";

  const links = [
    { href: "/", label: "All Campaigns" },
    { href: "/campaigns/create", label: "Create Campaign" },
    { href: "/campaigns/mine", label: "My Campaigns" },
  ];

  return (
    <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/40 backdrop-blur-md relative">
      {/* LOGO */}
      <Link href="/" className="text-lg font-semibold text-gray-900 dark:text-white">
        SolanaCrowd
      </Link>

      {/* Desktop Links */}
      <div className="hidden md:flex items-center space-x-6">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={active(link.href)}>
            {link.label}
          </Link>
        ))}
        {mounted && (
          <WalletMultiButton className="!bg-zinc-900 dark:!bg-zinc-200 dark:!text-black !text-white" />
        )}
      </div>

      {/* Mobile Hamburger */}
      <div className="md:hidden flex items-center">
        {mounted && (
          <WalletMultiButton className="!bg-zinc-900 dark:!bg-zinc-200 dark:!text-black !text-white mr-2" />
        )}
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-700 transition"
        >
          {open ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="absolute top-full left-0 w-full bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800 md:hidden flex flex-col py-2 z-50">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${active(link.href)} px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700`}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
