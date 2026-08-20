import { http } from '@/lib/http'
import type { Comment, CommentThread } from '@/types/api'

export function listThreads(viewId: string): Promise<{ threads: CommentThread[] }> {
  return http.get<{ threads: CommentThread[] }>(
    `/api/views/${encodeURIComponent(viewId)}/threads`,
  )
}

/** Creates the thread together with its first comment. */
export function createThread(
  viewId: string,
  input: { title?: string; content: string },
): Promise<{ thread: CommentThread }> {
  return http.post<{ thread: CommentThread }>(`/api/views/${encodeURIComponent(viewId)}/threads`, {
    body: input,
  })
}

export function createComment(
  viewId: string,
  threadId: string,
  input: { content: string; parentId?: string },
): Promise<{ comment: Comment }> {
  return http.post<{ comment: Comment }>(
    `/api/views/${encodeURIComponent(viewId)}/threads/${encodeURIComponent(threadId)}/comments`,
    { body: input },
  )
}
