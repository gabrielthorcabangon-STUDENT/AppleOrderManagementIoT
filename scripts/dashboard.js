/**
 * Apple Store Analytics — Interactive Dashboard & Visualization Controller
 * Branch: `js` (Maintained by JavaScript Developer)
 */

let rawDataset = [];
let activeSeries = "All";
let pricingChartInstance = null;
let discountScatterInstance = null;
let engagementChartInstance = null;
let hardwareChartInstance = null;

const formatINR = (num) => "₹" + Number(num).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const formatInt = (num) => Number(num).toLocaleString("en-IN");

async function initDashboard() {
  try {
    const response = await fetch("data/processed_apple_data.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    rawDataset = await response.json();
  } catch (err) {
    console.error("Failed to load processed_apple_data.json. Run via local server (e.g., python -m http.server).", err);
    document.getElementById("catalogBody").innerHTML =
      `<tr><td colspan="8" style="text-align:center;color:#b91c1c;">Unable to fetch <code>data/processed_apple_data.json</code>. Start a local web server (<code>python -m http.server 8000</code>).</td></tr>`;
    return;
  }

  buildSeriesPills();
  bindControls();
  renderAll();
}

function buildSeriesPills() {
  const container = document.getElementById("seriesPills");
  const seriesList = ["All", ...new Set(rawDataset.map((d) => d.Series))];

  container.innerHTML = seriesList
    .map(
      (series) => `
      <button class="pill-btn ${series === activeSeries ? "active" : ""}" data-series="${series}">
        ${series === "All" ? `All Lineups (${rawDataset.length})` : series}
      </button>`
    )
    .join("");

  container.querySelectorAll(".pill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeSeries = btn.dataset.series;
      container.querySelectorAll(".pill-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderAll();
    });
  });
}

function bindControls() {
  document.getElementById("searchInput").addEventListener("input", renderTable);
  document.getElementById("sortSelect").addEventListener("change", renderTable);
  document.getElementById("hardwareDimension").addEventListener("change", renderHardwareChart);

  const modal = document.getElementById("pythonModal");
  document.getElementById("openPipelineModal").addEventListener("click", () => modal.classList.add("open"));
  document.getElementById("closePipelineModal").addEventListener("click", () => modal.classList.remove("open"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("open");
  });
}

function getFilteredData() {
  if (activeSeries === "All") return rawDataset;
  return rawDataset.filter((item) => item.Series === activeSeries);
}

function renderAll() {
  const data = getFilteredData();
  renderKPIs(data);
  renderProductShelf(data);
  renderCharts(data);
  renderTable();
}

function renderKPIs(data) {
  const count = data.length;
  const meanSale = data.reduce((acc, d) => acc + d["Sale Price"], 0) / count;
  const meanMrp = data.reduce((acc, d) => acc + d.Mrp, 0) / count;
  const meanDiscount = data.reduce((acc, d) => acc + d["Discount Percentage"], 0) / count;
  const meanSavings = data.reduce((acc, d) => acc + d.Savings, 0) / count;
  const totalRatings = data.reduce((acc, d) => acc + d["Number Of Ratings"], 0);
  const totalReviews = data.reduce((acc, d) => acc + d["Number Of Reviews"], 0);
  const convRatio = totalRatings > 0 ? (totalReviews / totalRatings) * 100 : 0;
  const meanStar = data.reduce((acc, d) => acc + d["Star Rating"], 0) / count;

  document.getElementById("kpiPrice").textContent = formatINR(meanSale);
  document.getElementById("kpiPriceMeta").textContent = `Mean MRP: ${formatINR(meanMrp)} across ${count} SKUs`;

  document.getElementById("kpiDiscount").textContent = `${meanDiscount.toFixed(2)}%`;
  document.getElementById("kpiDiscountMeta").textContent = `Avg. Savings: ${formatINR(meanSavings)} per device`;

  document.getElementById("kpiRatio").textContent = `${convRatio.toFixed(2)}%`;
  document.getElementById("kpiRatioMeta").textContent = `${formatInt(totalReviews)} reviews / ${formatInt(totalRatings)} ratings`;

  document.getElementById("kpiStar").textContent = `${meanStar.toFixed(2)} ★`;
  document.getElementById("kpiStarMeta").textContent = `Active Filter: ${activeSeries}`;
}

