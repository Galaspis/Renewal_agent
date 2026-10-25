import { redirect } from "next/navigation";

// The insurance overview folded into the renewals list on 2026-10-25. Old links still work.
export default function InsurancePage() {
  redirect("/items?category=insurance");
}
