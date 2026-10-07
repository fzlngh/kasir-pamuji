"use client";

import { useEffect, useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { AlertCircle, LogIn, Lock, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import confetti from "canvas-confetti";

type Status = "idle" | "submitting" | "error" | "success";

const fieldVariants = {
  hidden: { opacity: 0, y: -8 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.08, duration: 0.3, ease: "easeOut" },
  }),
};

export default function ReceiptLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const { user, login, authError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");

    const result = await login(email, password);

    if (!result.ok) {
      setStatus("error");
      setMessage(result.message ?? "Email atau password tidak valid.");
      return;
    }

    setStatus("success");

    confetti({
      particleCount: 60,
      spread: 75,
      startVelocity: 30,
      origin: { y: 0.3 },
      colors: ["#3EB489", "#AEB8CC", "#FFFFFF"],
      scalar: 0.9,
    });

    window.setTimeout(() => router.push("/dashboard"), 650);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={
        status === "error"
          ? { opacity: 1, y: 0, x: [0, -8, 8, -6, 6, -3, 3, 0] }
          : { opacity: 1, y: 0 }
      }
      transition={
        status === "error"
          ? { x: { duration: 0.45 }, opacity: { duration: 0.3 } }
          : { duration: 0.5, ease: "easeOut" }
      }
      className="neu-raised w-full max-w-[340px] px-6 py-8 sm:max-w-md sm:px-10 sm:py-11"
    >
      <motion.div
        custom={0}
        variants={fieldVariants}
        initial="hidden"
        animate="show"
        className="neu-raised-sm mx-auto mb-5 flex h-14 w-14 items-center justify-center text-neu-accent sm:h-16 sm:w-16"
      >
        <LogIn className="h-6 w-6 sm:h-7 sm:w-7" />
      </motion.div>

      <motion.h1
        custom={1}
        variants={fieldVariants}
        initial="hidden"
        animate="show"
        className="text-center font-display text-lg font-semibold text-neu-text sm:text-xl"
      >
        Aplikasi Kasir
      </motion.h1>
      <motion.p
        custom={2}
        variants={fieldVariants}
        initial="hidden"
        animate="show"
        className="mb-6 mt-1 text-center text-xs text-neu-muted sm:text-sm"
      >
        Masuk untuk membuka panel kasir
      </motion.p>

      <form onSubmit={handleSubmit}>
        <motion.div
          custom={3}
          variants={fieldVariants}
          initial="hidden"
          animate="show"
          className="neu-pressed mb-4 flex items-center gap-3 px-4 py-3"
        >
          <User className="h-4 w-4 flex-shrink-0 text-neu-muted" />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            aria-label="Email"
            autoComplete="email"
            placeholder="Email"
            className="w-full bg-transparent text-sm text-neu-text outline-none placeholder:text-neu-muted/70"
          />
        </motion.div>

        <motion.div
          custom={4}
          variants={fieldVariants}
          initial="hidden"
          animate="show"
          className="neu-pressed mb-6 flex items-center gap-3 px-4 py-3"
        >
          <Lock className="h-4 w-4 flex-shrink-0 text-neu-muted" />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            aria-label="Password"
            autoComplete="current-password"
            placeholder="Password"
            className="w-full bg-transparent text-sm text-neu-text outline-none placeholder:text-neu-muted/70"
          />
        </motion.div>

        <motion.button
          custom={5}
          variants={fieldVariants}
          initial="hidden"
          animate="show"
          type="submit"
          disabled={status === "submitting"}
          whileTap={{ scale: 0.97 }}
          className="neu-raised-sm neu-btn w-full py-3 text-sm font-semibold uppercase tracking-widest text-neu-accent-dark disabled:opacity-60"
        >
          {status === "submitting" ? "Memeriksa..." : "Masuk"}
        </motion.button>

        <AnimatePresence>
          {(status === "error" || authError) && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center justify-center gap-2 text-xs text-neu-danger sm:text-sm"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{message || authError}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}
