import * as https from "node:https"

export type DjgaboIpv4JsonResponse = {
  status: number
  ok: boolean
  payload?: unknown
  text: string
  redirects: number
}

type DjgaboIpv4JsonOptions = {
  timeoutMs?: number
  maxRedirects?: number
  headers?: Record<string, string>
}

function timeoutError(): Error {
  const error = new Error("DJGABO IPv4 HTTPS request timed out")
  error.name = "TimeoutError"
  return error
}

export function getDjgaboJsonIpv4(
  input: URL | string,
  options: DjgaboIpv4JsonOptions = {}
): Promise<DjgaboIpv4JsonResponse> {
  const timeoutMs = options.timeoutMs ?? 15000
  const maxRedirects = options.maxRedirects ?? 5
  const deadline = Date.now() + timeoutMs

  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) {
    return Promise.reject(new Error("DJGABO IPv4 HTTPS timeout must be positive"))
  }
  if (!Number.isSafeInteger(maxRedirects) || maxRedirects < 0 || maxRedirects > 10) {
    return Promise.reject(new Error("DJGABO IPv4 HTTPS maxRedirects is invalid"))
  }

  const request = (
    currentInput: URL | string,
    redirects: number
  ): Promise<DjgaboIpv4JsonResponse> => {
    const current = new URL(currentInput)
    if (current.protocol !== "https:") {
      return Promise.reject(new Error("DJGABO IPv4 client only allows HTTPS"))
    }

    const remaining = deadline - Date.now()
    if (remaining <= 0) {
      return Promise.reject(timeoutError())
    }

    return new Promise((resolve, reject) => {
      let settled = false
      const finishReject = (error: Error) => {
        if (settled) return
        settled = true
        reject(error)
      }

      const req = https.get(
        current,
        {
          family: 4,
          headers: options.headers,
        },
        (res) => {
          const status = Number(res.statusCode || 0)
          const location = res.headers.location

          if (status >= 300 && status < 400 && location) {
            res.resume()
            if (redirects >= maxRedirects) {
              finishReject(new Error("DJGABO IPv4 HTTPS too many redirects"))
              return
            }

            const nextUrl = new URL(location, current).toString()
            request(nextUrl, redirects + 1).then(
              (value) => {
                if (settled) return
                settled = true
                resolve(value)
              },
              finishReject
            )
            return
          }

          const chunks: Buffer[] = []
          res.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
          res.on("error", (error) => finishReject(error))
          res.on("end", () => {
            if (settled) return
            const text = Buffer.concat(chunks).toString("utf8")
            let payload: unknown = undefined
            if (text) {
              try {
                payload = JSON.parse(text)
              } catch {
                // Preserve HTTP status first. Callers only require JSON on 2xx.
              }
            }
            settled = true
            resolve({
              status,
              ok: status >= 200 && status < 300,
              payload,
              text,
              redirects,
            })
          })
        }
      )

      req.setTimeout(remaining, () => {
        req.destroy(timeoutError())
      })
      req.on("error", (error) => finishReject(error))
    })
  }

  return request(input, 0)
}
