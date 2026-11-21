const base = process.argv[2] ?? "http://127.0.0.1:8000"

const check = async (path: string): Promise<string> => {
  const response = await fetch(`${base}${path}`)
  if (!response.ok) throw new Error(`${path} → HTTP ${response.status}`)
  const body: unknown = await response.json()
  const size = Array.isArray(body) ? `${body.length} éléments` : "ok"
  return `${path} : ${size}`
}

const paths = [
  "/health",
  "/api/household",
  "/api/recipes",
  "/api/stock",
  "/api/suggestions",
  "/api/shopping/context",
]

for (const path of paths) {
  console.log(await check(path))
}
