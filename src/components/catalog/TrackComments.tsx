import { EmptyState } from "@/components/ui/EmptyState";
import { StarIcon } from "@/components/ui/icons";
import { formatFeedbackDate } from "@/lib/catalog/format";
import type { TrackComment } from "@/types/track";

/** Comment list with its empty and error states. */
export function TrackComments({
  comments,
  error,
  emptyDescription = "شارك رأيك في الأغنية لتظهر تعليقاتك هنا.",
}: {
  comments: TrackComment[];
  error?: string | null;
  emptyDescription?: string;
}) {
  if (error) {
    return (
      <p
        role="alert"
        className="bg-danger/10 border-danger/30 text-danger rounded-xl border px-4 py-3 text-sm"
      >
        {error}
      </p>
    );
  }

  if (comments.length === 0) {
    return (
      <EmptyState
        icon={<StarIcon className="size-6" />}
        title="لا توجد تعليقات بعد"
        description={emptyDescription}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {comments.map((comment) => (
        <li
          key={comment.id}
          className="card hover:border-accent/30 space-y-2 p-4 transition-colors"
        >
          <p dir="auto" className="text-sm leading-7 whitespace-pre-line">
            {comment.body}
          </p>
          <time dateTime={comment.createdAt} className="text-muted block text-xs">
            {formatFeedbackDate(comment.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
