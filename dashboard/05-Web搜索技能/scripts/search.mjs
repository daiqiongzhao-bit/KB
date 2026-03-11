#!/usr/bin/env node

/**
 * DuckDuckGo HTML 搜索 — 免费，无需 API Key
 * 通过解析 DuckDuckGo HTML Lite 页面获取搜索结果
 */

function usage() {
  console.error('Usage: search.mjs "query" [-n 10] [--region wt-wt]');
  console.error("  -n <count>     Number of results (default: 10)");
  console.error("  --region <r>   Region code: cn-zh, us-en, wt-wt (default)");
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "-h" || args[0] === "--help") usage();

const query = args[0];
let maxResults = 10;
let region = "wt-wt";

for (let i = 1; i < args.length; i++) {
  if (args[i] === "-n") {
    maxResults = parseInt(args[++i] || "10", 10);
  } else if (args[i] === "--region") {
    region = args[++i] || "wt-wt";
  }
}

async function searchDDG(query, maxResults, region) {
  const tokenUrl = "https://duckduckgo.com/";
  const tokenResp = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    body: `q=${encodeURIComponent(query)}`,
  });
  const tokenHtml = await tokenResp.text();

  const vqdMatch = tokenHtml.match(/vqd=["']([^"']+)["']/);
  if (!vqdMatch) {
    const vqdAlt = tokenHtml.match(/vqd=([\d-]+)/);
    if (!vqdAlt) {
      throw new Error("Failed to get DuckDuckGo search token");
    }
    var vqd = vqdAlt[1];
  } else {
    var vqd = vqdMatch[1];
  }

  const searchUrl =
    `https://links.duckduckgo.com/d.js?` +
    `q=${encodeURIComponent(query)}` +
    `&kl=${region}` +
    `&vqd=${vqd}` +
    `&o=json&dl=en&ct=US&sp=0&bpa=1&biaexp=b&msvrtexp=b`;

  const searchResp = await fetch(searchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Referer: "https://duckduckgo.com/",
    },
  });

  const text = await searchResp.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return fallbackHTMLSearch(query, maxResults);
  }

  const results = (data.results || [])
    .filter((r) => r.u && r.t && !r.u.startsWith("https://duckduckgo.com"))
    .slice(0, maxResults)
    .map((r) => ({
      title: r.t.replace(/<\/?b>/g, ""),
      url: r.u,
      snippet: (r.a || "").replace(/<\/?b>/g, ""),
    }));

  return results;
}

async function fallbackHTMLSearch(query, maxResults) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });
  const html = await resp.text();

  const results = [];
  const linkRegex =
    /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRegex =
    /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

  const links = [...html.matchAll(linkRegex)];
  const snippets = [...html.matchAll(snippetRegex)];

  for (let i = 0; i < Math.min(links.length, maxResults); i++) {
    let rawUrl = links[i][1];
    try {
      const urlObj = new URL(rawUrl, "https://duckduckgo.com");
      const uddg = urlObj.searchParams.get("uddg");
      if (uddg) rawUrl = decodeURIComponent(uddg);
    } catch {}

    results.push({
      title: links[i][2].replace(/<[^>]+>/g, "").trim(),
      url: rawUrl,
      snippet: (snippets[i]?.[1] || "").replace(/<[^>]+>/g, "").trim(),
    });
  }
  return results;
}

try {
  const results = await searchDDG(query, maxResults, region);

  if (results.length === 0) {
    console.log("未找到搜索结果。请尝试不同的关键词。");
    process.exit(0);
  }

  console.log(`## 搜索结果：「${query}」\n`);
  console.log(`共 ${results.length} 条结果\n`);

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    console.log(`### ${i + 1}. ${r.title}`);
    console.log(`   URL: ${r.url}`);
    if (r.snippet) {
      console.log(`   ${r.snippet}`);
    }
    console.log();
  }
} catch (err) {
  console.error(`搜索失败: ${err.message}`);
  process.exit(1);
}
