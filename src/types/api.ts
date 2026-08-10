export type Role = 'USER' | 'SUPERADMIN'
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED'
export type ViewStatus = 'PUBLISHED' | 'UNPUBLISHED'
export type SideType = 'SIDE' | 'COUNTERPART'
export type SourceType = 'LINK' | 'YOUTUBE' | 'DOCUMENT'
export type ReactionType = 'LIKE' | 'DISLIKE'

export interface ApiUser {
  id: string
  email: string
  name: string
  role: Role
  status: UserStatus
  createdAt: string
}

export interface RegisterResponse {
  user: ApiUser
  activationToken: string
}

export interface LoginResponse {
  token: string
  user: ApiUser
}

export interface Category {
  id: string
  name: string
  deletedAt: string | null
}

export interface Hashtag {
  id: string
  name: string
  createdAt: string
}

/** Hashtags embedded in a view have no createdAt (API inconsistency). */
export interface ViewHashtag {
  id: string
  name: string
}

export interface Source {
  id: string
  viewSideId: string
  type: SourceType
  url: string
  label: string | null
  createdAt: string
}

export interface ViewSide {
  id: string
  politicalViewId: string
  type: SideType
  title: string
  description: string
  sources: Source[]
  likeCount: number
  dislikeCount: number
  /** null when anonymous or when the user has not reacted to this side. */
  myReaction: ReactionType | null
}

/** Full view shape returned by GET/POST/PUT /api/views and /api/admin/views. */
export interface PoliticalView {
  id: string
  categoryId: string
  authorId: string
  status: ViewStatus
  createdAt: string
  updatedAt: string
  category: Category
  author: { id: string; name: string }
  /** Exactly 2 entries but in no guaranteed order — always filter by `type`. */
  sides: ViewSide[]
  hashtags: ViewHashtag[]
  _count: { threads: number }
  totalLikes: number
  totalDislikes: number
  isFavorite: boolean
}

export interface PaginatedViews {
  total: number
  page: number
  limit: number
  views: PoliticalView[]
}

export interface ViewsQuery {
  category?: string
  hashtag?: string
  sort?: 'likes' | 'dislikes' | 'recent'
  page?: number
  limit?: number
  autorId?: string
  autor?: 'me'
}

export interface CreateViewSideInput {
  title: string
  description: string
  sources: { type: SourceType; url: string; label?: string }[]
}

export interface CreateViewInput {
  categoryId: string
  side: CreateViewSideInput
  counterpart: CreateViewSideInput
  hashtags?: string[]
}

/** PATCH publish/unpublish return the bare Prisma record without includes. */
export interface BareView {
  id: string
  categoryId: string
  authorId: string
  status: ViewStatus
  createdAt: string
  updatedAt: string
}

export interface ReactionResponse {
  likeCount: number
  dislikeCount: number
  myReaction: ReactionType | null
}

export interface CommentUser {
  id: string
  name: string
}

export interface Comment {
  id: string
  threadId: string
  userId: string
  parentId: string | null
  content: string
  createdAt: string
  user: CommentUser
  replies?: Comment[]
}

export interface CommentThread {
  id: string
  politicalViewId: string
  title: string | null
  createdAt: string
  comments: Comment[]
}

export interface UploadResponse {
  /** Relative URL (`/uploads/...`): prefix with the API base URL to use it. */
  url: string
  originalName: string
  size: number
}

/** GET /api/search returns views in a reduced shape: sides carry only
 * type/title, and there are no sources, counts, nor hashtags (verified live). */
export interface SearchViewResult {
  id: string
  categoryId: string
  authorId: string
  status: ViewStatus
  createdAt: string
  updatedAt: string
  category: Category
  author: { id: string; name: string }
  sides: { type: SideType; title: string }[]
}

export interface SearchResponse {
  views: SearchViewResult[]
  categories: Category[]
  hashtags: Hashtag[]
  authors: { id: string; name: string }[]
}

export interface Author {
  id: string
  name: string
  createdAt: string
  publishedViewsCount: number
}

export interface PaginatedUsers {
  total: number
  page: number
  limit: number
  users: ApiUser[]
}

export interface ValidationDetails {
  formErrors: string[]
  fieldErrors: Partial<Record<'body' | 'query' | 'params', string[]>>
}
