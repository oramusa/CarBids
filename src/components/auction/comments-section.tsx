"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  username?: string;
};

export function CommentsSection({
  listingId,
  initialComments,
  isSignedIn,
}: {
  listingId: string;
  initialComments: Comment[];
  isSignedIn: boolean;
}) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`comments-${listingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `listing_id=eq.${listingId}`,
        },
        async (payload) => {
          // Realtime INSERT payloads only carry the raw row — no joined
          // profile — so the poster's username has to be fetched
          // separately, or every live-appended comment falls back to the
          // generic "user" label.
          const newComment = payload.new as Comment;
          const { data: author } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", newComment.user_id)
            .single();
          setComments((prev) => [
            ...prev,
            { ...newComment, username: author?.username },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("comments")
        .insert({ listing_id: listingId, user_id: user.id, body });
      setBody("");
    }
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium">Questions & comments</h3>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No comments yet. Be the first to ask the seller a question.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="text-sm">
              <span className="font-medium">
                {comment.username ?? "user"}:
              </span>{" "}
              {comment.body}
            </li>
          ))}
        </ul>
      )}

      {isSignedIn ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ask a question…"
          />
          <Button type="submit" disabled={submitting}>
            Post
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          <a href="/login" className="underline">
            Sign in
          </a>{" "}
          to comment.
        </p>
      )}
    </div>
  );
}
