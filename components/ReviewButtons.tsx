"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approvePost, rejectPost } from "@/app/community/actions";

export default function ReviewButtons({ postId }: { postId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: typeof approvePost) {
    setError(null);
    start(async () => {
      const res = await fn(postId);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button type="button" disabled={pending} onClick={() => run(approvePost)} className="chunky-btn bg-[#7ED6A4]">
        Approve
      </button>
      <button type="button" disabled={pending} onClick={() => run(rejectPost)} className="chunky-btn is-down">
        Reject
      </button>
      {error && <span className="text-sm font-bold">{error}</span>}
    </div>
  );
}
