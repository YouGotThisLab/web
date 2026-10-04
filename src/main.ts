import "./style.css";
import "./intro-mascot.css";
import { mountDisclaimer } from "./disclaimer";
import { connectScores } from "./sync";
import { geoMercator, geoPath } from "d3-geo";
import { merge } from "topojson-client";
import topologyData from "../public/assets/taiwan-counties.topo.json";
import { candidates } from "./data";
import {
  counties,
  offices,
  normalizeCounty,
  density,
  filterCandidates,
  loadCounts,
  rollHit,
  daysUntilElection,
  type Candidate,
} from "./model";

const app = document.querySelector<HTMLDivElement>("#app")!;
const storageKey = "youchuxi-counts-v1";
let counts: Record<string, number> = {};
try {
  counts = loadCounts(
    localStorage.getItem(storageKey),
    candidates.map((c) => c.id),
  );
} catch {}
let globalCounts: Record<string, number> = {};
let activeCounty: string | null = null;
let activeOffice = "all";
let query = "";
let selected: Candidate | null = null;
let sound = true;
const hitSoundPool = Array.from({ length: 8 }, () => {
  const clip = new Audio("/assets/hit-sound.wav");
  clip.preload = "auto";
  return clip;
});
let nextHitSound = 0;
let lastTrigger: HTMLElement | null = null;
const officeName = (id: string) => offices.find((o) => o.id === id)?.name ?? id;
const statusLabel = (status: Candidate["status"]) =>
  ({
    registered: "已登記參選",
    nominated: "政黨已提名",
    reported: "媒體報導參選",
  })[status];
const format = (value: number) => value.toLocaleString("zh-TW");
const total = () => Object.values(counts).reduce((a, b) => a + b, 0);
const safe = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const svgIcon = (name: "sound" | "search" | "star" | "close") =>
  ({
    sound:
      '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
  })[name];
