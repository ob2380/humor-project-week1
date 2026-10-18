"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMyPost } from "@/app/community/actions";

export default function WithdrawButton({ postId }: { postId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await deleteMyPost(postId);
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
        className="chunky-btn"
      >
        {pending ? "..." : "Delete"}
      </button>
      {error && <span className="text-xs font-bold">{error}</span>}
    </span>
  );
}
