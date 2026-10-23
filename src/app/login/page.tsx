import { LoginForm } from "@/components/LoginForm";
import { cardClass } from "@/components/styles";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className={`${cardClass} w-full max-w-sm p-6`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.svg" alt="כָּרבוֹל" className="h-12 w-auto" />
        <h1 className="mt-5 text-xl font-bold tracking-tight">כניסה</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          ביטוחים, רישיונות, מנויים וכל דבר שצריך לחדש. לוח אחד למשפחה, התרנגול מזכיר בזמן.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
