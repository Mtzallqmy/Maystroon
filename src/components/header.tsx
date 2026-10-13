"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Moon, Sun, Menu, X, Search } from "lucide-react";
import type { Category } from "@/lib/content";
export function Header({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const d =
      saved === "dark" ||
      (!saved && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", d);
  }, []);
  function toggle() {
    const d = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", d);
    setDark(d);
    localStorage.setItem("theme", d ? "dark" : "light");
  }
  const links = (
    <>
      <Link href="/" onClick={() => setOpen(false)}>
        الرئيسية
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={"/categories/" + c.slug}
          onClick={() => setOpen(false)}
        >
          {c.name}
        </Link>
      ))}
      <Link href="/about" onClick={() => setOpen(false)}>
        حول ما يسطرون
      </Link>
    </>
  );
  return (
    <header className="masthead">
      <div className="wrap header-top">
        <Link href="/" className="brand" aria-label="ما يسطرون — الرئيسية">
          ما يسطرون<small>MAYSTROON</small>
        </Link>
        <span className="edition">
          مساحة للمعرفة والحكاية
          <br />
          اليمن · تعز · ٢٠٢٦
        </span>
        <div className="tools">
          <Link href="/search" className="icon-button" aria-label="البحث">
            <Search size={19} />
          </Link>
          <button
            className="icon-button"
            onClick={toggle}
            aria-label="تبديل الوضع الفاتح والداكن"
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button
            className="icon-button mobile-menu-button"
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
      <nav className="wrap desktop-nav" aria-label="القائمة الرئيسية">
        {links}
      </nav>
      {open && (
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label="قائمة الهاتف"
        >
          {links}
        </nav>
      )}
    </header>
  );
}
