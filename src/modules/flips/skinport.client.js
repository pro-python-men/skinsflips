import https from "node:https";
import zlib from "node:zlib";

function getJsonWithBrotli(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "br",
          "User-Agent": "Mozilla/5.0"
        }
      },
      (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => {
          try {
            let buf = Buffer.concat(chunks);
            const enc = String(res.headers["content-encoding"] || "");
            if (enc.includes("br")) {
              buf = zlib.brotliDecompressSync(buf);
            }

            const text = buf.toString("utf8");
            if (res.statusCode < 200 || res.statusCode >= 300) {
              return reject(new Error(`Skinport HTTP ${res.statusCode}: ${text.slice(0, 200)}`));
            }

            resolve(JSON.parse(text));
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on("error", reject);
  });
}

export async function fetchSkinportItems({ appId = 730, currency = "USD", tradable = 1 } = {}) {
  const url = `https://api.skinport.com/v1/items?app_id=${appId}&currency=${encodeURIComponent(
    currency
  )}&tradable=${tradable ? 1 : 0}`;

  return await getJsonWithBrotli(url);
}
