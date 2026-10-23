import { IconShield } from "@/components/Icons";
import { LoginForm } from "@/components/LoginForm";
import { cardClass } from "@/components/styles";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className={`${cardClass} w-full max-w-sm p-6`}>
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-white">
            <IconShield className="size-5" />
          </span>
          <span className="text-base font-semibold tracking-tight">מנויים</span>
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">כניסה</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          ביטוחים, רישיונות, מנויים וכל דבר שפג תוקף. לוח אחד, סיסמה אחת.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
