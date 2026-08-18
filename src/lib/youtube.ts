export function youtubeVideoId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^www\./, '')
  const isValidId = (id: string | null | undefined): id is string =>
    typeof id === 'string' && /^[\w-]{11}$/.test(id)

  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1)
    return isValidId(id) ? id : null
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const v = parsed.searchParams.get('v')
    if (isValidId(v)) return v
    const match = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)
    if (match) return match[1] ?? null
  }
  return null
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`
}