const icon = (name: "sound" | "search" | "star" | "close") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${svgIcon(name)}</svg>`;
app.innerHTML = `
<header class="header"><a class="brand" href="/" aria-label="有出息首頁"><span class="brand-mark">有</span><span>有出息<small>YouChuXi</small></span></a><div class="event-label"><span class="event-dot"></span>2026 九合一迷因遊樂場</div><div class="header-actions"><button class="sound-button" id="sound" aria-pressed="true">${icon("sound")}<span>音效 ON</span></button><button class="text-button" id="about">玩法與資料</button></div></header>
<main class="shell"><section class="intro"><div><span class="eyebrow">TAIWAN, PRESS START.</span><h1>台灣，<span>很有出息。</span><span class="title-star">✳</span></h1><p>選個縣市，找到你的迷因人物。<strong>點一下，多一點出息。</strong></p></div><div class="intro-spokesperson"><img class="intro-portrait" src="/assets/intro-portrait-pixel.png" alt="王世堅原創像素諷刺插畫" width="1024" height="1024"/><div class="intro-slogan"><strong>「讓你的候選人有出息」</strong><span>by 王世堅沒有說過。</span><p>快來幫你支持的候選人衝高票數吧！！！</p></div></div><div class="election-stamp"><span>距離 11.28 地方選舉</span><strong>${daysUntilElection(new Date())}<small>天</small></strong><span>2026 / 11 / 28 · SAT</span></div></section>
<div class="workspace"><section class="map-panel" aria-labelledby="map-heading"><div class="panel-top"><div><span class="section-index">01 /</span><h2 id="map-heading">從你的縣市開始</h2></div><span class="live-label">${counties.filter((c) => candidates.some((p) => p.county === c)).length} 縣市已解鎖</span></div><div class="map-wrap"><div class="map-caption"><span class="tiny-label">你正在看</span><strong id="hover-county">台灣全圖</strong><span id="hover-count">有顏色的縣市可以點</span></div><svg id="taiwan-map" viewBox="0 0 560 650" aria-label="台灣 22 縣市互動地圖"></svg><div class="map-hint">✦ 好的，這次真的有出息</div><div class="islands"><span>離島也有出息</span><div id="island-buttons"></div></div></div><div class="legend"><span><i class="dense"></i>5+ 位</span><span><i class="medium"></i>2–4 位</span><span><i class="light"></i>1 位</span><span><i class="empty"></i>尚未收錄</span></div><div class="county-nav" id="county-nav" aria-label="縣市清單"></div></section>
<section class="people-panel" aria-labelledby="people-heading" hidden><div class="panel-top"><div><span class="section-index">02 /</span><h2 id="people-heading" tabindex="-1">誰最有出息？</h2></div><button class="text-button" id="back-to-map">← 返回台灣地圖</button></div><div id="stage" class="stage"></div><div class="people-tools"><div class="people-title"><h3 id="list-title">先選一個縣市</h3><span id="list-count">${candidates.length} 位人物已收錄</span></div><div class="filter-row"><label class="search">${icon("search")}<input id="search" type="search" placeholder="搜尋姓名或綽號" aria-label="搜尋姓名或綽號"/></label><label class="office-select"><select id="office" aria-label="選擇地方公職"><option value="all">全部公職</option>${offices.map((o) => `<option value="${o.id}">${o.name}</option>`).join("")}</select></label></div></div><div id="people-list" class="people-list"></div><div class="local-total"><span id="sync-status" role="status">全站數據連線中…</span> · <span>全站累計 <strong id="global-total">—</strong> 點</span></div><div class="local-total">${icon("star")}<span>你在這台裝置點出了 <strong id="total">${format(total())}</strong> 點出息</span></div></section></div>
<footer><span>有出息 YouChuXi <span class="footer-x">×</span> 台灣迷因，認真玩。</span><span>首批精選人物 · 資料查證 2026.10.04 · 本機計分＋全站即時同步</span></footer></main>
<dialog id="play-dialog" class="play-dialog"><button class="dialog-close" aria-label="關閉人物">${icon("close")}</button><div id="play-content"></div></dialog>
<dialog id="about-dialog" class="about-dialog"><button class="dialog-close" aria-label="關閉說明">${icon("close")}</button><span class="eyebrow">HOW TO YOUCHUXI</span><h2>一起點出有出息。</h2><p>點地圖選縣市，再點人物開啟遊戲。點人物大頭、按空白鍵或 Enter，就能累積你的出息值。每次點擊固定增加 1 點，快速連擊會出現更華麗的跳字特效，得分一樣是 +1。候選人點擊音效預設開啟，可按右上角切換音效 ON／OFF。</p><h3>人物與新聞</h3><p>只收錄九種地方公職的 2026 參選人物。這是首批精選名單，並非全體候選人名冊；灰色只代表本站尚未收錄。山地原住民區代表以選委會正式登記資料核對，已收錄和平區羅方妏。</p><p>參選登記、政黨提名與參選報導會分別標示；最後資格與完整名單以選委會公告為準。每張人物卡附資料來源。綽號分「公開稱呼」與「本站創作」，圖片和梗句為原創像素諷刺插畫，不是新聞現場照片或本人發言。</p><h3>九種地方公職</h3><p>${offices.map((o) => o.name).join("、")}。區民代表限直轄市山地原住民區，不含一般行政區長。</p><h3>你的出息值</h3><p>你的分數儲存在此瀏覽器；全站分數由伺服器獨立計分並即時同步至所有裝置。清除瀏覽器資料不會清除全站分數。離線可繼續玩，本頁保留最近 15 次待同步點擊，關閉頁面會丟失待同步點擊。這是遊戲數據，不是投票或民調。</p><a href="https://info.cec.gov.tw/" target="_blank" rel="noopener noreferrer">中央選舉委員會 · 2026 投票資訊 ↗</a><p class="small-note">地圖：g0v/twgeojson，CC0；2010 邊界合併至現行縣市，離島以獨立按鈕顯示。</p></dialog>`;

mountDisclaimer(app);

const mapSvg = document.querySelector<SVGSVGElement>("#taiwan-map")!;
const topology = topologyData as any;
const grouped = new Map<string, any[]>();
for (const geometry of topology.objects.layer1.geometries) {
  let name = normalizeCounty(geometry.properties.COUNTYNAME);
  if (!grouped.has(name)) grouped.set(name, []);
  grouped.get(name)!.push(geometry);
}
const geometries = counties
  .filter((c) => grouped.has(c))
  .map((name) => ({ name, geometry: merge(topology, grouped.get(name)!) }));
const mainland = geometries.filter(
  (g) => !["金門縣", "連江縣", "澎湖縣"].includes(g.name),
);
const projection = geoMercator().fitExtent(
  [
    [130, 24],
    [506, 615],
  ],
  {
    type: "FeatureCollection",
    features: mainland.map((g) => ({
      type: "Feature",
      properties: {},
      geometry: g.geometry,
    })),
  },
);
const path = geoPath(projection);
for (const { name, geometry } of mainland) {
  const count = candidates.filter((c) => c.county === name).length;
  const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
  node.setAttribute("d", path(geometry) ?? "");
  node.setAttribute("class", `county ${density(count)}`);
  node.dataset.county = name;
  node.setAttribute("role", "button");
  node.setAttribute("tabindex", "0");
  node.setAttribute("aria-label", `${name}，已收錄 ${count} 位人物`);
  node.setAttribute("aria-pressed", "false");
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = `${name} · ${count} 位`;
  node.append(title);
  node.addEventListener("pointerenter", () => showMapCaption(name, count));
  node.addEventListener("focus", () => showMapCaption(name, count));
  node.addEventListener("pointerleave", () => showCurrentCaption());
  node.addEventListener("click", () => chooseCounty(name));
  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      chooseCounty(name);
    }
  });
  mapSvg.append(node);
}
// Small urban areas also have labelled controls so they remain easy to reach.
const markers: [string, number, number, number, number][] = [
  ["臺北市", 121.56, 25.06, 25, -10],
  ["新北市", 121.46, 24.9, 60, 10],
  ["新竹市", 120.97, 24.8, -72, -5],
  ["嘉義市", 120.45, 23.48, -65, 5],
];
for (const [name, lon, lat, dx, dy] of markers) {
  const [x, y] = projection([lon, lat])!;
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("class", "map-marker");
  g.setAttribute("role", "button");
  g.setAttribute("tabindex", "0");
  g.setAttribute("aria-label", `選擇${name}`);
  g.innerHTML = `<line x1="${x}" y1="${y}" x2="${x + dx}" y2="${y + dy}"/><circle cx="${x}" cy="${y}" r="3"/><text x="${x + dx}" y="${y + dy - 7}" text-anchor="${dx < 0 ? "end" : "start"}">${name}</text>`;
  g.addEventListener("click", () => chooseCounty(name));
  g.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      chooseCounty(name);
    }
  });
  mapSvg.append(g);
}
function showMapCaption(name: string, count: number) {
  document.querySelector("#hover-county")!.textContent = name;
  document.querySelector("#hover-count")!.textContent = count
    ? `${count} 位人物等你點`
    : "本站尚未收錄人物";
}
function showCurrentCaption() {
  if (activeCounty)
    showMapCaption(
      activeCounty,
      candidates.filter((c) => c.county === activeCounty).length,
    );
  else {
    document.querySelector("#hover-county")!.textContent = "台灣全圖";
    document.querySelector("#hover-count")!.textContent = "有顏色的縣市可以點";
  }
}
for (const county of counties) {
  const button = document.createElement("button");
  const count = candidates.filter((c) => c.county === county).length;
  button.className = `county-chip ${count ? "available" : ""}`;
  button.dataset.county = county;
  button.setAttribute("aria-pressed", "false");
  button.textContent = `${county} ${count}`;
  button.addEventListener("click", () => chooseCounty(county));
  document.querySelector("#county-nav")!.append(button);
}
for (const county of ["澎湖縣", "金門縣", "連江縣"]) {
  const button = document.createElement("button");
  button.textContent = county;
  button.dataset.county = county;
  button.addEventListener("click", () => chooseCounty(county));
  document.querySelector("#island-buttons")!.append(button);
}
function chooseCounty(name: string) {
  activeCounty = name;
  activeOffice = "all";
  query = "";
  (document.querySelector("#office") as HTMLSelectElement).value = "all";
  (document.querySelector("#search") as HTMLInputElement).value = "";
  document.querySelectorAll("[data-county]").forEach((el) => {
    el.classList.toggle("selected", el.getAttribute("data-county") === name);
    el.setAttribute(
      "aria-pressed",
      String(el.getAttribute("data-county") === name),
    );
  });
  showCurrentCaption();
  renderStage();
  renderList();
  document.querySelector<HTMLElement>(".map-panel")!.hidden = true;
  document.querySelector<HTMLElement>(".people-panel")!.hidden = false;
  document.querySelector<HTMLElement>("#people-heading")!.focus();
}
document.querySelector("#back-to-map")!.addEventListener("click", () => {
  const previousCounty = activeCounty;
  activeCounty = null;
  document.querySelector<HTMLElement>(".people-panel")!.hidden = true;
  document.querySelector<HTMLElement>(".map-panel")!.hidden = false;
  document.querySelectorAll("[data-county]").forEach((el) => {
    el.classList.remove("selected");
    el.setAttribute("aria-pressed", "false");
  });
  showCurrentCaption();
  renderStage();
  renderList();
  document
    .querySelector<HTMLElement>(`.county-chip[data-county="${previousCounty}"]`)
    ?.focus();
});
function renderStage() {
  const stage = document.querySelector<HTMLDivElement>("#stage")!;
  if (!activeCounty) {
    stage.replaceChildren();
    return;
  }
  const people = filterCandidates(candidates, activeCounty);
  stage.className = `stage ${activeCounty ? "unlocked" : ""} ${people.length === 0 ? "no-people" : ""}`;
  stage.innerHTML = `<div class="stage-grid"></div><div class="stage-orbit"></div><div class="stage-label">${activeCounty ? safe(activeCounty) + " · 人物出場" : "選你的縣市，讓人物出場"}</div>${
    people.length
      ? `<div class="burst"></div><div class="stage-avatars">${people
          .slice(0, 5)
          .map(
            (c, i) =>
              `<button class="avatar avatar-${i}" data-person="${c.id}" style="--person-color:${c.color}" aria-label="開啟${c.name}迷因"><img src="${c.image}" alt="${c.name}原創像素插畫"/><span>${safe(c.nicknames[0].name)}</span></button>`,
          )
          .join(
            "",
          )}</div><span class="stage-spark spark-one">✦</span><span class="stage-spark spark-two">✳</span><div class="stage-bottom"><span>${activeCounty ? "角色解鎖！點大頭開始玩" : "22 個縣市，等你點亮"}</span><span>✚</span></div>`
      : `<div class="empty-stage"><span>？</span><h3>這裡還在等出息</h3><p>尚未收錄${safe(activeCounty!)}的人物。<br/>換個亮燈的縣市繼續玩。</p></div>`
  }`;
  bindPeople(stage);
}
function renderList() {
  if (!activeCounty) {
    document.querySelector("#people-list")!.replaceChildren();
    return;
  }
  const people = filterCandidates(
    candidates,
    activeCounty,
    activeOffice,
    query,
  );
  document.querySelector("#list-title")!.textContent = activeCounty
    ? `${activeCounty}人物名單`
    : "先逛逛人物名單";
  document.querySelector("#list-count")!.textContent =
    `${people.length} 位人物`;
  const list = document.querySelector<HTMLDivElement>("#people-list")!;
  list.innerHTML = people.length
    ? people
        .map(
          (c) =>
            `<button class="person-row" data-person="${c.id}"><span class="row-avatar" style="--person-color:${c.color}"><img src="${c.image}" alt=""/></span><span class="row-info"><strong>${c.name}<span class="nickname">${safe(c.nicknames[0].name)}</span></strong><span>${officeName(c.office)} · ${c.party}</span></span><span class="row-count"><strong data-count="${c.id}">${format(globalCounts[c.id] ?? 0)}</strong><span>全站出息值</span></span><span class="row-plus">＋</span></button>`,
        )
        .join("")
    : `<div class="empty-list"><strong>目前沒有符合的人物</strong><p>試試其他公職、關鍵字或亮燈縣市。</p><button class="text-button" id="reset-filter">重設篩選</button></div>`;
  bindPeople(list);
  document.querySelector("#reset-filter")?.addEventListener("click", () => {
    activeOffice = "all";
    query = "";
    (document.querySelector("#office") as HTMLSelectElement).value = "all";
    (document.querySelector("#search") as HTMLInputElement).value = "";
    renderList();
  });
}
function bindPeople(root: HTMLElement) {
  root.querySelectorAll<HTMLButtonElement>("[data-person]").forEach((button) =>
    button.addEventListener("click", () =>
      openPerson(
        candidates.find((c) => c.id === button.dataset.person)!,
        button,
      ),
    ),
  );
}
const playDialog = document.querySelector<HTMLDialogElement>("#play-dialog")!;
function openPerson(c: Candidate, trigger: HTMLElement) {
  if (!activeCounty || c.county !== activeCounty) return;
  selected = c;
  lastTrigger = trigger;
  document.querySelector("#play-content")!.innerHTML =
    `<div class="game-head"><span class="eyebrow">YOUCHUXI / ${safe(c.county)}</span><div class="game-title-row"><h2 id="person-name">${c.name}<span>${safe(c.nicknames[0].name)}</span></h2><div class="game-score"><span>你的出息值</span><strong id="person-score" class="${`${format(counts[c.id] ?? 0).length > 4 ? "long-score" : ""} ${format(counts[c.id] ?? 0).length > 9 ? "huge-score" : ""}`}">${format(counts[c.id] ?? 0)}</strong></div></div><p>${officeName(c.office)} · ${c.district} · ${c.party}</p><span class="candidate-status">${statusLabel(c.status)}</span></div><div class="game-arena" style="--person-color:${c.color}"><span class="game-hint">點人物！空白鍵也可以</span><button class="pop-button" id="pop" aria-label="點擊${c.name}，累積出息值"><img src="${c.image}" alt="${c.name}像素諷刺插畫"/></button><span class="meme-quote">${safe(c.meme)}</span><span class="satire-label">原創梗句 · 非本人發言</span></div><div class="combo-strip"><span class="combo-icon" aria-hidden="true">✦</span><span id="combo" role="status" aria-live="polite">每次 +1 · 連擊特效加倍華麗</span></div><div class="fact-panel"><div class="fact-heading"><h3>這個梗從哪裡來？</h3><span>查證 ${c.updated}</span></div><h4>${safe(c.news.title)}<small class="news-date">${c.news.date}</small></h4><p>${safe(c.news.summary)}</p><div class="nickname-list">${c.nicknames.map((n) => `<span>${safe(n.name)} <small>${n.kind === "public" ? "公開稱呼" : "本站創作"}</small>${n.source ? ` <a href="${n.source}" target="_blank" rel="noopener noreferrer" aria-label="${safe(n.name)}稱呼來源">↗</a>` : ""}</span>`).join("")}</div><div class="source-links"><a href="${c.news.url}" target="_blank" rel="noopener noreferrer">新聞／公開事件來源 ↗</a><a href="${c.candidacySource}" target="_blank" rel="noopener noreferrer">${c.status === "registered" ? "參選登記來源" : c.status === "nominated" ? "政黨提名資料" : "參選報導來源"} ↗</a><button id="download-meme" class="text-button">下載這張梗圖 ↓</button></div><p class="storage-note" id="storage-note">個人分數保留本機，全站分數由後台獨立計分、即時同步。不是投票或民調。圖片為 AI 像素諷刺插畫。</p></div>`;
  document.querySelector("#pop")!.addEventListener("click", pop);
  document
    .querySelector("#download-meme")!
    .addEventListener("click", () => downloadMeme(c));
  playDialog.showModal();
  (document.querySelector("#pop") as HTMLButtonElement).focus();
}
let combo = 0;
let comboTime = 0;
let comboTimer: ReturnType<typeof setTimeout>;
function pop() {
  if (!selected) return;
  const id = selected.id;
  const previous = counts[id] ?? 0;
  if (previous >= Number.MAX_SAFE_INTEGER) return;
  const now = performance.now();
  combo = now - comboTime < 650 ? combo + 1 : 1;
  comboTime = now;
  const hit = rollHit(combo);
  const gained = Math.min(hit.points, Number.MAX_SAFE_INTEGER - previous);
  counts[id] = previous + gained;
  recordHit(id);
  try {
    localStorage.setItem(storageKey, JSON.stringify(counts));
  } catch {
    document.querySelector("#storage-note")!.textContent =
      "瀏覽器未允許儲存；本次計數僅在頁面開啟期間保留。";
  }
  const score = document.querySelector<HTMLElement>("#person-score")!;
  score.textContent = format(counts[id]);
  score.classList.toggle("long-score", score.textContent.length > 4);
  score.classList.toggle("huge-score", score.textContent.length > 9);
  score.classList.toggle("critical-score", hit.critical);
  document
    .querySelectorAll(`[data-count="${id}"]`)
    .forEach((el) => (el.textContent = format(globalCounts[id] ?? 0)));
  document.querySelector("#total")!.textContent = format(total());
  document.querySelector("#combo")!.textContent =
    `${hit.critical ? "連擊爆發！" : combo > 1 ? `${combo} 連擊！` : "命中！"} ＋${format(gained)} 出息`;
  clearTimeout(comboTimer);
  comboTimer = setTimeout(() => {
    document
      .querySelector("#combo")
      ?.replaceChildren(document.createTextNode("每次 +1 · 連擊特效加倍華麗"));
    score.classList.remove("critical-score");
  }, 1200);
  const button = document.querySelector<HTMLButtonElement>("#pop")!;
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    button.animate(
      [
        { transform: "scale(.9) rotate(-5deg)" },
        { transform: "scale(1.08) rotate(4deg)" },
        { transform: "scale(1) rotate(0deg)" },
      ],
      { duration: 180 },
    );
    score.getAnimations().forEach((animation) => animation.cancel());
    score.animate(
      [
        { transform: "translateY(0) rotate(-4deg) scale(1)" },
        {
          transform: `translateY(-12px) rotate(5deg) scale(${hit.critical ? 1.32 : 1.22})`,
          offset: 0.3,
        },
        { transform: "translateY(3px) rotate(-7deg) scale(.96)", offset: 0.7 },
        { transform: "translateY(0) rotate(-4deg) scale(1)" },
      ],
      {
        duration: hit.critical ? 520 : 420,
        easing: "cubic-bezier(.2,.8,.25,1)",
      },
    );
  }
  const particle = document.createElement("span");
  particle.className = `pop-particle hit-${combo % 3}${hit.critical ? " critical-hit" : ""}`;
  particle.setAttribute("aria-hidden", "true");
  if (hit.critical) {
    const label = document.createElement("small");
    label.textContent = "COMBO!";
    particle.append(label);
  }
  const digits = document.createElement("strong");
  digits.textContent = `+${format(gained)}`;
  particle.append(digits);
  particle.style.left = `${38 + ((combo - 1) % 3) * 10 + Math.random() * 4}%`;
  particle.style.top = `${18 + ((combo - 1) % 3) * 5 + Math.random() * 3}%`;
  particle.style.setProperty("--hit-drift", `${(Math.random() - 0.5) * 60}px`);
  particle.style.setProperty("--hit-tilt", `${(Math.random() - 0.5) * 12}deg`);
  document.querySelector(".game-arena")!.append(particle);
  setTimeout(() => particle.remove(), 950);
  if (sound) playSound();
}
function playSound() {
  const clip = hitSoundPool[nextHitSound];
  nextHitSound = (nextHitSound + 1) % hitSoundPool.length;
  clip.currentTime = 0;
  void clip.play().catch(() => {});
}
function updateSound() {
  const button = document.querySelector<HTMLButtonElement>("#sound")!;
  button.setAttribute("aria-pressed", String(sound));
  button.querySelector("span")!.textContent = `音效 ${sound ? "ON" : "OFF"}`;
}
function closeDialog(dialog: HTMLDialogElement) {
  dialog.close();
  if (dialog === playDialog) {
    selected = null;
    combo = 0;
    comboTime = 0;
    lastTrigger?.focus();
  }
}
document.querySelectorAll<HTMLDialogElement>("dialog").forEach((dialog) => {
  dialog
    .querySelector(".dialog-close")!
    .addEventListener("click", () => closeDialog(dialog));
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        closeDialog(dialog);
    }
  });
  dialog.addEventListener("close", () => {
    if (dialog === playDialog) {
      selected = null;
      combo = 0;
      comboTime = 0;
    }
  });
});
document.addEventListener("keydown", (e) => {
  if (
    playDialog.open &&
    selected &&
    (e.code === "Space" || e.key === "Enter") &&
    !["INPUT", "SELECT", "TEXTAREA", "A", "BUTTON"].includes(
      (e.target as HTMLElement).tagName,
    )
  ) {
    e.preventDefault();
    if (!e.repeat) pop();
  }
});
document.querySelector("#search")!.addEventListener("input", (e) => {
  query = (e.target as HTMLInputElement).value;
  renderList();
});
document.querySelector("#office")!.addEventListener("change", (e) => {
  activeOffice = (e.target as HTMLSelectElement).value;
  renderList();
});
document.querySelector("#sound")!.addEventListener("click", () => {
  sound = !sound;
  updateSound();
  if (!sound) {
    hitSoundPool.forEach((clip) => clip.pause());
  }
});
document
  .querySelector("#about")!
  .addEventListener("click", () =>
    document.querySelector<HTMLDialogElement>("#about-dialog")!.showModal(),
  );
window.addEventListener("storage", (e) => {
  if (e.key === storageKey) {
    counts = loadCounts(
      e.newValue,
      candidates.map((c) => c.id),
    );
    renderList();
    document.querySelector("#total")!.textContent = format(total());
    if (selected) {
      const score = document.querySelector<HTMLElement>("#person-score")!;
      score.textContent = format(counts[selected.id] ?? 0);
      score.classList.toggle("long-score", score.textContent.length > 4);
      score.classList.toggle("huge-score", score.textContent.length > 9);
    }
  }
});
async function downloadMeme(c: Candidate) {
  const img = new Image();
  img.src = c.image;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#22133e";
  ctx.fillRect(0, 0, 1080, 1080);
  ctx.fillStyle = c.color;
  ctx.beginPath();
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const radius = i % 2 ? 340 : 485;
    const x = 540 + Math.cos(angle) * radius,
      y = 480 + Math.sin(angle) * radius;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.drawImage(img, 210, 130, 660, 660);
  ctx.fillStyle = "#dfff72";
  ctx.font = "900 66px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${c.name} · ${c.nicknames[0].name}`, 540, 90);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 40px sans-serif";
  const lines: string[] = [];
  let line = "";
  for (const char of c.meme) {
    if (ctx.measureText(line + char).width > 970) {
      lines.push(line);
      line = char;
    } else line += char;
  }
  lines.push(line);
  lines.forEach((text, i) => ctx.fillText(text, 540, 855 + i * 54));
  ctx.font = "24px sans-serif";
  ctx.fillStyle = "#cbc0e2";
  ctx.fillText("原創像素諷刺插畫・本站梗句・非本人發言", 540, 1000);
  ctx.fillText("有出息 YouChuXi / 2026 九合一", 540, 1040);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `YouChuXi-${c.name}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}
renderStage();
renderList();

const recordHit = connectScores(
  candidates.map((c) => c.id),
  (values) => {
    globalCounts = values;
    document
      .querySelectorAll<HTMLElement>("[data-count]")
      .forEach((element) => {
        element.textContent = format(globalCounts[element.dataset.count!] ?? 0);
      });
    document.querySelector("#global-total")!.textContent = format(
      Object.values(values).reduce((sum, value) => sum + value, 0),
    );
  },
  (status) => {
    document.querySelector("#sync-status")!.textContent = status;
  },
);
