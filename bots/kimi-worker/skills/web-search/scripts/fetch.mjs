#!/usr/bin/env node

/**
 * 网页内容抓取 — 将网页 HTML 转换为可读文本
 * 支持提取正文、标题、链接等关键信息
 */

function usage() {
  console.error('Usage: fetch.mjs "URL" [--raw] [--max 5000]');
  console.error("  --raw          Output raw HTML instead of extracted text");
  console.error("  --max <chars>  Maximum output characters (default: 5000)");
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "-h" || args[0] === "--help") usage();

const url = args[0];
let raw = false;
let maxChars = 5000;

for (let i = 1; i < args.length; i++) {
  if (args[i] === "--raw") raw = true;
  else if (args[i] === "--max") maxChars = parseInt(args[++i] || "5000", 10);
}

function htmlToText(html) {
  let text = html;

  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, "");
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, "");
  text = text.replace(/<header[\s\S]*?<\/header>/gi, "");
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, "").trim()
    : "";

  const metaDescMatch = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i,
  );
  const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : "";

  text = text.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, content) => {
    const prefix = "#".repeat(parseInt(level));
    return `\n${prefix} ${content.replace(/<[^>]+>/g, "").trim()}\n`;
  });

  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => {
    return `\n${content.replace(/<[^>]+>/g, "").trim()}\n`;
  });

  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => {
    return `- ${content.replace(/<[^>]+>/g, "").trim()}\n`;
  });

  text = text.replace(
    /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, content) => {
      const linkText = content.replace(/<[^>]+>/g, "").trim();
      if (!linkText || href.startsWith("#") || href.startsWith("javascript:"))
        return linkText;
      return `[${linkText}](${href})`;
    },
  );

  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");

  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");

  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]+/g, " ");
  text = text
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

  let result = "";
  if (title) result += `# ${title}\n\n`;
  if (metaDesc) result += `> ${metaDesc}\n\n`;
  result += text.trim();

  return result;
}

try {
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    console.error(`HTTP ${resp.status}: ${resp.statusText}`);
    process.exit(1);
  }

  const contentType = resp.headers.get("content-type") || "";
  if (
    !contentType.includes("text/html") &&
    !contentType.includes("text/plain") &&
    !contentType.includes("application/json")
  ) {
    console.error(`不支持的内容类型: ${contentType}`);
    process.exit(1);
  }

  const html = await resp.text();

  if (raw) {
    console.log(html.slice(0, maxChars));
  } else if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(html);
      console.log(JSON.stringify(json, null, 2).slice(0, maxChars));
    } catch {
      console.log(html.slice(0, maxChars));
    }
  } else {
    const text = htmlToText(html);
    console.log(text.slice(0, maxChars));
    if (text.length > maxChars) {
      console.log(`\n...(内容已截断，共 ${text.length} 字符，显示前 ${maxChars} 字符)`);
    }
  }

  console.log(`\n---\nURL: ${url}`);
} catch (err) {
  if (err.name === "TimeoutError") {
    console.error("请求超时（15秒）");
  } else {
    console.error(`抓取失败: ${err.message}`);
  }
  process.exit(1);
}
