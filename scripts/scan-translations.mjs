import fs from "node:fs";

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const arabicRegex = /[\u0600-\u06FF]/;
  const matches = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    // Skip comments
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) return;
    
    if (arabicRegex.test(trimmed)) {
      // Check if it's NOT translated using t() or conditional on lang
      if (!trimmed.includes("t(") && !trimmed.includes("lang ===") && !trimmed.includes("lang == 'ar'") && !trimmed.includes('lang === "ar"')) {
        matches.push({ line: index + 1, text: trimmed });
      }
    }
  });

  return matches;
}

console.log("Scanning home.tsx...");
const homeMatches = scanFile("src/components/ledger/home.tsx");
console.log(`Found ${homeMatches.length} potential hardcoded Arabic lines in home.tsx`);
homeMatches.slice(0, 40).forEach(m => console.log(`${m.line}: ${m.text}`));

console.log("\nScanning vault-auth.tsx...");
const authMatches = scanFile("src/components/ledger/vault-auth.tsx");
console.log(`Found ${authMatches.length} potential hardcoded Arabic lines in vault-auth.tsx`);
authMatches.slice(0, 40).forEach(m => console.log(`${m.line}: ${m.text}`));
