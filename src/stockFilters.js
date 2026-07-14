const STOCK_STATUS_ALL = "All";
const STOCK_SOURCE_ALL = "All";
const AGING_THRESHOLD_DAYS = 90;

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysSince = (iso) => {
  if (!iso) return null;
  const cleanIso = String(iso).split(/[ T]/)[0];
  const parts = cleanIso.split(/[-/]/);
  if (parts.length < 3) return null;
  // Support YYYY-MM-DD and DD/MM/YYYY: if parts[2] is 4 digits it's the year
  let year, month, day;
  if (String(parts[2]).length === 4) {
    year = parseInt(parts[2], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[0], 10);
  } else {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  }
  const then = new Date(year, month, day);
  if (isNaN(then.getTime())) return null;
  const now = new Date();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thenMidnight = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  return Math.round((nowMidnight - thenMidnight) / 86400000);
};

const STATUS_PRIORITY = {
  "Available": 1,
  "Reserved": 2,
  "In Service": 3,
  "Upcoming": 4,
  "Sold": 5
};

export const defaultStockFilterState = {
  query: "",
  statusFilter: STOCK_STATUS_ALL,
  sourceFilter: STOCK_SOURCE_ALL,
  agedOnly: false,
  upcomingOnly: false,
  minPrice: "",
  maxPrice: "",
  minLeastPrice: "",
  maxLeastPrice: "",
};

export function isAgedStock(car) {
  const days = daysSince(car?.dateAdded);
  return days !== null && days > AGING_THRESHOLD_DAYS && (car.status === "Available" || car.status === "Reserved");
}

const parseNum = (val) => {
  if (val === null || val === undefined || val === "") return 0;
  const parsed = Number(String(val).replace(/,/g, ""));
  return isNaN(parsed) ? 0 : parsed;
};

export function filterStockItems(cars, filters = {}) {
  const {
    query = "",
    statusFilter = STOCK_STATUS_ALL,
    sourceFilter = STOCK_SOURCE_ALL,
    agedOnly = false,
    upcomingOnly = false,
    minPrice = "",
    maxPrice = "",
    minLeastPrice = "",
    maxLeastPrice = "",
  } = filters;

  const filtered = (cars || [])
    .filter((c) => {
      const price = parseNum(c.isOffer && c.offerPrice ? c.offerPrice : c.askingPrice);
      const leastPrice = parseNum(c.leastSellingPrice || price);

      if (statusFilter !== STOCK_STATUS_ALL && c.status !== statusFilter) return false;
      if (sourceFilter !== STOCK_SOURCE_ALL && (c.source || "Own Purchase") !== sourceFilter) return false;
      if (agedOnly && !isAgedStock(c)) return false;
      if (upcomingOnly && c.status !== "Upcoming") return false;

      if (minPrice) {
        const minAmount = parseNum(minPrice);
        if (minAmount && price < minAmount) return false;
      }
      if (maxPrice) {
        const maxAmount = parseNum(maxPrice);
        if (maxAmount && price > maxAmount) return false;
      }

      if (minLeastPrice) {
        const minLeastAmount = parseNum(minLeastPrice);
        if (minLeastAmount && leastPrice < minLeastAmount) return false;
      }
      if (maxLeastPrice) {
        const maxLeastAmount = parseNum(maxLeastPrice);
        if (maxLeastAmount && leastPrice > maxLeastAmount) return false;
      }

      if (!query) return true;
      const q = query.toLowerCase();
      return [c.stockId, c.make, c.model, c.variant, c.chassis, c.engine, c.color, String(c.year || "")]
        .some((v) => (v || "").toString().toLowerCase().includes(q));
    });

  return filtered
    .map((c) => ({
      car: c,
      isAged: isAgedStock(c),
      statusPriority: STATUS_PRIORITY[c.status] || 99,
      ageDays: daysSince(c.dateAdded) ?? -1,
      expectedArrival: c.expectedArrival || "",
    }))
    .sort((a, b) => {
      if (statusFilter === "Upcoming" || upcomingOnly) {
        return a.expectedArrival.localeCompare(b.expectedArrival);
      }

      // Aged cars always bubble to the top
      if (a.isAged !== b.isAged) return a.isAged ? -1 : 1;
      // Among aged cars: oldest-first (most days = first)
      if (a.isAged && b.isAged) return b.ageDays - a.ageDays;

      // Non-aged: group by status priority first
      if (a.statusPriority !== b.statusPriority) return a.statusPriority - b.statusPriority;

      // Within same status: oldest-first (most days = first)
      return b.ageDays - a.ageDays;
    })
    .map((item) => item.car);
}

export { STOCK_STATUS_ALL, STOCK_SOURCE_ALL };
