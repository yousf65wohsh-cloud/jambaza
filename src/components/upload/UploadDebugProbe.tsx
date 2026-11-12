"use client";

// TEMP-DEBUG: temporary upload diagnostics. Remove this whole file together
// with NEXT_PUBLIC_UPLOAD_DEBUG and every TEMP-DEBUG comment.

import { useState } from "react";

import {
  describeError,
  isUploadDebugEnabled,
} from "@/lib/debug/uploadDebug";
import { createClient } from "@/lib/supabase/client";
import type { UploadDebugErrorInfo } from "@/types/api";

import { Button } from "../ui/Button";

interface ProbeResult {
  label: string;
  ok: boolean;
  error?: UploadDebugErrorInfo;
}

const TRACKS_CHECK = 'from("tracks").select("id").limit(1)';
const AUDIO_CHECK = 'storage.from("audio").list(userId, { limit: 1 })';
const COVERS_CHECK = 'storage.from("covers").list(userId, { limit: 1 })';

function DebugError({ error }: { error: UploadDebugErrorInfo }) {
  return (
    <pre
      dir="ltr"
      className="border-border bg-background/60 mt-1 overflow-x-auto rounded-lg border p-2 text-left font-mono text-[11px] break-words whitespace-pre-wrap"
    >
      {JSON.stringify(error, null, 2)}
    </pre>
  );
}

export function UploadDebugProbe() {
  // TEMP-DEBUG: nothing renders unless the flag is enabled.
  if (!isUploadDebugEnabled()) {
    return null;
  }

  return <DebugProbePanel />;
}

function DebugProbePanel() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [fatal, setFatal] = useState<UploadDebugErrorInfo | null>(null);

  async function runProbe() {
    if (running) return;

    setRunning(true);
    setResults([]);
    setFatal(null);

    const collected: ProbeResult[] = [];
    const publish = (result: ProbeResult) => {
      collected.push(result);
      setResults([...collected]);
    };

    try {
      const supabase = createClient();
      let userId: string | null = null;

      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        userId = data.user?.id ?? null;
        if (!userId) {
          throw new Error("No signed-in user.");
        }

        publish({ label: "supabase.auth.getUser()", ok: true });
      } catch (error) {
        publish({
          label: "supabase.auth.getUser()",
          ok: false,
          error: describeError(error),
        });
      }

      if (!userId) {
        for (const label of [TRACKS_CHECK, AUDIO_CHECK, COVERS_CHECK]) {
          publish({
            label,
            ok: false,
            error: { message: "Skipped: no signed-in user." },
          });
        }
        return;
      }

      try {
        const { error } = await supabase.from("tracks").select("id").limit(1);
        if (error) throw error;
        publish({ label: TRACKS_CHECK, ok: true });
      } catch (error) {
        publish({ label: TRACKS_CHECK, ok: false, error: describeError(error) });
      }

      try {
        const { error } = await supabase.storage.from("audio").list(userId, { limit: 1 });
        if (error) throw error;
        publish({ label: AUDIO_CHECK, ok: true });
      } catch (error) {
        publish({ label: AUDIO_CHECK, ok: false, error: describeError(error) });
      }

      try {
        const { error } = await supabase.storage
          .from("covers")
          .list(userId, { limit: 1 });
        if (error) throw error;
        publish({ label: COVERS_CHECK, ok: true });
      } catch (error) {
        publish({ label: COVERS_CHECK, ok: false, error: describeError(error) });
      }
    } catch (error) {
      setFatal(describeError(error));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section
      aria-label="فحص اتصال الرفع"
      className="border-border bg-surface/60 space-y-3 rounded-2xl border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">فحص الاتصال</h2>
          <p className="text-muted text-xs">أداة مؤقتة للمطور فقط. لا تكتب أي بيانات.</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={running}
          onClick={() => void runProbe()}
        >
          فحص الاتصال
        </Button>
      </div>

      {results.length > 0 ? (
        <ul className="space-y-2">
          {results.map((result) => (
            <li
              key={result.label}
              className="border-border bg-background/40 rounded-xl border p-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span dir="ltr" className="font-mono text-[11px] break-all">
                  {result.label}
                </span>
                <span
                  className={
                    result.ok
                      ? "text-success text-xs font-bold"
                      : "text-danger text-xs font-bold"
                  }
                >
                  {result.ok ? "نجح" : "فشل"}
                </span>
              </div>
              {result.error ? <DebugError error={result.error} /> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {fatal ? (
        <div>
          <p className="text-danger text-xs font-bold">فشل الفحص</p>
          <DebugError error={fatal} />
        </div>
      ) : null}
    </section>
  );
}
