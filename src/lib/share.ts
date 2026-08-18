export async function shareUrl(_: string, url: string): Promise<'copied' | 'failed'> {
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
