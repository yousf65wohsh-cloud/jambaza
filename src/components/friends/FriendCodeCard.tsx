"use client";

import { useEffect, useState } from "react";

import { getMyFriendCode, regenerateMyFriendCode } from "@/lib/friends/data";

import { Button } from "../ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Spinner } from "../ui/Spinner";

export function FriendCodeCard() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const result = await getMyFriendCode();

      if (!active) return;

      if (result.ok) {
        setCode(result.data);
      } else {
        setError(result.error.message);
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function handleRegenerate() {
    if (regenerating) return;

    setRegenerating(true);
    setError(null);

    const result = await regenerateMyFriendCode();

    setRegenerating(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setCode(result.data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>رمز الصديق</CardTitle>
        <CardDescription>
          شارك هذا الرمز مع أصدقائك ليضيفوك. إعادة التوليد تُبطل الرمز القديم فوراً.
        </CardDescription>
      </CardHeader>

      {loading ? (
        <p className="text-muted flex items-center gap-2 text-sm">
          <Spinner />
          جارٍ تحميل الرمز…
        </p>
      ) : null}

      {!loading && code ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <code
            dir="ltr"
            className="bg-surface-2 border-border rounded-xl border px-4 py-2 font-mono text-lg font-bold tracking-[0.35em]"
          >
            {code}
          </code>
          <Button
            variant="secondary"
            size="sm"
            loading={regenerating}
            onClick={() => void handleRegenerate()}
          >
            إعادة توليد الرمز
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-danger mt-3 text-sm">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
