import Link from "next/link";
import { ArrowRight, PiggyBank, ShieldCheck, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Users,
    title: "Savings circles",
    desc: "Create chamas and stokvels, invite members and save together.",
  },
  {
    icon: Wallet,
    title: "Digital wallet",
    desc: "Every member gets a wallet to fund, contribute and receive payouts.",
  },
  {
    icon: PiggyBank,
    title: "Rotating payouts",
    desc: "Automated rotation so everyone gets their turn, transparently.",
  },
  {
    icon: ShieldCheck,
    title: "Trust & audit",
    desc: "Full transaction history and audit logs keep groups accountable.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white">
            P
          </div>
          <span className="text-lg font-semibold">Pamodzi Finance</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-12 pt-8 sm:pt-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Save together, grow together
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Community savings,{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
              made simple
            </span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Pamodzi Finance brings the trusted tradition of chamas and stokvels
            online — transparent contributions, rotating payouts and digital
            wallets built for Africa.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Create your group <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                I already have an account
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-xl border bg-card p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Pamodzi Finance. Built for African
        communities.
      </footer>
    </div>
  );
}
