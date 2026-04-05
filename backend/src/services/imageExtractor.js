import http from "http";
import https from "https";
import { URL } from "url";

async function extractImageFromUrl(pageUrl) {
  try {
    const urlObj = new URL(pageUrl);
    const client = urlObj.protocol === "https:" ? https : http;

    const html = await new Promise((resolve, reject) => {
      const req = client.get(pageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 5000,
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
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
