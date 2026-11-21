(() => {
  "use strict";

  function normalize(value) {
    return String(value ?? "").normalize("NFKC").toLowerCase()
      .replace(/^\s*m\s*[/.]\s*s\b\.?\s*|^\s*ms\s+/i, "")
      .replace(/\b(shree|sri|shri)\b/g, "shri")
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
  }

  function nameForms(value) {
    const name = normalize(value);
    return [...new Set([name, name.replace(/\b(?:[a-z] ){1,}[a-z]\b/g, initials => initials.replaceAll(" ", ""))])]
      .map(form => form ? form.split(" ") : []);
  }

  function matchScore(names, queries) {
    let score = Infinity;
    for (const name of names) {
      for (const query of queries) {
        for (let start = 0; start <= name.length - query.length; start++) {
          if (!query.every((word, offset) => {
            const candidate = name[start + offset];
            return candidate === word || (offset === query.length - 1 && candidate.startsWith(word));
          })) continue;
          const last = query.length - 1;
          const partial = name[start + last] !== query[last];
          score = Math.min(score, start + (name.length - query.length) + (partial ? 1 : 0));
        }
      }
    }
    return score;
  }

  const index = (rows, label = row => row.label) => rows.map(row => ({ row, names: nameForms(label(row)) }));
  function search(indexed, query, limit = Infinity) {
    if (!normalize(query)) return indexed.slice(0, limit).map(entry => entry.row);
    const queries = nameForms(query);
    return indexed.map(entry => ({ row: entry.row, score: matchScore(entry.names, queries) }))
      .filter(entry => Number.isFinite(entry.score))
      .sort((a, b) => a.score - b.score)
      .slice(0, limit).map(entry => entry.row);
  }

  const matches = (label, query) => !normalize(query) || Number.isFinite(matchScore(nameForms(label), nameForms(query)));
  const rank = (rows, query, label = row => row.name || row.company_name || "") => search(index(rows, label), query);
  const variants = value => [...new Set([String(value), normalize(value), String(value).replace(/\bshri\b/ig, "shree")])];
  const partyFields = new Set([
    "salebuyer", "salesupplier", "ledgerBuyer", "ledgerSupplier", "paymentBuyer", "paymentSupplier", "obuyer", "osupplier"
  ]);

  window.MMAPartySearch630 = { normalize, matches, rank, variants };
  window.MMAPartySearch660 = { index, search, transactionField: id => partyFields.has(id) };
})();
