import type { Metadata } from "next";

import { AccountClient } from "@/components/account/AccountClient";
import { DevRoleSwitch } from "@/components/dev/DevRoleSwitch";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "حسابي",
};

export default function AccountPage() {
  return (
    <main className="space-y-6">
      <PageHeader
        title="حسابي"
        description="عدّل اسمك المعروض وصورتك الشخصية، وغيّر كلمة المرور."
      />

      <DevRoleSwitch />

      <AccountClient />
    </main>
  );
}