function renderProductShelf(data) {
  const grid = document.getElementById("productShelf");
  // Show up to 8 representative SKUs sorted by Star Rating then Sale Price
  const featured = [...data].sort((a, b) => b["Star Rating"] - a["Star Rating"] || b["Sale Price"] - a["Sale Price"]).slice(0, 8);

  grid.innerHTML = featured
    .map(
      (item) => `
      <article class="liquid-glass product-card">
        <div>
          <div class="badge-row">
            <span class="series-tag">${item.Series}</span>
            ${item["Discount Percentage"] > 0 ? `<span class="discount-tag">${item["Discount Percentage"]}% OFF</span>` : `<span class="spec-pill">MRP</span>`}
          </div>
          <h3 class="product-title" style="margin-top:10px;">${item.Model}</h3>
          <p style="font-size:13px;color:var(--text-secondary);margin-top:2px;">${item.Color}</p>
        </div>

        <div class="spec-pills">
          <span class="spec-pill">${item.Storage}</span>
          <span class="spec-pill">${item.Ram} RAM</span>
          <span class="spec-pill">${item["Star Rating"]} ★ (${formatInt(item["Number Of Ratings"])})</span>
        </div>

        <div class="price-row">
          <span class="sale-price">${formatINR(item["Sale Price"])}</span>
          ${item.Savings > 0 ? `<span class="mrp-price">${formatINR(item.Mrp)}</span>` : ""}
        </div>
      </article>`
    )
    .join("");
}

