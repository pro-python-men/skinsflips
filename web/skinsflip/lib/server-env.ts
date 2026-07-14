const DEFAULT_API_BASE_URL = "http://localhost:4000/api"

export function getServerApiBaseUrl() {
  const privateBaseUrl = process.env.API_BASE_URL?.trim()
  if (privateBaseUrl) return privateBaseUrl

  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing required server env var: API_BASE_URL")
  }

  return DEFAULT_API_BASE_URL
}
