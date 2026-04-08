export async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
  })

  if (res.status === 401) {
    return null
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Request failed: ${res.status}`)
  }

  const contentType = res.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    return null
  }

  return await res.json()
}

export async function getBestFlips() {
  const res = await fetch("/api/flips/best", {
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error("Failed to fetch flips")
  }

  return res.json()
}
