"use client";

import { useState, type FormEvent } from "react";

import { addFriendByCode } from "@/lib/friends/data";
import type { FriendProfile } from "@/lib/friends/mapping";

import { Button } from "../ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Input } from "../ui/Input";

export function AddFriendByCodeForm({
  onAdded,
}: {
  onAdded: (profile: FriendProfile) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setError(null);

    const result = await addFriendByCode(code);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setCode("");
    onAdded(result.data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>أضف صديقاً بالرمز</CardTitle>
        <CardDescription>
          أدخل رمز الصديق المكوّن من 8 أحرف أو أرقام لإرسال طلب صداقة.
        </CardDescription>
      </CardHeader>

      <form
        className="space-y-3"
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
      >
        <Input
          label="أدخل رمز الصديق"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="ABCD2345"
          dir="ltr"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={8}
          className="text-center font-mono text-lg tracking-[0.35em] uppercase"
          error={error}
          disabled={submitting}
        />

        <Button
          type="submit"
          loading={submitting}
          disabled={code.trim().length === 0}
        >
          أضف صديقاً
        </Button>
      </form>
    </Card>
  );
}
