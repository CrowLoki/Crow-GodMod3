/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const ALLOWED_IMAGE_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "rgb",
  "rgba",
] as const;
type AllowedImageFormat = (typeof ALLOWED_IMAGE_FORMATS)[number];

function isAllowedImageFormat(format: string): format is AllowedImageFormat {
  return (ALLOWED_IMAGE_FORMATS as readonly string[]).includes(format);
}

function serializeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (
        url.pathname === "/" &&
        (request.method === "GET" || request.method === "HEAD")
      ) {
        const entryUrl = new URL(request.url);
        entryUrl.pathname = "/crow-godmod3.html";
        if (!env.ASSETS) {
          return fetch(new Request(entryUrl, request));
        }
        return env.ASSETS.fetch(new Request(entryUrl, request));
      }

      if (url.pathname === "/_vinext/image") {
        if (!env.ASSETS || !env.IMAGES) {
          return new Response("Image optimization bindings unavailable", { status: 503 });
        }
        const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
        return handleImageOptimization(request, {
          fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            if (!isAllowedImageFormat(format)) {
              throw new Error(`Unsupported image format: ${format}`);
            }
            const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
            return result.response();
          },
        }, allowedWidths);
      }

      return handler.fetch(request, env, ctx);
    } catch (error) {
      const message = serializeError(error);
      console.error(JSON.stringify({ message: "unhandled worker error", error: message, path: new URL(request.url).pathname }));
      return new Response("Internal server error", { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;