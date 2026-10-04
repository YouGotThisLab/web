export const offices = [
  { id: "metro-mayor", name: "直轄市長" },
  { id: "metro-council", name: "直轄市議員" },
  { id: "county-mayor", name: "縣市長" },
  { id: "county-council", name: "縣市議員" },
  { id: "town-mayor", name: "鄉鎮市長" },
  { id: "town-rep", name: "鄉鎮市民代表" },
  { id: "indigenous-mayor", name: "直轄市山地原住民區長" },
  { id: "indigenous-rep", name: "直轄市山地原住民區民代表" },
  { id: "village", name: "村里長" },
] as const;
export type Office = (typeof offices)[number]["id"];
export type Candidate = {
  id: string;
  name: string;
  county: string;
  district: string;
  office: Office;
  party: string;
  nicknames: { name: string; kind: "public" | "creative"; source?: string }[];
  status: "registered" | "nominated" | "reported";
  candidacySource: string;
  news: { title: string; summary: string; url: string; date: string };
  meme: string;
  color: string;
  image: string;
  updated: string;
};
export const counties = [
  "臺北市",
  "新北市",
  "桃園市",
  "臺中市",
  "臺南市",
  "高雄市",
  "基隆市",
  "新竹市",
  "嘉義市",
  "宜蘭縣",
  "新竹縣",
  "苗栗縣",
  "彰化縣",
  "南投縣",
  "雲林縣",
  "嘉義縣",
  "屏東縣",
  "花蓮縣",
  "臺東縣",
  "澎湖縣",
  "金門縣",
  "連江縣",
];
export const normalizeCounty = (name: string) => {
  const canonical = name.replaceAll("台", "臺");
  return (
    (
      {
        臺北縣: "新北市",
        桃園縣: "桃園市",
        臺中縣: "臺中市",
        臺南縣: "臺南市",
        高雄縣: "高雄市",
      } as Record<string, string>
    )[canonical] ?? canonical
  );
};
export function density(count: number) {
  return count >= 5
    ? "dense"
    : count >= 2
      ? "medium"
      : count === 1
        ? "light"
        : "empty";
}
export function filterCandidates(
  items: Candidate[],
  county: string | null,
  office: string = "all",
  query = "",
) {
  const needle = query.trim().toLowerCase();
  return items.filter(
    (c) =>
      (!county || c.county === county) &&
      (office === "all" || c.office === office) &&
      (!needle ||
        [
          c.name,
          c.county,
          c.district,
          c.party,
          ...c.nicknames.map((n) => n.name),
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle)),
  );
}
export function loadCounts(
  raw: string | null,
  validIds: string[],
): Record<string, number> {
  try {
    const data = JSON.parse(raw ?? "{}");
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return Object.fromEntries(
      validIds
        .filter((id) => Number.isSafeInteger(data[id]) && data[id] >= 0)
        .map((id) => [id, data[id]]),
    );
  } catch {
    return {};
  }
}
export function rollHit(combo: number) {
  const critical = combo >= 5 && combo % 5 === 0;
  return { points: 1, critical };
}
export function daysUntilElection(now: Date) {
  const today = new Date(
    now.toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" }) +
      "T00:00:00+08:00",
  );
  return Math.max(
    0,
    Math.ceil(
      (new Date("2026-11-28T00:00:00+08:00").getTime() - today.getTime()) /
        86400000,
    ),
  );
}