function renderCharts(data) {
  // Group by Model
  const byModel = {};
  data.forEach((d) => {
    if (!byModel[d.Model]) {
      byModel[d.Model] = { sale: [], mrp: [], ratings: 0, reviews: 0 };
    }
    byModel[d.Model].sale.push(d["Sale Price"]);
    byModel[d.Model].mrp.push(d.Mrp);
    byModel[d.Model].ratings += d["Number Of Ratings"];
    byModel[d.Model].reviews += d["Number Of Reviews"];
  });

  const models = Object.keys(byModel);
  const avgSale = models.map((m) => byModel[m].sale.reduce((a, b) => a + b, 0) / byModel[m].sale.length);
  const avgMrp = models.map((m) => byModel[m].mrp.reduce((a, b) => a + b, 0) / byModel[m].mrp.length);

  // 1. Pricing vs MRP Grouped Bar Chart
  if (pricingChartInstance) pricingChartInstance.destroy();
  pricingChartInstance = new Chart(document.getElementById("pricingChart"), {
    type: "bar",
    data: {
      labels: models,
      datasets: [
        { label: "Avg Sale Price (₹)", data: avgSale, backgroundColor: "rgba(0, 113, 227, 0.78)", borderRadius: 8 },
        { label: "Avg MRP (₹)", data: avgMrp, backgroundColor: "rgba(134, 134, 139, 0.35)", borderRadius: 8 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top" } } },
  });

  // 2. Discount vs Sale Price Scatter
  if (discountScatterInstance) discountScatterInstance.destroy();
  discountScatterInstance = new Chart(document.getElementById("discountScatterChart"), {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "SKU Discount % vs Sale Price",
          data: data.map((d) => ({ x: d["Sale Price"], y: d["Discount Percentage"], model: d["Product Name"] })),
          backgroundColor: "rgba(16, 185, 129, 0.75)",
          pointRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw.model}: ${formatINR(ctx.raw.x)} (${ctx.raw.y}% off)`,
          },
        },
      },
      scales: {
        x: { title: { display: true, text: "Sale Price (₹)" } },
        y: { title: { display: true, text: "Discount (%)" } },
      },
    },
  });

  // 3. Review-to-Rating Ratio Combo Chart
  const ratios = models.map((m) =>
    byModel[m].ratings > 0 ? ((byModel[m].reviews / byModel[m].ratings) * 100).toFixed(2) : 0
  );
  const ratingsVol = models.map((m) => byModel[m].ratings);

  if (engagementChartInstance) engagementChartInstance.destroy();
  engagementChartInstance = new Chart(document.getElementById("engagementChart"), {
    data: {
      labels: models,
      datasets: [
        {
          type: "line",
          label: "Review-to-Rating Ratio (%)",
          data: ratios,
          borderColor: "#6366f1",
          backgroundColor: "#6366f1",
          yAxisID: "y1",
          tension: 0.35,
        },
        {
          type: "bar",
          label: "Total Ratings Volume",
          data: ratingsVol,
          backgroundColor: "rgba(99, 102, 241, 0.25)",
          borderRadius: 8,
          yAxisID: "y",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { type: "linear", position: "left", title: { display: true, text: "Ratings Count" } },
        y1: { type: "linear", position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "Ratio (%)" } },
      },
    },
  });

  renderHardwareChart();
}

function renderHardwareChart() {
  const data = getFilteredData();
  const dim = document.getElementById("hardwareDimension").value; // "Storage" or "Ram"
  const counts = {};
  data.forEach((d) => {
    counts[d[dim]] = (counts[d[dim]] || 0) + 1;
  });

  if (hardwareChartInstance) hardwareChartInstance.destroy();
  hardwareChartInstance = new Chart(document.getElementById("hardwareChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(counts),
      datasets: [
        {
          data: Object.values(counts),
          backgroundColor: ["#0071e3", "#10b981", "#6366f1", "#f59e0b", "#ec4899"],
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.8)",
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: "62%" },
  });
}

function renderTable() {
  const query = document.getElementById("searchInput").value.toLowerCase().trim();
  const sortBy = document.getElementById("sortSelect").value;
  let rows = getFilteredData().filter(
    (d) =>
      d["Product Name"].toLowerCase().includes(query) ||
      d.Color.toLowerCase().includes(query) ||
      d.Storage.toLowerCase().includes(query) ||
      d.Upc.toLowerCase().includes(query)
  );

  rows.sort((a, b) => {
    if (sortBy === "price_asc") return a["Sale Price"] - b["Sale Price"];
    if (sortBy === "price_desc") return b["Sale Price"] - a["Sale Price"];
    if (sortBy === "discount_desc") return b["Discount Percentage"] - a["Discount Percentage"];
    if (sortBy === "ratio_desc") return b["Review-to-Rating Ratio (%)"] - a["Review-to-Rating Ratio (%)"];
    return b["Number Of Ratings"] - a["Number Of Ratings"];
  });

  document.getElementById("catalogCount").textContent = `Showing ${rows.length} of ${rawDataset.length} SKUs`;
  document.getElementById("catalogBody").innerHTML = rows
    .map(
      (d) => `
      <tr>
        <td><strong>${d.Model}</strong><br><span style="color:var(--text-tertiary);font-size:11px;">${d.Upc}</span></td>
        <td>${d.Color}</td>
        <td>${d.Storage} / ${d.Ram}</td>
        <td><strong>${formatINR(d["Sale Price"])}</strong></td>
        <td>${formatINR(d.Mrp)}</td>
        <td>${d["Discount Percentage"]}% (${formatINR(d.Savings)})</td>
        <td>${d["Star Rating"]} ★ (${formatInt(d["Number Of Ratings"])})</td>
        <td><strong>${d["Review-to-Rating Ratio (%)"]}%</strong></td>
      </tr>`
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", initDashboard);
