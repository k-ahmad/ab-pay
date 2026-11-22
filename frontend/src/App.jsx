import { useEffect, useMemo, useState } from "react";
import { authAPI, withdrawalAPI, adminAPI } from "./api";
import {
  Bell,
  Home,
  Users,
  Gift,
  UserRound,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Eye,
  EyeOff,
  Wallet,
  ShieldCheck,
  Headphones,
  ChevronRight,
  Menu,
  X,
  Copy,
  CircleHelp,
  CreditCard,
  Clock3,
  Settings,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Search,
  Smartphone,
  Banknote,
  LockKeyhole,
  LogOut,
  CalendarDays,
  FileText,
  CircleDollarSign,
  RefreshCw,
  ArrowLeft,
  Info,
  Zap,
  BadgeCheck,
} from "lucide-react";

const NAV = [
  { name: "Home", icon: Home },
  { name: "Recharge", icon: ArrowDownLeft },
  { name: "Withdraw", icon: ArrowUpRight },
  { name: "Team", icon: Users },
  { name: "Earn Rewards", icon: Gift },
  { name: "Records", icon: History },
  { name: "My Profile", icon: UserRound },
  { name: "Admin Panel", icon: ShieldCheck },
];

const PROVIDERS = [
  {
    name: "bKash",
    mark: "b",
    color: "bg-pink-500",
    note: "Mobile financial service",
  },
  {
    name: "Nagad",
    mark: "N",
    color: "bg-orange-500",
    note: "Digital financial service",
  },
  { name: "Uddokta", mark: "U", color: "bg-sky-500", note: "Payment provider" },
  {
    name: "bKash Agent",
    mark: "b",
    color: "bg-violet-500",
    note: "Agent payment",
  },
  {
    name: "UPay",
    mark: "U",
    color: "bg-lime-500",
    note: "Mobile financial service",
  },
];

