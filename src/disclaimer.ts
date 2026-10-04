import "./disclaimer.css";

let confirmed = false;
export const isDisclaimerConfirmed = () => confirmed;

export function mountDisclaimer(app: HTMLElement) {
  const dialog = document.createElement("dialog");
  dialog.id = "disclaimer-dialog";
  dialog.className = "disclaimer-dialog";
  dialog.setAttribute("aria-labelledby", "disclaimer-title");
  dialog.setAttribute("aria-describedby", "disclaimer-summary");
  dialog.innerHTML = `
    <span class="disclaimer-label">有出息 YouChuXi</span>
    <h2 id="disclaimer-title" tabindex="-1">免責聲明</h2>
    <p id="disclaimer-summary" class="disclaimer-summary">純屬娛樂，本平台無任何政治立場，本平台的票數不能作為任何投票數據參考</p>
    <ul>
      <li>本平台為迷因與互動遊戲，未支持、反對或背書任何政黨、候選人或政治主張。</li>
      <li>票數、出息值與排名僅為遊戲點擊紀錄，可重複累積，並非一人一票，也不具代表性。不得用作投票結果、民意調查、支持率或選情預測，亦不得據此宣稱候選人領先或落後。</li>
      <li>人物插畫、綽號、台詞與官方示意圖屬娛樂或諷刺創作，不代表本人發言、授權或認可；示意圖不代表實際排名。</li>
      <li>收錄名單並非完整候選人名冊。候選資格、選舉資訊及正式結果，請以中央選舉委員會等主管機關公告為準。</li>
      <li>請理性使用並尊重不同立場；分享內容時，請保留娛樂性質與非投票、非民調的說明，避免誤導他人。</li>
    </ul>
    <button id="disclaimer-confirm" type="button">確認，我已閱讀並了解</button>`;
  app.inert = true;
  document.body.append(dialog);
  dialog.addEventListener("cancel", (event) => event.preventDefault());
  dialog.addEventListener("close", () => {
    if (!confirmed) dialog.showModal();
  });
  dialog
    .querySelector<HTMLButtonElement>("#disclaimer-confirm")!
    .addEventListener("click", () => {
      confirmed = true;
      app.inert = false;
      dialog.close();
      app.querySelector<HTMLElement>(".brand")?.focus();
    });
  dialog.showModal();
  dialog.querySelector<HTMLElement>("#disclaimer-title")!.focus();
}
