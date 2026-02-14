import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { load, CheerioAPI } from "cheerio";

interface StatementEntry {
  itemName: string;
  usageDate: string;
  amount: number;
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath) {
  console.error("Usage: npx ts-node src/index.ts <path-to-html> [output-csv]");
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), inputPath);
const html = readFileSync(resolvedPath, "utf8");
const $ = load(html);

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function parseAmount(text: string): number {
  const ascii = text.normalize("NFKC");
  const cleaned = ascii.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractPaymentDate(dom: CheerioAPI): string | null {
  const dt = dom("dt").filter((_, el) =>
    normalizeText(dom(el).text()).includes("支払い日"),
  );
  if (!dt.length) return null;
  const dd = dom(dt[0]).next("dd");
  const text = normalizeText(dd.text());
  return text || null;
}

function extractPaymentMethod(dom: CheerioAPI): string | null {
  const dt = dom("dt").filter((_, el) =>
    normalizeText(dom(el).text()).includes("利用カード"),
  );
  if (!dt.length) return null;
  const dd = dom(dt[0]).next("dd");
  const text = normalizeText(dd.text());
  if (text) return text;
  const brand = dd.find("svg").attr("id");
  return brand ? brand : null;
}

function extractEntries(dom: CheerioAPI): StatementEntry[] {
  const entries: StatementEntry[] = [];
  dom("li").each((_, el) => {
    const classAttr = dom(el).attr("class") || "";
    if (!classAttr.includes("_ListSettlement__list_")) return;

    const itemName = normalizeText(
      dom(el).find('[class*="__labelMain"]').first().text(),
    );

    const usageDate = normalizeText(
      dom(el).find('[class*="__date"]').first().text(),
    );

    const amountText = normalizeText(
      dom(el).find('[class*="__summaryText"]').first().text(),
    );

    const amount = parseAmount(amountText);

    if (!itemName && !amount) return;

    entries.push({ itemName, usageDate, amount });
  });

  return entries;
}

function toCsvValue(value: string | number): string {
  const text = typeof value === "number" ? String(value) : value;
  if (/[",\n]/.test(text) || /\s/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const paymentDate = extractPaymentDate($) ?? "";
const paymentMethod = extractPaymentMethod($) ?? "";
const entries = extractEntries($);
const total = entries.reduce((sum, entry) => sum + entry.amount, 0);

const header = [
  "item_name",
  "usage_date",
  "payment_date",
  "amount",
  "payment_method",
];

const csvLines: string[] = [];
csvLines.push(header.join(","));

entries.forEach((entry) => {
  const row = {
    item_name: entry.itemName,
    usage_date: entry.usageDate,
    payment_date: paymentDate,
    amount: entry.amount,
    payment_method: paymentMethod,
  } as const;

  const line = header
    .map((key) => toCsvValue((row as Record<string, string | number>)[key]))
    .join(",");
  csvLines.push(line);
});

const totalRow = {
  item_name: "TOTAL",
  usage_date: "",
  payment_date: paymentDate,
  amount: total,
  payment_method: paymentMethod,
} as const;

const totalLine = header
  .map((key) => toCsvValue((totalRow as Record<string, string | number>)[key]))
  .join(",");

csvLines.push(totalLine);

const csvContent = csvLines.join("\n");

if (outputPath) {
  const resolvedOutputPath = path.resolve(process.cwd(), outputPath);
  writeFileSync(resolvedOutputPath, csvContent, "utf8");
  console.log(`✅ CSV output to: ${resolvedOutputPath}`);
} else {
  console.log(csvContent);
}