const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data =
        mode === "login"
          ? await authAPI.login(phone, password)
          : await authAPI.register(phone, password, referralCode);

      onAuthSuccess(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07110e] flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101d18] p-7 shadow-xl">
        <h1 className="text-3xl font-bold text-lime-400 text-center">AB PAY</h1>
        <p className="text-center text-gray-400 mt-2">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm text-gray-300">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="8801XXXXXXXXX"
              required
              className="mt-2 w-full rounded-lg bg-[#07110e] border border-white/10 p-3 outline-none focus:border-lime-400"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              className="mt-2 w-full rounded-lg bg-[#07110e] border border-white/10 p-3 outline-none focus:border-lime-400"
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="text-sm text-gray-300">
                Referral Code (Optional)
              </label>
              <input
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="Enter referral code"
                className="mt-2 w-full rounded-lg bg-[#07110e] border border-white/10 p-3 outline-none focus:border-lime-400"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-lime-400 py-3 font-bold text-black hover:bg-lime-300 disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Login"
                : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          {mode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            className="ml-2 text-lime-400 font-semibold"
          >
            {mode === "login" ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState("Home");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [notice, setNotice] = useState("");

  const navigate = (next) => {
    setPage(next);
    setMobileMenu(false);
    setNotice("");
  };

  const addTransaction = (transaction, options = {}) => {
    const created = {
      ...transaction,
      id: `ABP-${Date.now().toString().slice(-8)}`,
      date: new Date().toLocaleString(),
      status: "Pending",
    };
    setTransactions((current) => [created, ...current]);
    if (!options.stayOnPage) setPage("Records");
    setNotice("Your request has been added to the demo activity list.");
    return created;
  };

  const totalRecharge = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "Recharge" && t.status === "Successful")
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  );
  const totalWithdraw = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "Withdraw" && t.status === "Successful")
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  );

  const PageIcon = NAV.find((item) => item.name === page)?.icon || Home;

  const [authToken, setAuthToken] = useState(() =>
    localStorage.getItem("abpay_token"),
  );
  const [currentUser, setCurrentUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  async function refreshWallet() {
    if (!authToken) return null;
    const data = await authAPI.me(authToken);
    setCurrentUser(data.user);
    setWallet(data.wallet);
    return data;
  }

  async function submitWithdrawal(payload) {
    const result = await withdrawalAPI.create(authToken, payload);
    await refreshWallet();

    const created = {
      id: result.transaction_id || result.public_id,
      type: "Withdraw",
      amount: Number(result.amount ?? payload.amount),
      method: payload.payment_method,
      account: payload.recipient,
      reference: "Withdrawal request",
      date: new Date().toLocaleString(),
      status: "Pending",
    };
    setTransactions((current) => [created, ...current]);
    setNotice(
      "Withdrawal request submitted. Wallet balance has been refreshed.",
    );
    return created;
  }

  useEffect(() => {
    if (page === "Admin Panel" && currentUser?.role !== "admin") {
      setPage("Home");
    }
  }, [page, currentUser]);

  useEffect(() => {
    if (!authToken) {
      setCurrentUser(null);
      setWallet(null);
      setAuthLoading(false);
      return;
    }

    let cancelled = false;

    async function loadUser() {
      try {
        const data = await authAPI.me(authToken);

        if (!cancelled) {
          setCurrentUser(data.user);
          setWallet(data.wallet);
        }
      } catch (error) {
        if (!cancelled) {
          localStorage.removeItem("abpay_token");
          setAuthToken(null);
          setCurrentUser(null);
          setWallet(null);
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  function handleAuthSuccess(data) {
    localStorage.setItem("abpay_token", data.access_token);
    setAuthToken(data.access_token);
  }

  function handleLogout() {
    localStorage.removeItem("abpay_token");
    setAuthToken(null);
    setCurrentUser(null);
    setWallet(null);
    setPage("Home");
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#07110e] flex items-center justify-center text-lime-400">
        Loading AB PAY...
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#061b15] text-slate-100 selection:bg-lime-300 selection:text-[#071b15]">
      {mobileMenu && (
        <button
          aria-label="Close menu overlay"
          onClick={() => setMobileMenu(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-white/[0.08] bg-[#081f18] px-5 py-6 transition-transform duration-300 lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-12 flex items-center justify-between">
          <button
            onClick={() => navigate("Home")}
            className="flex items-center gap-3"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-lime-300 to-emerald-400 text-xl font-black text-[#09251a] shadow-lg shadow-lime-400/10">
              A
            </span>
            <span className="text-[22px] font-extrabold tracking-tight">
              AB <span className="text-lime-300">PAY</span>
            </span>
          </button>
          <button
            onClick={() => setMobileMenu(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 px-3 text-[10px] font-bold tracking-[0.24em] text-slate-500">
          MAIN MENU
        </p>
        <nav className="space-y-2">
          {NAV.filter(({ name }) => {
            page === "Admin Panel" && currentUser?.role === "admin" && (
              <AdminPage />
            );
          }).map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => navigate(name)}
              className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm transition ${page === name ? "border border-lime-300/20 bg-lime-300/[0.11] font-semibold text-lime-300 shadow-[inset_0_0_24px_rgba(190,242,100,0.04)]" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{name}</span>
              {page === name && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-lime-300 shadow-[0_0_10px_#bef264]" />
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-white/10 bg-gradient-to-br from-[#143b2d] to-[#0d2b21] p-4">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300">
            <Headphones size={21} />
          </div>
          <p className="text-sm font-semibold">Need help?</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Our support team is here to assist you.
          </p>
          <button
            onClick={() => navigate("My Profile")}
            className="mt-3 flex items-center gap-1 text-xs font-semibold text-lime-300"
          >
            Contact support <ArrowUpRight size={14} />
          </button>
        </div>
        <p className="mt-5 text-center text-[10px] text-slate-600">
          AB PAY · User Portal
        </p>
      </aside>

      <main className="min-h-screen lg:pl-[270px]">
        <header className="sticky top-0 z-30 flex h-[82px] items-center justify-between border-b border-white/[0.08] bg-[#071d16]/90 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenu(true)}
              className="rounded-xl border border-white/10 p-2.5 text-slate-300 lg:hidden"
            >
              <Menu size={19} />
            </button>

            <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
              <span>Workspace</span>
              <ChevronRight size={14} />
              <span className="font-semibold text-slate-200">{page}</span>
            </div>

            <div className="sm:hidden text-sm font-semibold">{page}</div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate("Records")}
              aria-label="Notifications and activity"
              className="relative rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-slate-300 hover:border-lime-300/30"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-lime-300" />
            </button>

            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-lime-300 to-emerald-400 font-bold text-[#09251a]">
              A
            </div>

            <div className="hidden sm:block">
              <p className="text-xs font-semibold">AB PAY User</p>
              <p className="mt-1 text-[10px] text-slate-500">Member Account</p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 sm:px-4 sm:text-sm"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-4 pb-28 pt-8 sm:px-8 lg:px-10 lg:pb-12">
          {notice && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-sm text-lime-200">
              <Info size={17} />
              {notice}
              <button className="ml-auto" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}

          {page === "Home" && (
            <Dashboard
              showBalance={showBalance}
              setShowBalance={setShowBalance}
              navigate={navigate}
              transactions={transactions}
              totalRecharge={totalRecharge}
              totalWithdraw={totalWithdraw}
              walletBalance={wallet?.available_balance || "0.00"}
            />
          )}

          {page === "Recharge" && (
            <RechargePage onSubmit={addTransaction} navigate={navigate} />
          )}

          {page === "Withdraw" && (
            <WithdrawPage
              onSubmit={submitWithdrawal}
              navigate={navigate}
              walletBalance={wallet?.available_balance || "0.00"}
            />
          )}
          {page === "Team" && <TeamPage />}
          {page === "Earn Rewards" && <RewardsPage />}
          {page === "Records" && <RecordsPage transactions={transactions} />}
          {page === "Admin Panel" && currentUser?.role === "admin" && (
            <AdminPage
              token={authToken}
              onNotice={setNotice}
              onWalletRefresh={refreshWallet}
            />
          )}

          {page === "My Profile" && (
            <ProfilePage navigate={navigate} setNotice={setNotice} />
          )}
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-[#081f18]/95 px-2 py-2 backdrop-blur-xl lg:hidden">
          {[
            ["Home", Home],
            ["Recharge", ArrowDownLeft],
            ["Withdraw", ArrowUpRight],
            ["Team", Users],
            ["My Profile", UserRound],
          ].map(([name, Icon]) => (
            <button
              key={name}
              onClick={() => navigate(name)}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] ${page === name ? "text-lime-300" : "text-slate-500"}`}
            >
              <Icon size={19} />
              <span>{name === "My Profile" ? "Profile" : name}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}

function PageHeading({
  eyebrow = "AB PAY WORKSPACE",
  title,
  subtitle,
  icon: Icon,
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] text-lime-300">
          <Sparkles size={13} />
          {eyebrow}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-[36px]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
      </div>
      {Icon && (
        <div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-lime-300/20 bg-lime-300/10 text-lime-300 sm:flex">
          <Icon size={22} />
        </div>
      )}
    </div>
  );
}

function Panel({ children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-white/[0.09] bg-[#0d2a20] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)] sm:p-7 ${className}`}
    >
      {children}
    </section>
  );
}

function Dashboard({
  showBalance,
  setShowBalance,
  navigate,
  transactions,
  totalRecharge,
  totalWithdraw,
  walletBalance,
}) {
  const recent = transactions.slice(0, 3);
  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] text-lime-300">
            <Sparkles size={13} /> YOUR FINANCIAL SPACE
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-[36px]">
            Welcome back! <span>👋</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Here's what's happening with your account today.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-400">
          <CalendarDays size={14} /> Account overview
        </div>
      </div>

      <section className="relative mb-6 overflow-hidden rounded-[26px] border border-lime-200/15 bg-gradient-to-br from-[#163b2d] via-[#086b57] to-[#0b9b7d] p-6 shadow-2xl shadow-emerald-950/30 sm:p-8">
        <div className="absolute -right-16 -top-28 h-72 w-72 rounded-full bg-lime-300/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative flex items-start justify-between">
          <div className="mt-4 flex items-center gap-3">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {showBalance
                ? `৳ ${Number(walletBalance || 0).toFixed(2)}`
                : "৳ ••••••"}
            </h2>

            <button
              onClick={() => setShowBalance(!showBalance)}
              className="rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20"
              aria-label="Toggle balance visibility"
            >
              {showBalance ? <Eye size={17} /> : <EyeOff size={17} />}
            </button>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-bold tracking-wider text-white">
            <Wallet size={14} className="mr-1 inline" /> MY WALLET
          </div>
        </div>

        <div className="relative mt-9 flex items-center justify-between border-t border-white/20 pt-4 text-[10px] font-medium tracking-wider text-emerald-50/75">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-300" /> ACCOUNT
            OVERVIEW
          </span>
          <span>AB PAY WALLET</span>
        </div>
      </section>

      <div className="mb-9 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          [
            "Recharge",
            "Add money to wallet",
            Plus,
            "text-lime-300 bg-lime-300/10",
          ],
          [
            "Withdraw",
            "Request a payout",
            ArrowUpRight,
            "text-cyan-300 bg-cyan-300/10",
          ],
          [
            "Team",
            "Manage referrals",
            Users,
            "text-violet-300 bg-violet-300/10",
          ],
          [
            "Earn Rewards",
            "Explore rewards",
            Gift,
            "text-orange-300 bg-orange-300/10",
          ],
        ].map(([name, desc, Icon, style]) => (
          <button
            key={name}
            onClick={() => navigate(name)}
            className="group relative rounded-2xl border border-white/[0.08] bg-[#0d2a20] p-4 text-left transition hover:-translate-y-1 hover:border-lime-300/30 hover:bg-[#103326] sm:p-5"
          >
            <span
              className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${style}`}
            >
              <Icon size={21} />
            </span>
            <strong className="block text-sm">{name}</strong>
            <span className="mt-1 block text-[10px] text-slate-500">
              {desc}
            </span>
            <ChevronRight
              size={16}
              className="absolute right-4 top-5 text-slate-600 transition group-hover:text-lime-300"
            />
          </button>
        ))}
      </div>

      <SectionTitle
        title="Today's Activity"
        subtitle="Your wallet activity overview"
        action="View records"
        onAction={() => navigate("Records")}
      />
      <div className="mb-9 grid gap-3 sm:grid-cols-3">
        {[
          [
            ArrowDownLeft,
            "Total Recharge",
            `৳ ${money(totalRecharge)}`,
            "text-lime-300 bg-lime-300/10",
          ],
          [
            ArrowUpRight,
            "Total Withdraw",
            `৳ ${money(totalWithdraw)}`,
            "text-cyan-300 bg-cyan-300/10",
          ],
          [
            TrendingUp,
            "Total Rewards",
            "৳ 0.00",
            "text-violet-300 bg-violet-300/10",
          ],
        ].map(([Icon, label, value, style]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/[0.08] bg-[#0d2a20] p-5"
          >
            <span
              className={`mb-4 grid h-9 w-9 place-items-center rounded-xl ${style}`}
            >
              <Icon size={18} />
            </span>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-bold">{value}</p>
            <p className="mt-1 text-[10px] text-slate-600">
              Based on available activity
            </p>
          </div>
        ))}
      </div>

      <SectionTitle
        title="Reward Center"
        subtitle="Discover tasks, milestones and referral features"
        action="Explore all"
        onAction={() => navigate("Earn Rewards")}
      />
      <div className="relative mb-9 overflow-hidden rounded-2xl border border-lime-300/15 bg-gradient-to-r from-[#173c2b] to-[#114d3c] p-6 sm:p-8">
        <div className="relative z-10 max-w-lg">
          <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-[9px] font-bold tracking-[0.18em] text-lime-300">
            AB PAY REWARDS
          </span>
          <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
            Every step brings
            <br />
            new opportunities.
          </h2>
          <p className="mt-2 text-xs leading-6 text-slate-400">
            Explore daily tasks, milestones and invite features configured for
            your account.
          </p>
          <button
            onClick={() => navigate("Earn Rewards")}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-lime-300 px-4 py-3 text-xs font-bold text-[#102419] hover:bg-lime-200"
          >
            Explore Rewards <ArrowUpRight size={15} />
          </button>
        </div>
        <Gift
          className="absolute -right-3 bottom-0 h-44 w-44 -rotate-12 text-lime-200/10 sm:right-12 sm:h-56 sm:w-56"
          strokeWidth={1}
        />
      </div>

      <SectionTitle
        title="Recent Transactions"
        subtitle="Your latest wallet activities"
        action="View all"
        onAction={() => navigate("Records")}
      />
      {recent.length ? (
        <TransactionList transactions={recent} />
      ) : (
        <EmptyState
          icon={History}
          title="No transactions yet"
          description="Your wallet activity will appear here once you submit a request."
        />
      )}
    </>
  );
}

function SectionTitle({ title, subtitle, action, onAction }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h3 className="text-base font-bold">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
        )}
      </div>
      {action && (
        <button
          onClick={onAction}
          className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-lime-300 hover:text-lime-200"
        >
          {action}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-slate-300">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-xl border border-white/10 bg-[#081f18] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-lime-300/50 focus:ring-2 focus:ring-lime-300/10"
      />
    </label>
  );
}

function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-lime-300 to-emerald-300 px-5 py-3.5 text-sm font-bold text-[#09251a] shadow-lg shadow-lime-950/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function RechargePage({ onSubmit, navigate }) {
  const [method, setMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [sender, setSender] = useState("");
  const [reference, setReference] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(null);

  const selectedProvider = PROVIDERS.find(
    (provider) => provider.name === method,
  );
  const continueToPayment = () => {
    if (!method) return setError("Please choose a payment method.");
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) < 1)
      return setError("Enter a valid amount of at least ৳1.");
    if (Number(amount) > 1000000)
      return setError(
        "For this demo, please enter an amount up to ৳1,000,000.",
      );
    setError("");
    setStep(2);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!sender.trim() || !reference.trim())
      return setError("Enter your sender account number and transaction ID.");
    if (!/^[0-9+\s-]{8,20}$/.test(sender.trim()))
      return setError("Enter a valid sender account number.");
    if (reference.trim().length < 4)
      return setError("Please check your transaction ID / reference.");
    setError("");
    const request = onSubmit(
      {
        type: "Recharge",
        amount: Number(amount),
        method,
        reference: reference.trim(),
        account: sender.trim(),
      },
      { stayOnPage: true },
    );
    setSubmitted(request);
  };

  if (submitted) {
    return (
      <>
        <PageHeading
          title="Recharge Request Submitted"
          subtitle="Your demo request has been recorded successfully."
          icon={CheckCircle2}
        />
        <div className="mx-auto max-w-2xl">
          <Panel>
            <div className="mx-auto flex max-w-md flex-col items-center py-5 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
                <Clock3 size={30} />
              </span>
              <h2 className="mt-5 text-xl font-extrabold">Request Pending</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Your recharge request is saved in this browser demo. Your wallet
                balance has not been changed.
              </p>
              <div className="mt-6 w-full rounded-2xl border border-white/10 bg-[#081f18] p-4 text-left">
                <div className="flex justify-between gap-3 border-b border-white/[0.07] pb-3">
                  <span className="text-xs text-slate-500">Request ID</span>
                  <span className="text-xs font-bold text-lime-300">
                    {submitted.id}
                  </span>
                </div>
                <div className="flex justify-between gap-3 py-3">
                  <span className="text-xs text-slate-500">Amount</span>
                  <span className="text-sm font-bold">
                    ৳ {money(submitted.amount)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-t border-white/[0.07] py-3">
                  <span className="text-xs text-slate-500">Payment method</span>
                  <span className="text-xs font-semibold">
                    {submitted.method}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-t border-white/[0.07] pt-3">
                  <span className="text-xs text-slate-500">Status</span>
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200">
                    Pending
                  </span>
                </div>
              </div>
              <div className="mt-5 flex w-full flex-col gap-3 sm:flex-row">
                <PrimaryButton
                  type="button"
                  onClick={() => navigate("Records")}
                >
                  View Recharge Records <History size={17} />
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(null);
                    setStep(1);
                    setMethod("");
                    setAmount("");
                    setSender("");
                    setReference("");
                  }}
                  className="w-full rounded-xl border border-white/10 px-5 py-3.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.05]"
                >
                  Make Another Request
                </button>
              </div>
            </div>
          </Panel>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Recharge Wallet"
        subtitle="Submit a wallet top-up request using a supported Bangladesh payment method."
        icon={ArrowDownLeft}
      />
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 grid grid-cols-2 gap-2">
          {["Choose method & amount", "Payment details"].map((label, index) => (
            <div
              key={label}
              className={`rounded-xl border px-3 py-3 ${step === index + 1 ? "border-lime-300/40 bg-lime-300/[0.08]" : "border-white/10 bg-[#0b281e]"}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${step === index + 1 ? "bg-lime-300 text-[#09251a]" : "bg-white/10 text-slate-400"}`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-xs font-semibold ${step === index + 1 ? "text-lime-200" : "text-slate-500"}`}
                >
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {step === 1 ? (
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Panel>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="font-bold">Select Payment Method</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Choose how you intend to make your deposit.
                  </p>
                </div>
                <CreditCard className="text-lime-300" size={22} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {PROVIDERS.map((provider) => (
                  <button
                    type="button"
                    key={provider.name}
                    onClick={() => {
                      setMethod(provider.name);
                      setError("");
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${method === provider.name ? "border-lime-300/60 bg-lime-300/10" : "border-white/10 bg-[#102f23] hover:border-white/20"}`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-black text-white ${provider.color}`}
                    >
                      {provider.mark}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm">{provider.name}</strong>
                      <small className="mt-1 block text-[10px] text-slate-500">
                        {provider.note}
                      </small>
                    </span>
                    {method === provider.name ? (
                      <CheckCircle2 className="text-lime-300" size={18} />
                    ) : (
                      <ChevronRight className="text-slate-500" size={17} />
                    )}
                  </button>
                ))}
              </div>
            </Panel>
            <Panel>
              <h2 className="font-bold">Recharge Amount</h2>
              <p className="mt-1 text-xs text-slate-500">
                Enter the amount in Bangladeshi Taka.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {[500, 1000, 2000, 5000].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setAmount(String(value));
                      setError("");
                    }}
                    className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${Number(amount) === value ? "border-lime-300/50 bg-lime-300/10 text-lime-200" : "border-white/10 bg-[#102f23] text-slate-300 hover:border-white/20"}`}
                  >
                    ৳ {money(value)}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <Field
                  label="Custom Amount (BDT)"
                  type="number"
                  min="1"
                  max="1000000"
                  step="1"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="mt-5 rounded-xl border border-white/10 bg-[#081f18] p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Selected method</span>
                  <span className="font-semibold text-white">
                    {method || "Not selected"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-3">
                  <span className="text-xs text-slate-400">
                    Recharge amount
                  </span>
                  <strong className="text-lg text-lime-300">
                    ৳{" "}
                    {amount && Number(amount) > 0
                      ? money(Number(amount))
                      : "0.00"}
                  </strong>
                </div>
              </div>
              {error && (
                <p role="alert" className="mt-3 text-xs text-rose-300">
                  {error}
                </p>
              )}
              <div className="mt-5">
                <PrimaryButton type="button" onClick={continueToPayment}>
                  Continue <ArrowUpRight size={17} />
                </PrimaryButton>
              </div>
            </Panel>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel>
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-xl text-lg font-black text-white ${selectedProvider?.color || "bg-slate-600"}`}
                >
                  {selectedProvider?.mark || "?"}
                </span>
                <div>
                  <h2 className="font-bold">{method} Payment</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Recharge amount: ৳ {money(Number(amount))}
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
                <div className="flex gap-2 text-sm font-semibold text-amber-200">
                  <Info size={17} className="shrink-0" /> Official payment
                  instructions are not configured
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  The client must provide verified receiver account details or
                  an approved payment API before this section can display real
                  payment instructions.
                </p>
                <p className="mt-3 text-xs font-semibold leading-5 text-amber-100">
                  Do not send money to any number or account based on this demo
                  screen.
                </p>
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-[#081f18] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Selected provider
                  </span>
                  <span className="text-xs font-semibold">{method}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-3">
                  <span className="text-xs text-slate-500">Request amount</span>
                  <strong className="text-lg text-lime-300">
                    ৳ {money(Number(amount))}
                  </strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError("");
                }}
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                <ArrowLeft size={15} /> Change method or amount
              </button>
            </Panel>
            <Panel>
              <h2 className="font-bold">Payment Reference Details</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                This demo records the details you enter. It does not verify a
                payment.
              </p>
              <form onSubmit={submit} className="mt-5 space-y-4">
                <Field
                  label="Your Sender Account Number"
                  type="tel"
                  placeholder="e.g. 01XXXXXXXXX"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                />
                <Field
                  label="Transaction ID / Reference"
                  placeholder="Enter transaction ID"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                {error && (
                  <p role="alert" className="text-xs text-rose-300">
                    {error}
                  </p>
                )}
                <PrimaryButton type="submit">
                  Submit Recharge Request <ArrowUpRight size={17} />
                </PrimaryButton>
                <p className="text-center text-[10px] leading-5 text-slate-500">
                  Submitting creates a local pending request only. No payment is
                  processed, verified, or credited to your wallet.
                </p>
              </form>
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}

function WithdrawPage({ onSubmit, navigate, walletBalance }) {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const providers = [
    { name: "bKash", mark: "b", color: "bg-pink-500" },
    { name: "Nagad", mark: "N", color: "bg-orange-500" },
    { name: "Rocket", mark: "R", color: "bg-violet-500" },
    { name: "UPay", mark: "U", color: "bg-lime-500" },
  ];

  const continueToReview = () => {
    if (!method) return setError("Please select a withdrawal method.");
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0)
      return setError("Enter a valid withdrawal amount.");
    if (!/^\d+(\.\d{1,2})?$/.test(amount))
      return setError("Amount can have up to 2 decimal places.");
    if (Number(amount) > Number(walletBalance || 0))
      return setError("Insufficient wallet balance.");
    if (!/^[0-9+\s-]{8,20}$/.test(account.trim()))
      return setError("Enter a valid recipient account number.");
    if (!accountName.trim())
      return setError("Enter the recipient account holder name.");
    setError("");
    setStep(2);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const request = await onSubmit({
        amount: Number(amount),
        payment_method: method,
        recipient: account.trim(),
      });
      setSubmitted({
        id: request.id,
        amount: request.amount,
        method,
        account: account.trim(),
        accountName: accountName.trim(),
        status: "Pending",
      });
    } catch (err) {
      setError(err.message || "Unable to submit withdrawal request.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <>
        <PageHeading
          title="Withdrawal Request Submitted"
          subtitle="Your request has been saved by the AB PAY server."
          icon={CheckCircle2}
        />
        <div className="mx-auto max-w-2xl">
          <Panel>
            <div className="mx-auto flex max-w-md flex-col items-center py-5 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
                <Clock3 size={30} />
              </span>
              <h2 className="mt-5 text-xl font-extrabold">Request Pending</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Your amount has been reserved by the backend and is awaiting
                admin review. This does not mean a payout has been sent.
              </p>
              <div className="mt-6 w-full rounded-2xl border border-white/10 bg-[#081f18] p-4 text-left">
                <div className="flex justify-between gap-3 border-b border-white/[0.07] pb-3">
                  <span className="text-xs text-slate-500">Request ID</span>
                  <span className="text-xs font-bold text-lime-300">
                    {submitted.id}
                  </span>
                </div>
                <div className="flex justify-between gap-3 py-3">
                  <span className="text-xs text-slate-500">Amount</span>
                  <span className="text-sm font-bold">
                    ৳ {money(submitted.amount)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-t border-white/[0.07] py-3">
                  <span className="text-xs text-slate-500">Payout method</span>
                  <span className="text-xs font-semibold">
                    {submitted.method}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-t border-white/[0.07] py-3">
                  <span className="text-xs text-slate-500">
                    Recipient account
                  </span>
                  <span className="text-xs font-semibold">
                    •••• {submitted.account.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-t border-white/[0.07] pt-3">
                  <span className="text-xs text-slate-500">Status</span>
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200">
                    Pending
                  </span>
                </div>
              </div>
              <div className="mt-5 flex w-full flex-col gap-3 sm:flex-row">
                <PrimaryButton
                  type="button"
                  onClick={() => navigate("Records")}
                >
                  View Withdrawal Records <History size={17} />
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(null);
                    setStep(1);
                    setMethod("");
                    setAmount("");
                    setAccount("");
                    setAccountName("");
                  }}
                  className="w-full rounded-xl border border-white/10 px-5 py-3.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.05]"
                >
                  Make Another Request
                </button>
              </div>
            </div>
          </Panel>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Withdraw Funds"
        subtitle="Create and track a payout request to your Bangladesh mobile wallet."
        icon={ArrowUpRight}
      />
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 grid grid-cols-2 gap-2">
          {["Amount & payout method", "Review request"].map((label, index) => (
            <div
              key={label}
              className={`rounded-xl border px-3 py-3 ${step === index + 1 ? "border-lime-300/40 bg-lime-300/[0.08]" : "border-white/10 bg-[#0b281e]"}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${step === index + 1 ? "bg-lime-300 text-[#09251a]" : "bg-white/10 text-slate-400"}`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-xs font-semibold ${step === index + 1 ? "text-lime-200" : "text-slate-500"}`}
                >
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>
        {step === 1 ? (
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <Panel className="h-fit">
              <p className="text-xs font-bold tracking-wider text-slate-400">
                AVAILABLE BALANCE
              </p>
              <p className="mt-3 text-3xl font-extrabold">
                ৳ {Number(walletBalance || 0).toFixed(2)}
              </p>
              <div className="mt-5 flex gap-2 rounded-xl border border-sky-300/20 bg-sky-300/[0.06] p-3 text-[11px] leading-5 text-sky-100">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>
                  The Flask backend checks your actual balance and reserves the
                  amount when you submit.
                </span>
              </div>
              <div className="mt-5 space-y-3 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Currency</span>
                  <strong className="text-white">BDT (৳)</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Request status</span>
                  <strong className="text-amber-200">
                    Admin review required
                  </strong>
                </div>
              </div>
            </Panel>
            <Panel>
              <h2 className="font-bold">Choose payout method</h2>
              <p className="mt-1 text-xs text-slate-500">
                Select the mobile wallet where you want to receive your payout.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {providers.map((provider) => (
                  <button
                    key={provider.name}
                    type="button"
                    onClick={() => {
                      setMethod(provider.name);
                      setError("");
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${method === provider.name ? "border-lime-300/50 bg-lime-300/[0.08]" : "border-white/10 bg-[#081f18] hover:border-white/20"}`}
                  >
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-xl text-lg font-black text-white ${provider.color}`}
                    >
                      {provider.mark}
                    </span>
                    <span className="text-sm font-semibold">
                      {provider.name}
                    </span>
                    {method === provider.name && (
                      <CheckCircle2
                        className="ml-auto text-lime-300"
                        size={17}
                      />
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-5">
                <Field
                  label="Withdrawal Amount (BDT)"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError("");
                  }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[500, 1000, 2000, 5000].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setAmount(String(value));
                      setError("");
                    }}
                    className={`rounded-lg border px-2 py-2.5 text-xs font-semibold ${Number(amount) === value ? "border-lime-300/40 bg-lime-300/10 text-lime-200" : "border-white/10 bg-[#081f18] text-slate-400 hover:text-white"}`}
                  >
                    ৳ {money(value)}
                  </button>
                ))}
              </div>
              <div className="mt-5 space-y-4">
                <Field
                  label="Recipient Account Number"
                  type="tel"
                  placeholder="e.g. 01XXXXXXXXX"
                  value={account}
                  onChange={(e) => {
                    setAccount(e.target.value);
                    setError("");
                  }}
                />
                <Field
                  label="Account Holder Name"
                  placeholder="Name registered with the wallet"
                  value={accountName}
                  onChange={(e) => {
                    setAccountName(e.target.value);
                    setError("");
                  }}
                />
              </div>
              {error && (
                <p role="alert" className="mt-3 text-xs text-rose-300">
                  {error}
                </p>
              )}
              <div className="mt-5">
                <PrimaryButton type="button" onClick={continueToReview}>
                  Review Withdrawal <ArrowUpRight size={17} />
                </PrimaryButton>
              </div>
            </Panel>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <Panel>
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-lime-300/10 text-lime-300">
                  <ShieldCheck size={22} />
                </span>
                <div>
                  <h2 className="font-bold">Review your withdrawal</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Check the details before submitting your request.
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-white/10 bg-[#081f18] p-4">
                {[
                  ["Amount", `৳ ${money(Number(amount))}`],
                  ["Payout method", method],
                  ["Recipient account", account],
                  ["Account holder", accountName],
                  ["Status after submission", "Pending review"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 border-b border-white/[0.07] py-3 last:border-0 last:pb-0"
                  >
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className="max-w-[60%] break-all text-right text-xs font-semibold text-white">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-[11px] leading-5 text-amber-100">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>
                  On submission, the backend reserves the requested amount.
                  Admin approval is not an automatic bKash/Nagad payout.
                </span>
              </div>
              {error && (
                <p role="alert" className="mt-3 text-xs text-rose-300">
                  {error}
                </p>
              )}
              <form
                onSubmit={submit}
                className="mt-5 flex flex-col gap-3 sm:flex-row"
              >
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError("");
                  }}
                  className="w-full rounded-xl border border-white/10 px-5 py-3.5 text-sm font-semibold text-slate-300 hover:bg-white/[0.05]"
                >
                  <ArrowLeft className="mr-2 inline" size={16} /> Edit details
                </button>
                <PrimaryButton type="submit" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Withdrawal Request"}{" "}
                  <CheckCircle2 size={17} />
                </PrimaryButton>
              </form>
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}

function TeamPage() {
  const [copied, setCopied] = useState(false);
  const demoCode = "ABPAY-DEMO";

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(demoCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <PageHeading
        title="My Team"
        subtitle="Invite people, track your referrals and view your team activity."
        icon={Users}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={Users} label="Total Team Members" value="0" />
        <MetricCard icon={BadgeCheck} label="Active Referrals" value="0" />
        <MetricCard icon={TrendingUp} label="Team Rewards" value="৳ 0.00" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel>
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lime-300/10 text-lime-300">
              <Gift size={21} />
            </span>
            <div>
              <h2 className="font-bold">Invite Friends</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Share your referral code with someone. When they register using
                your code, their account can be linked to your team.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-lime-300/25 bg-[#081f18] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-bold tracking-widest text-slate-500">
                SAMPLE REFERRAL CODE
              </span>
              <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-2.5 py-1 text-[9px] font-semibold text-amber-200">
                Demo only
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono text-xl font-extrabold tracking-[0.12em] text-lime-200">
                {demoCode}
              </span>
              <button
                type="button"
                onClick={copyReferralCode}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime-300 px-4 py-2.5 text-xs font-bold text-[#09251a] transition hover:bg-lime-200"
              >
                {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy Code"}
              </button>
            </div>
            <p className="mt-3 text-[10px] leading-5 text-slate-500">
              This is a sample code for the frontend preview, not a real code
              assigned to your account. The backend must generate each user's
              unique referral code.
            </p>
          </div>
        </Panel>

        <Panel>
          <h2 className="font-bold">How Referrals Work</h2>
          <div className="mt-5 space-y-4">
            {[
              ["01", "Share your code", "Send your referral code to a friend."],
              [
                "02",
                "Friend joins AB PAY",
                "They register and enter your referral code.",
              ],
              [
                "03",
                "Referral is linked",
                "The server records the referral under your account.",
              ],
              [
                "04",
                "Check your team",
                "View invited members and their eligible activity here.",
              ],
            ].map(([number, title, description]) => (
              <div key={number} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-lime-300/10 text-[11px] font-extrabold text-lime-200">
                  {number}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">My Referral Members</h2>
            <p className="mt-1 text-xs text-slate-500">
              People who joined using your referral code.
            </p>
          </div>
          <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-[10px] text-slate-400">
            0 members
          </span>
        </div>
        <div className="mt-5 rounded-xl border border-white/[0.07] bg-[#081f18] px-4 py-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white/[0.04] text-slate-500">
            <Users size={22} />
          </span>
          <h3 className="mt-4 text-sm font-semibold">No referrals yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">
            Your referred members will appear here after referral tracking is
            connected to the backend.
          </p>
        </div>
      </Panel>

      <div className="mt-5 flex gap-3 rounded-xl border border-sky-300/15 bg-sky-300/[0.06] p-4 text-xs leading-5 text-slate-400">
        <Info className="shrink-0 text-sky-300" size={18} />
        <span>
          Referral registration, member status and team reward totals are
          placeholders until the Flask backend and the client's referral rules
          are connected. No real members or earnings are being created on this
          page.
        </span>
      </div>
    </>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d2a20] p-5">
      <span className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-lime-300/10 text-lime-300">
        <Icon size={19} />
      </span>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function RewardsPage() {
  const [historyFilter, setHistoryFilter] = useState("All");
  const rewardTypes = [
    {
      icon: CalendarDays,
      title: "Daily Rewards",
      description:
        "Check whether a daily reward or check-in task is available for your account.",
      detail:
        "Availability and eligibility are controlled by the reward program.",
      tag: "Daily activity",
    },
    {
      icon: TrendingUp,
      title: "Milestone Rewards",
      description:
        "Track progress toward milestones configured by the AB PAY team.",
      detail:
        "Milestone targets and reward values will appear when configured.",
      tag: "Progress",
    },
    {
      icon: Zap,
      title: "Starter Tasks",
      description:
        "See introductory activities and whether each task is complete.",
      detail: "Task completion will be verified by the server.",
      tag: "Tasks",
    },
    {
      icon: Users,
      title: "Invite Rewards",
      description:
        "View rewards related to eligible friends you invite to AB PAY.",
      detail: "Referral conditions must be met before a reward is approved.",
      tag: "Referrals",
    },
  ];

  const filters = ["All", "Pending", "Approved"];

  return (
    <>
      <PageHeading
        title="Earn Rewards"
        subtitle="Track reward opportunities, eligibility and reward activity."
        icon={Gift}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={CircleDollarSign}
          label="Total Rewards"
          value="৳0.00"
        />
        <MetricCard icon={Clock3} label="Pending Rewards" value="৳0.00" />
        <MetricCard
          icon={CheckCircle2}
          label="Approved Rewards"
          value="৳0.00"
        />
      </div>

      <Panel className="mb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">Reward Opportunities</h2>
            <p className="mt-1 text-xs text-slate-500">
              These sections show the types of rewards the program may support.
            </p>
          </div>
          <span className="w-fit rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-3 py-1 text-[10px] text-amber-200">
            Awaiting configuration
          </span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {rewardTypes.map(
            ({ icon: Icon, title, description, detail, tag }) => (
              <div
                key={title}
                className="rounded-xl border border-white/[0.07] bg-[#081f18] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-300/10 text-lime-300">
                    <Icon size={19} />
                  </span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] text-slate-400">
                    {tag}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-bold text-white">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {description}
                </p>
                <div className="mt-4 flex items-start gap-2 border-t border-white/[0.06] pt-3 text-[10px] leading-5 text-slate-500">
                  <Info size={13} className="mt-0.5 shrink-0 text-sky-300" />
                  {detail}
                </div>
              </div>
            ),
          )}
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">Reward History</h2>
            <p className="mt-1 text-xs text-slate-500">
              Review rewards after they are recorded by the backend.
            </p>
          </div>
          <div className="flex gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setHistoryFilter(filter)}
                className={`rounded-lg px-3 py-2 text-[10px] font-semibold transition ${historyFilter === filter ? "bg-lime-300 text-[#09251a]" : "bg-white/[0.05] text-slate-400 hover:text-white"}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-white/[0.07] bg-[#081f18] px-4 py-9 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white/[0.04] text-slate-500">
            <Gift size={22} />
          </span>
          <h3 className="mt-4 text-sm font-semibold text-white">
            No{" "}
            {historyFilter === "All"
              ? "rewards"
              : historyFilter.toLowerCase() + " rewards"}{" "}
            yet
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">
            Your reward transactions will appear here once the reward rules and
            Flask API are connected.
          </p>
        </div>
      </Panel>

      <div className="mt-5 flex gap-3 rounded-xl border border-sky-300/15 bg-sky-300/[0.06] p-4 text-xs leading-5 text-slate-400">
        <ShieldCheck className="shrink-0 text-sky-300" size={18} />
        <span>
          Reward amounts, eligibility, approval and task completion are not
          configured yet. These totals are placeholders; this demo does not
          create or pay real earnings. The Flask backend must calculate and
          verify rewards using the client's approved rules.
        </span>
      </div>
    </>
  );
}

function RecordsPage({ transactions }) {
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesType = typeFilter === "All" || transaction.type === typeFilter;
    const matchesStatus =
      statusFilter === "All" || transaction.status === statusFilter;
    const searchableText = [
      transaction.id,
      transaction.type,
      transaction.method,
      transaction.reference,
      transaction.account,
      transaction.accountName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      matchesType &&
      matchesStatus &&
      searchableText.includes(search.toLowerCase().trim())
    );
  });

  const pendingCount = transactions.filter(
    (item) => item.status === "Pending",
  ).length;
  const successfulCount = transactions.filter(
    (item) => item.status === "Successful",
  ).length;
  const totalRequested = transactions.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );

  return (
    <>
      <PageHeading
        title="Transaction Records"
        subtitle="Track your recharge and withdrawal requests, including their current status."
        icon={History}
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b281e] p-4">
          <p className="text-xs text-slate-500">Total Requests</p>
          <p className="mt-2 text-2xl font-extrabold text-white">
            {transactions.length}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            This browser session
          </p>
        </div>
        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4">
          <p className="text-xs text-slate-500">Pending Requests</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-200">
            {pendingCount}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Awaiting backend review
          </p>
        </div>
        <div className="rounded-2xl border border-lime-300/15 bg-lime-300/[0.05] p-4">
          <p className="text-xs text-slate-500">Total Requested</p>
          <p className="mt-2 text-2xl font-extrabold text-lime-200">
            ৳ {money(totalRequested)}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Not a confirmed wallet balance
          </p>
        </div>
      </div>

      <Panel>
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold">Wallet Activity</h2>
              <p className="mt-1 text-xs text-slate-500">
                Recharge and withdrawal requests submitted in this browser
                session.
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search ID, method or reference"
                className="w-full rounded-xl border border-white/10 bg-[#081f18] py-3 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-lime-300/40"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/[0.07] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <span className="self-center pr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Type
              </span>
              {["All", "Recharge", "Withdraw"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTypeFilter(item)}
                  className={`rounded-lg px-3 py-2 text-[10px] font-semibold transition ${typeFilter === item ? "bg-lime-300 text-[#09251a]" : "bg-white/[0.05] text-slate-400 hover:text-white"}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="self-center pr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Status
              </span>
              {[
                "All",
                "Pending",
                "Approved (Demo)",
                "Successful",
                "Rejected",
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatusFilter(item)}
                  className={`rounded-lg px-3 py-2 text-[10px] font-semibold transition ${statusFilter === item ? "bg-white text-[#09251a]" : "bg-white/[0.05] text-slate-400 hover:text-white"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredTransactions.length ? (
          <>
            <div className="mb-3 flex items-center justify-between text-[10px] text-slate-500">
              <span>
                Showing {filteredTransactions.length} of {transactions.length}{" "}
                requests
              </span>
              <span>{successfulCount} successful overall</span>
            </div>
            <TransactionList transactions={filteredTransactions} />
          </>
        ) : (
          <EmptyState
            icon={FileText}
            title={
              transactions.length ? "No matching records" : "No records yet"
            }
            description={
              transactions.length
                ? "Try changing your search or filters."
                : "Your recharge and withdrawal requests will appear here after you submit them."
            }
          />
        )}

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-sky-300/15 bg-sky-300/[0.05] p-4 text-[10px] leading-5 text-slate-400">
          <Info size={16} className="mt-0.5 shrink-0 text-sky-300" />
          <p>
            Demo notice: records are kept only in React memory during this
            browser session. Requests are marked Pending and are not verified,
            approved, rejected, or paid. Persistent history and real status
            updates require the Flask backend and database.
          </p>
        </div>
      </Panel>
    </>
  );
}

function TransactionList({ transactions }) {
  return (
    <div className="divide-y divide-white/[0.07]">
      {transactions.map((transaction) => {
        const statusStyle =
          transaction.status === "Successful" ||
          transaction.status === "Approved (Demo)"
            ? "border-lime-300/20 bg-lime-300/10 text-lime-200"
            : transaction.status === "Rejected"
              ? "border-rose-300/20 bg-rose-300/10 text-rose-200"
              : "border-amber-300/20 bg-amber-300/10 text-amber-200";
        const account = transaction.account || "";
        const maskedAccount =
          account.length > 4 ? `•••• ${account.slice(-4)}` : account;

        return (
          <div
            key={transaction.id}
            className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start"
          >
            <div
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${transaction.type === "Recharge" ? "bg-lime-300/10 text-lime-300" : "bg-cyan-300/10 text-cyan-300"}`}
            >
              {transaction.type === "Recharge" ? (
                <ArrowDownLeft size={20} />
              ) : (
                <ArrowUpRight size={20} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-white">
                  {transaction.type} · {transaction.method}
                </p>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold ${statusStyle}`}
                >
                  {transaction.status}
                </span>
              </div>
              <p className="mt-1 break-all text-[10px] text-slate-500">
                Request ID: {transaction.id}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Submitted: {transaction.date}
              </p>
              {maskedAccount && (
                <p className="mt-2 text-[10px] text-slate-400">
                  Account: {maskedAccount}
                  {transaction.accountName
                    ? ` · ${transaction.accountName}`
                    : ""}
                </p>
              )}
              {transaction.reference && (
                <p className="mt-1 break-all text-[10px] text-slate-500">
                  Reference: {transaction.reference}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-3 sm:min-w-[130px] sm:flex-col sm:items-end sm:border-0 sm:pt-0">
              <span className="text-[10px] text-slate-500">Request amount</span>
              <p className="text-base font-extrabold text-white">
                ৳ {money(Number(transaction.amount || 0))}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#081f18]/60 px-5 py-12 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.05] text-slate-500">
        <Icon size={25} />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function AdminPage({ token, onNotice, onWalletRefresh }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function loadRequests(selectedFilter = filter) {
    setLoading(true);
    setError("");
    try {
      const data = await adminAPI.listWithdrawals(token, selectedFilter);
      const rows = (data.withdrawals || []).map((row) => ({
        id: row.public_id || row.transaction_id,
        type: "Withdraw",
        amount: Number(row.amount || 0),
        method: row.payment_method || "Unknown",
        account: row.sender_or_recipient || "",
        phone: row.phone || "",
        user_id: row.user_id,
        status: String(row.status || "pending").toLowerCase(),
        date: row.created_at ? new Date(row.created_at).toLocaleString() : "—",
        reviewedAt: row.reviewed_at
          ? new Date(row.reviewed_at).toLocaleString()
          : "—",
        reviewNote: row.review_note || "",
      }));
      setItems(rows);
    } catch (err) {
      setError(err.message || "Could not load withdrawal requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests(filter);
  }, [filter]);

  async function reviewRequest(item, action) {
    setBusyId(item.id);
    setError("");
    try {
      const result = await adminAPI.reviewWithdrawal(token, item.id, action);
      onNotice?.(result.message || `Withdrawal ${action}d successfully.`);
      await loadRequests(filter);
      if (action === "reject") await onWalletRefresh?.();
    } catch (err) {
      setError(err.message || "Unable to review this request.");
    } finally {
      setBusyId("");
    }
  }

  const visible = items.filter((item) =>
    [item.id, item.phone, item.method, item.account, item.status]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  const pending = items.filter((item) => item.status === "pending").length;
  const approved = items.filter((item) => item.status === "approved").length;
  const rejected = items.filter((item) => item.status === "rejected").length;

  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION · SECURE API"
        title="Admin Panel"
        subtitle="Withdrawal requests loaded from the Flask backend."
        icon={ShieldCheck}
      />
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-sky-300/20 bg-sky-300/[0.06] p-4 text-xs leading-5 text-sky-100">
        <Info size={18} className="mt-0.5 shrink-0" />
        <p>
          Admin actions are checked by Flask using your account role. Approval
          only changes the internal request status; it does not send a real
          bKash/Nagad payment.
        </p>
      </div>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4">
          <p className="text-xs text-slate-500">Pending Requests</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-200">
            {pending}
          </p>
        </div>
        <div className="rounded-2xl border border-lime-300/15 bg-lime-300/[0.05] p-4">
          <p className="text-xs text-slate-500">Approved</p>
          <p className="mt-2 text-2xl font-extrabold text-lime-200">
            {approved}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.05] p-4">
          <p className="text-xs text-slate-500">Rejected</p>
          <p className="mt-2 text-2xl font-extrabold text-rose-200">
            {rejected}
          </p>
        </div>
      </div>
      <Panel>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">Withdrawal Requests</h2>
            <p className="mt-1 text-xs text-slate-500">
              Requests are fetched from the database, not React demo state.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ID, phone, method"
              className="w-full rounded-xl border border-white/10 bg-[#081f18] px-3 py-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-lime-300/40"
            />
            <button
              type="button"
              onClick={() => loadRequests(filter)}
              className="rounded-xl border border-white/10 px-3 text-slate-300 hover:text-lime-300"
              title="Refresh"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { label: "Pending", value: "pending" },
            { label: "Approved", value: "approved" },
            { label: "Rejected", value: "rejected" },
            { label: "All", value: "all" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-lg px-3 py-2 text-[10px] font-semibold transition ${filter === option.value ? "bg-lime-300 text-[#09251a]" : "bg-white/[0.05] text-slate-400 hover:text-white"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-xs text-rose-200"
          >
            {error}
          </p>
        )}
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">
            Loading withdrawal requests...
          </div>
        ) : visible.length ? (
          <div className="divide-y divide-white/[0.07]">
            {visible.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 py-5 lg:flex-row lg:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      Withdrawal · {item.method}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold ${item.status === "pending" ? "border-amber-300/20 bg-amber-300/10 text-amber-200" : item.status === "rejected" ? "border-rose-300/20 bg-rose-300/10 text-rose-200" : "border-lime-300/20 bg-lime-300/10 text-lime-200"}`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 break-all text-[10px] text-slate-500">
                    Request ID: {item.id} · {item.date}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-400">
                    User: {item.phone || `#${item.user_id || "—"}`} · Recipient:{" "}
                    {item.account
                      ? `•••• ${item.account.slice(-4)}`
                      : "Not provided"}
                  </p>
                  {item.reviewNote && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      Review note: {item.reviewNote}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 lg:min-w-[210px] lg:flex-col lg:items-end">
                  <p className="text-base font-extrabold text-white">
                    ৳ {money(item.amount)}
                  </p>
                  {item.status === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!!busyId}
                        onClick={() => reviewRequest(item, "approve")}
                        className="rounded-lg border border-lime-300/20 bg-lime-300/10 px-3 py-2 text-[10px] font-bold text-lime-200 hover:bg-lime-300/20 disabled:opacity-50"
                      >
                        {busyId === item.id ? "Please wait..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={!!busyId}
                        onClick={() => reviewRequest(item, "reject")}
                        className="rounded-lg border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-[10px] font-bold text-rose-200 hover:bg-rose-300/20 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      Reviewed: {item.reviewedAt}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No withdrawal requests"
            description="There are no requests for this status filter."
          />
        )}
      </Panel>
    </>
  );
}

function ProfilePage({ navigate, setNotice }) {
  const [section, setSection] = useState("Overview");
  const [walletAccounts, setWalletAccounts] = useState([]);
  const [provider, setProvider] = useState("bKash");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountLabel, setAccountLabel] = useState("");
  const [accountError, setAccountError] = useState("");
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [language, setLanguage] = useState("English");
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [copied, setCopied] = useState(false);

  const sections = [
    {
      title: "Wallet Accounts",
      description: "Manage your linked payment methods",
      icon: CreditCard,
    },
    {
      title: "Transaction Records",
      description: "View your account activity",
      icon: History,
    },
    {
      title: "Security Settings",
      description: "Manage security preferences",
      icon: ShieldCheck,
    },
    {
      title: "Customer Support",
      description: "Get help with your account",
      icon: Headphones,
    },
    {
      title: "Language & Preferences",
      description: "Choose your app preferences",
      icon: Settings,
    },
    {
      title: "About AB PAY",
      description: "App information and policies",
      icon: CircleHelp,
    },
  ];

  const addWalletAccount = (event) => {
    event.preventDefault();
    if (!accountNumber.trim()) {
      setAccountError("Please enter your account number.");
      return;
    }
    if (!/^[0-9+\-\s]{8,20}$/.test(accountNumber.trim())) {
      setAccountError("Enter a valid mobile wallet number.");
      return;
    }
    setWalletAccounts((current) => [
      ...current,
      {
        id: `WAL-${Date.now()}`,
        provider,
        number: accountNumber.trim(),
        label: accountLabel.trim() || "Personal account",
      },
    ]);
    setAccountNumber("");
    setAccountLabel("");
    setAccountError("");
    setShowAccountForm(false);
    setNotice?.("Wallet account added to this demo session only.");
  };

  const removeWalletAccount = (id) => {
    setWalletAccounts((current) => current.filter((item) => item.id !== id));
    setNotice?.("Wallet account removed from this demo session.");
  };

  const copySupportEmail = async () => {
    const supportEmail = "support@abpay.example";
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      setNotice?.("Demo support email copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice?.(
        "Copy is unavailable in this browser. Support contact is not configured yet.",
      );
    }
  };

  const backToOverview = () => {
    setSection("Overview");
    setShowAccountForm(false);
    setAccountError("");
  };

  const SectionHeader = ({ title, subtitle }) => (
    <div className="mb-6 flex items-start gap-3">
      <button
        onClick={backToOverview}
        aria-label="Back to profile"
        className="mt-1 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:border-lime-300/30 hover:text-lime-300"
      >
        <ArrowLeft size={18} />
      </button>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <>
      <PageHeading
        title="My Profile"
        subtitle="Manage your account and personal settings."
        icon={UserRound}
      />

      <div className="mx-auto max-w-4xl">
        {section === "Overview" && (
          <>
            <Panel className="mb-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-lime-300 to-emerald-400 text-2xl font-black text-[#09251a] shadow-lg shadow-lime-950/20">
                  A
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-[0.2em] text-lime-300">
                    MY ACCOUNT
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    AB PAY User
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Member account · Demo profile
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-[10px] font-semibold text-amber-200">
                  <Info size={13} /> Verification not connected
                </span>
              </div>
              <div className="mt-6 grid gap-3 border-t border-white/[0.08] pt-5 sm:grid-cols-3">
                <div className="rounded-xl bg-[#081f18] p-4">
                  <p className="text-[10px] text-slate-500">WALLET BALANCE</p>
                  <p className="mt-2 text-lg font-bold">৳ 0.00</p>
                </div>
                <div className="rounded-xl bg-[#081f18] p-4">
                  <p className="text-[10px] text-slate-500">LINKED ACCOUNTS</p>
                  <p className="mt-2 text-lg font-bold">
                    {walletAccounts.length}
                  </p>
                </div>
                <div className="rounded-xl bg-[#081f18] p-4">
                  <p className="text-[10px] text-slate-500">ACCOUNT TYPE</p>
                  <p className="mt-2 text-lg font-bold">Standard</p>
                </div>
              </div>
            </Panel>

            <Panel>
              <div className="mb-4">
                <h3 className="font-bold">Account Settings</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Choose a section to manage your account.
                </p>
              </div>
              <div className="divide-y divide-white/[0.07]">
                {sections.map(({ title, description, icon: Icon }) => (
                  <button
                    key={title}
                    onClick={() => {
                      if (title === "Transaction Records") {
                        navigate?.("Records");
                      } else {
                        setSection(title);
                      }
                    }}
                    className="group flex w-full items-center gap-4 rounded-xl py-4 text-left transition hover:bg-white/[0.025]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-lime-300 transition group-hover:border-lime-300/20 group-hover:bg-lime-300/10">
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm text-slate-100">
                        {title}
                      </strong>
                      <small className="mt-1 block text-[11px] text-slate-500">
                        {description}
                      </small>
                    </span>
                    <ChevronRight
                      size={18}
                      className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-lime-300"
                    />
                  </button>
                ))}
              </div>
            </Panel>
          </>
        )}

        {section === "Wallet Accounts" && (
          <>
            <SectionHeader
              title="Wallet Accounts"
              subtitle="Manage the mobile wallet accounts linked to this demo profile."
            />
            <Panel>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">Your Payment Accounts</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Saved accounts are only kept in the current browser session.
                  </p>
                </div>
                <button
                  onClick={() => setShowAccountForm((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 text-xs font-bold text-[#09251a] transition hover:bg-lime-200"
                >
                  <Plus size={15} /> Add account
                </button>
              </div>

              {showAccountForm && (
                <form
                  onSubmit={addWalletAccount}
                  className="mb-5 space-y-4 rounded-2xl border border-lime-300/15 bg-[#081f18] p-4 sm:p-5"
                >
                  <h4 className="text-sm font-semibold">
                    Add a wallet account
                  </h4>
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-slate-300">
                      Payment provider
                    </span>
                    <select
                      value={provider}
                      onChange={(event) => setProvider(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0d2a20] px-4 py-3 text-sm text-white outline-none focus:border-lime-300/50"
                    >
                      {["bKash", "Nagad", "Rocket", "UPay"].map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-slate-300">
                      Account number
                    </span>
                    <input
                      value={accountNumber}
                      onChange={(event) => setAccountNumber(event.target.value)}
                      type="tel"
                      placeholder="Enter mobile wallet number"
                      className="w-full rounded-xl border border-white/10 bg-[#0d2a20] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-lime-300/50"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-slate-300">
                      Account label (optional)
                    </span>
                    <input
                      value={accountLabel}
                      onChange={(event) => setAccountLabel(event.target.value)}
                      placeholder="e.g. Personal bKash"
                      className="w-full rounded-xl border border-white/10 bg-[#0d2a20] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-lime-300/50"
                    />
                  </label>
                  {accountError && (
                    <p className="text-xs text-rose-300">{accountError}</p>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="submit"
                      className="rounded-xl bg-lime-300 px-5 py-3 text-xs font-bold text-[#09251a] hover:bg-lime-200"
                    >
                      Save account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountForm(false);
                        setAccountError("");
                      }}
                      className="rounded-xl border border-white/10 px-5 py-3 text-xs font-semibold text-slate-300 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[10px] leading-5 text-amber-200/80">
                    Demo only: this does not verify ownership or connect to
                    bKash, Nagad, Rocket or UPay. Never enter a wallet PIN or
                    password here.
                  </p>
                </form>
              )}

              {walletAccounts.length ? (
                <div className="space-y-3">
                  {walletAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] bg-[#081f18] p-4"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-300/10 text-lime-300">
                        <Wallet size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {account.provider}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {account.label} · {account.number}
                        </p>
                      </div>
                      <button
                        onClick={() => removeWalletAccount(account.id)}
                        className="rounded-lg border border-rose-300/15 px-3 py-2 text-[10px] font-semibold text-rose-300 hover:bg-rose-300/10"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CreditCard}
                  title="No wallet accounts linked"
                  description="Add a payment account to see it listed here. Account details remain local to this demo session."
                />
              )}
            </Panel>
          </>
        )}

        {section === "Security Settings" && (
          <>
            <SectionHeader
              title="Security Settings"
              subtitle="Review the security options available in this frontend demo."
            />
            <Panel>
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#081f18] p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-300/10 text-lime-300">
                    <LockKeyhole size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Password & login</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Password management requires secure backend
                      authentication.
                    </p>
                  </div>
                  <span className="text-[10px] text-amber-200">
                    Not connected
                  </span>
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-[#081f18] p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-300/10 text-sky-300">
                    <Smartphone size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm">
                      Biometric login preference
                    </strong>
                    <small className="mt-1 block text-[11px] text-slate-500">
                      Demo preference only; device authentication is not
                      enabled.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={biometric}
                    onChange={(event) => setBiometric(event.target.checked)}
                    className="h-4 w-4 accent-lime-300"
                  />
                </label>
                <div className="flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] p-4 text-xs leading-5 text-amber-100/80">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0" />
                  Do not use this demo page to store passwords, PINs, OTPs or
                  sensitive payment credentials. Real security controls must be
                  implemented and enforced by the backend.
                </div>
              </div>
            </Panel>
          </>
        )}

        {section === "Customer Support" && (
          <>
            <SectionHeader
              title="Customer Support"
              subtitle="Help information for the AB PAY demo interface."
            />
            <Panel>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-300/10 text-lime-300">
                  <Headphones size={22} />
                </span>
                <div>
                  <h3 className="font-bold">How can we help?</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Support contact details have not been supplied by the
                    project owner.
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#081f18] p-4">
                <p className="text-xs font-semibold">Support email</p>
                <p className="mt-1 text-xs text-slate-400">Not configured</p>
                <p className="mt-3 text-[10px] leading-5 text-slate-500">
                  A real support email, phone number or live chat link should be
                  added after the client provides official contact details.
                </p>
              </div>
              <button
                onClick={() =>
                  setNotice?.(
                    "Customer support contact is awaiting official details from the client.",
                  )
                }
                className="mt-4 w-full rounded-xl border border-lime-300/20 bg-lime-300/[0.07] px-4 py-3 text-xs font-semibold text-lime-300 hover:bg-lime-300/10"
              >
                Contact details status
              </button>
            </Panel>
          </>
        )}

        {section === "Language & Preferences" && (
          <>
            <SectionHeader
              title="Language & Preferences"
              subtitle="Adjust the local display preferences for this demo."
            />
            <Panel>
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-300">
                  Application language
                </span>
                <select
                  value={language}
                  onChange={(event) => {
                    setLanguage(event.target.value);
                    setNotice?.(
                      `Language preference set to ${event.target.value} for this demo session.`,
                    );
                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#081f18] px-4 py-3.5 text-sm text-white outline-none focus:border-lime-300/50"
                >
                  <option>English</option>
                  <option>বাংলা</option>
                </select>
              </label>
              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-[#081f18] p-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-300/10 text-violet-300">
                  <Bell size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm">
                    Activity notifications
                  </strong>
                  <small className="mt-1 block text-[11px] text-slate-500">
                    Local preference only; push notifications are not connected.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(event) => setNotifications(event.target.checked)}
                  className="h-4 w-4 accent-lime-300"
                />
              </label>
              <div className="mt-4 rounded-xl bg-[#081f18] p-4 text-xs text-slate-400">
                Current language:{" "}
                <strong className="text-lime-300">{language}</strong>
                <p className="mt-1 text-[10px] text-slate-500">
                  Changing this preference does not translate the interface yet.
                </p>
              </div>
            </Panel>
          </>
        )}

        {section === "About AB PAY" && (
          <>
            <SectionHeader
              title="About AB PAY"
              subtitle="Application information and policy links."
            />
            <Panel>
              <div className="flex items-center gap-3 border-b border-white/10 pb-5">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-lime-300 to-emerald-400 text-xl font-black text-[#09251a]">
                  A
                </span>
                <div>
                  <h3 className="text-lg font-extrabold">
                    AB <span className="text-lime-300">PAY</span>
                  </h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    User Portal · Frontend Demo
                  </p>
                </div>
              </div>
              <div className="divide-y divide-white/[0.07]">
                <div className="flex items-center justify-between py-4 text-xs">
                  <span className="text-slate-400">Application</span>
                  <strong>AB PAY</strong>
                </div>
                <div className="flex items-center justify-between py-4 text-xs">
                  <span className="text-slate-400">Version</span>
                  <strong>1.0.0 (Demo)</strong>
                </div>
                <div className="flex items-center justify-between py-4 text-xs">
                  <span className="text-slate-400">Payment integration</span>
                  <strong className="text-amber-200">Not connected</strong>
                </div>
                <div className="flex items-center justify-between py-4 text-xs">
                  <span className="text-slate-400">Backend services</span>
                  <strong className="text-amber-200">Pending</strong>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-sky-300/15 bg-sky-300/[0.06] p-4 text-[11px] leading-5 text-slate-400">
                Terms of service and privacy policy links should be added using
                the official documents supplied by the client. No policy text or
                external links have been invented.
              </div>
            </Panel>
          </>
        )}
      </div>
    </>
  );
}

export default App;
