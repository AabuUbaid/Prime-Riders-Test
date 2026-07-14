// Test script to verify the CSV mapping and date formatting logic added to App.jsx

const dbToUiDate = (iso) => {
    if (!iso) return "";
    const clean = String(iso).split(/[ T]/)[0];
    const parts = clean.split("-");
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const uiToDbDate = (str) => {
    if (!str) return "";
    str = String(str).trim();
    const parts = str.split("/");
    if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            if (year < 100) year += 2000;
            const dd = String(day).padStart(2, "0");
            const mm = String(month).padStart(2, "0");
            return `${year}-${mm}-${dd}`;
        }
    }
    return str;
};

const normalizeCSVDate = (str) => {
    if (!str) return "";
    str = String(str).trim();

    // Excel date serial number support
    const serial = parseFloat(str);
    if (!isNaN(serial) && serial >= 30000 && serial <= 65000 && /^\d+(\.\d+)?$/.test(str)) {
        try {
            const dateVal = new Date((serial - 25569) * 86400 * 1000);
            if (!isNaN(dateVal.getTime())) {
                return dateVal.toISOString().slice(0, 10);
            }
        } catch (e) {
            // fallback
        }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }
    const parts = str.split(/[-/\s]+/);
    if (parts.length === 3) {
        let [dStr, mStr, yStr] = parts;
        const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const mLower = mStr.toLowerCase().slice(0, 3);
        const mIdx = months.indexOf(mLower);

        if (mIdx !== -1) {
            let day = parseInt(dStr, 10);
            let year = parseInt(yStr, 10);
            let month = mIdx + 1;

            if (!isNaN(day) && !isNaN(year)) {
                if (year < 100) {
                    year += 2000;
                }
                const dd = String(day).padStart(2, "0");
                const mm = String(month).padStart(2, "0");
                return `${year}-${mm}-${dd}`;
            }
        } else {
            let first = parseInt(dStr, 10);
            let second = parseInt(mStr, 10);
            let third = parseInt(yStr, 10);
            if (!isNaN(first) && !isNaN(second) && !isNaN(third)) {
                let year, month, day;
                if (first > 1000) {
                    year = first;
                    month = second;
                    day = third;
                } else {
                    day = first;
                    month = second;
                    year = third;
                    if (month > 12 && day <= 12) {
                        const temp = day;
                        day = month;
                        month = temp;
                    }
                }
                if (year < 100) {
                    year += 2000;
                }
                if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    const dd = String(day).padStart(2, "0");
                    const mm = String(month).padStart(2, "0");
                    return `${year}-${mm}-${dd}`;
                }
            }
        }
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, "0");
        const d = String(parsed.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }
    return str;
};

// Aliases lookup simulate
const BULK_FIELD_ALIASES = {
    otherExpense: ["otherexpense", "otherexpenses", "expense", "expenses"],
    leastSellingPrice: ["leastsellingprice", "leastselling", "leastsell", "leastprice"]
};

const CAR_STATUSES = ["Available", "Reserved", "Sold", "Upcoming"];

function simulateStatusParsing(strValue) {
    const found = CAR_STATUSES.find(s => s.toLowerCase() === strValue.toLowerCase());
    return found || "Available"; // default
}

console.log("=== VERIFY DATE HELPER CONVERSIONS ===");
console.log("dbToUiDate('2026-05-10'):", dbToUiDate("2026-05-10"), "-> Expected: 10/05/2026");
console.log("uiToDbDate('10/05/2026'):", uiToDbDate("10/05/2026"), "-> Expected: 2026-05-10");
console.log("uiToDbDate('  12/12/2028 '):", uiToDbDate("  12/12/2028 "), "-> Expected: 2028-12-12");

console.log("\n=== VERIFY EXCEL DATE SERIAL NUMBER PARSING ===");
console.log("normalizeCSVDate('43764'):", normalizeCSVDate("43764"), "-> Expected: 2019-10-26");
console.log("normalizeCSVDate('44256'):", normalizeCSVDate("44256"), "-> Expected: 2021-03-01");

console.log("\n=== VERIFY BULK FIELD ALIASES MATCHES ===");
const testHeaders = ["Other Expenses", "otherexpense", "leastselling", "leastsell", "Least Selling Price"];
testHeaders.forEach(h => {
    const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
    const field = Object.keys(BULK_FIELD_ALIASES).find(k => BULK_FIELD_ALIASES[k].includes(norm));
    console.log(`Header: "${h}" -> Normalized: "${norm}" -> Mapped Field: ${field}`);
});

console.log("\n=== VERIFY CASE-INSENSITIVE STATUS MATCHING ===");
console.log("simulateStatusParsing('available'):", simulateStatusParsing("available"), "-> Expected: Available");
console.log("simulateStatusParsing('SOLD'):", simulateStatusParsing("SOLD"), "-> Expected: Sold");
console.log("simulateStatusParsing('upcoming'):", simulateStatusParsing("upcoming"), "-> Expected: Upcoming");
console.log("simulateStatusParsing('Unknown'):", simulateStatusParsing("Unknown"), "-> Expected: Available");
