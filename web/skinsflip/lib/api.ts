export async function apiFetch(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, {
      credentials: "include",
      ...options,
    })

    // 🔐 brak autoryzacji
    if (res.status === 401) {
      console.log("Not authenticated")
      return null
    }

    // ❗ inne błędy (500, 400 itd.)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || `Request failed: ${res.status}`)
    }

    // 📦 JSON response
    try {
      return await res.json()
    } catch {
      return null
    }

  } catch (err) {
    console.error("apiFetch error:", err)
    return null
  }
}