import dns from "dns";
import http from "http";
import https from "https";
import net from "net";
import { URL } from "url";

const MAX_HTML_BYTES = 2 * 1024 * 1024;

// Event links are external pages; refuse addresses inside the server's network
// (loopback, private ranges, link-local/cloud metadata).
function isPrivateAddress(address) {
  if (net.isIPv6(address)) {
    const a = address.toLowerCase();
    if (a.startsWith("::ffff:")) return isPrivateAddress(a.slice(7));
    return a === "::1" || a === "::" || a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80");
  }
  const [a, b] = address.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127);
}

// DNS lookup used by the request itself, so the checked address is the one connected to.
function publicOnlyLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: false }, (err, address, family) => {
    if (err) return callback(err);
    if (isPrivateAddress(address)) return callback(new Error("Endereço não permitido"));
    callback(null, address, family);
  });
}

async function extractImageFromUrl(pageUrl) {
  try {
    const urlObj = new URL(pageUrl);
    if (!["http:", "https:"].includes(urlObj.protocol)) return null;
    if (net.isIP(urlObj.hostname.replace(/^\[|\]$/g, "")) && isPrivateAddress(urlObj.hostname.replace(/^\[|\]$/g, ""))) return null;
    const client = urlObj.protocol === "https:" ? https : http;

    const html = await new Promise((resolve, reject) => {
      const req = client.get(pageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 5000,
        lookup: publicOnlyLookup,
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
          if (data.length > MAX_HTML_BYTES) req.destroy(new Error("Response too large"));
        });
        res.on("end", () => resolve(data));
        res.on("error", reject);
      });
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });
    });

    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImageMatch) {
      let imageUrl = ogImageMatch[1];
      if (!imageUrl.startsWith("http")) {
        imageUrl = new URL(imageUrl, pageUrl).href;
      }
      return imageUrl;
    }

    const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
                              html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
    if (twitterImageMatch) {
      let imageUrl = twitterImageMatch[1];
      if (!imageUrl.startsWith("http")) {
        imageUrl = new URL(imageUrl, pageUrl).href;
      }
      return imageUrl;
    }

    return null;
  } catch (error) {
    console.error("Error extracting image from URL:", error.message);
    return null;
  }
}

export default extractImageFromUrl;
