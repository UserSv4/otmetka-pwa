(async () => {
  const [model, overview, datesModule] = await Promise.all([
    import("./src/model.js"), import("./src/overview.js"), import("./src/dates.js")
  ]);
  const dates = datesModule.getDateWindow(datesModule.toDateKey(), 7);
  const savedBefore = localStorage.getItem("attendance-pwa.state.v1");
  const actualState = JSON.parse(savedBefore);
  const images = [];
  const check = (ok, message) => { if (!ok) throw Error(message); };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const dataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const expectedHeaders = dates.slice(1, 6).map((key) => datesModule.formatOverviewDateHeader(key).date);

  async function render(state, name, saveImage = false) {
    const texts = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    let files;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      texts.push(String(text));
      return original.call(this, text, ...args);
    };
    try {
      files = await overview.generateOverviewFiles(state, dates);
    } finally {
      CanvasRenderingContext2D.prototype.fillText = original;
    }
    if (saveImage && files[0]) images.push({ name, dataUrl: await dataUrl(files[0]) });
    return { texts, headers: texts.filter((text) => /^\d{2}\.\d{2}$/.test(text)), files: files.map((file) => file.name) };
  }

  const sample = model.createEmptyState(1);
  const [anna, boris, removed] = model.addPeople(sample, ["Тест Анна", "Тест Борис", "Тест Удалённый"], dates[0], 2);
  sample.attendance = {};
  model.setPersonStatus(sample, dates[1], anna.id, "sick", 3);
  model.setPersonStatus(sample, dates[5], boris.id, "absent", 4);
  model.setPersonStatus(sample, dates[0], removed.id, "present", 5);
  model.setPersonStatus(sample, dates[6], removed.id, "present", 6);
  model.archivePerson(sample, removed.id, 7);
  const gaps = await render(sample, "trimmed-with-middle-gaps.png", true);
  check(same(gaps.headers, expectedHeaders), "Wrong trimmed date columns");
  check(gaps.texts.filter((text) => text === "—").length === 8, "Middle gaps were not rendered as dashes");
  check(!gaps.texts.includes(removed.name), "Removed person appeared");
  check(gaps.texts.includes(datesModule.formatOverviewRange(dates.slice(1, 6))), "Range header not trimmed");
  check(gaps.files[0] === `poseshchaemost-${dates[5]}.png`, "Filename uses untrimmed end");

  const singleState = structuredClone(sample);
  singleState.attendance = {};
  model.setPersonStatus(singleState, dates[3], anna.id, "drunk", 8);
  const single = await render(singleState, "single-day.png", true);
  check(same(single.headers, [datesModule.formatOverviewDateHeader(dates[3]).date]), "Single date not retained");
  check(single.texts.includes(datesModule.formatOverviewRange([dates[3]])), "Single-date range label wrong");
  const empty = structuredClone(sample);
  empty.attendance = {};
  check((await overview.generateOverviewFiles(empty, dates)).length === 0, "Empty range generated a PNG");

  const many = model.createEmptyState(1);
  const people = model.addPeople(many, Array.from({ length: 51 }, (_, i) => `Тест ${i + 1}`), dates[1], 2);
  many.attendance = {};
  model.setPersonStatus(many, dates[1], people[50].id, "sick", 3);
  model.setPersonStatus(many, dates[5], people[0].id, "absent", 4);
  const paged = await render(many, "pagination");
  check(paged.files.length === 2 && same(paged.headers, [...expectedHeaders, ...expectedHeaders]), "Pages have different date ranges");

  const actualDates = overview.getOverviewDates(actualState, dates);
  const button = document.querySelector("#shareButton");
  if (actualDates.length) {
    check(!button.disabled, "Actual share image is not ready");
    const share = Object.getOwnPropertyDescriptor(navigator, "share");
    const canShare = Object.getOwnPropertyDescriptor(navigator, "canShare");
    try {
      const capture = new Promise((resolve) => Object.defineProperty(navigator, "share", { configurable: true, value: async ({ files }) => resolve(files) }));
      Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
      button.click();
      const files = await capture;
      images.push({ name: "actual-shared-overview.png", dataUrl: await dataUrl(files[0]) });
    } finally {
      if (share) Object.defineProperty(navigator, "share", share); else delete navigator.share;
      if (canShare) Object.defineProperty(navigator, "canShare", canShare); else delete navigator.canShare;
    }
  } else {
    check(button.disabled && document.querySelector("#shareButtonLabel").textContent === "Нет отметок за эти дни", "All-empty state is not explained");
  }
  check(localStorage.getItem("attendance-pwa.state.v1") === savedBefore, "Saved data changed");
  return { trimmedEnds: true, middleGaps: true, singleDay: true, emptyRange: true, pagination: true, actualDates, dataUnchanged: true, images };
})()
