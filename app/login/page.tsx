import ReceiptLogin from "@/components/ReceiptLogin";
import TillDisplay from "@/components/TillDisplay";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12 sm:gap-8 sm:py-16">
      <TillDisplay />
      <ReceiptLogin />
    </main>
  );
}
