const operation = document.getElementById("operation");
const extraInputs = document.getElementById("extraInputs");
const result = document.getElementById("result");
const formula = document.getElementById("formula");

const descriptions = {
    descriptive: "Calculates mean, median, mode, range, variance, standard deviation and quartiles.",
    correlation: "Calculates Pearson's correlation coefficient r for paired datasets.",
    regression: "Calculates the linear regression equation y = a + bx.",
    zscore: "Calculates z = (x - mean) / standard deviation.",
    binomial: "Calculates P(X = k) for a binomial distribution.",
    normal: "Calculates P(X ≤ x) using the normal distribution.",
    confidence: "Calculates a confidence interval for a population mean using a t critical value.",
    ttest: "Performs a two-sided one-sample t-test using the t distribution."
};

const fields = {
    zscore: [["mean", "Population mean"], ["sd", "Population standard deviation"], ["x", "Value of x"]],
    binomial: [["n", "Number of trials (n)"], ["k", "Number of successes (k)"], ["p", "Probability of success (0 to 1)"]],
    normal: [["mean", "Population mean"], ["sd", "Population standard deviation"], ["x", "Value of x"]],
    confidence: [["confidence", "Confidence level (e.g. 0.95)"]],
    ttest: [["mu", "Hypothesized population mean"]]
};

operation.addEventListener("change", updateFields);
document.getElementById("solveButton").addEventListener("click", solve);
document.getElementById("clearButton").addEventListener("click", clearAll);

function updateFields() {
    const op = operation.value;
    extraInputs.innerHTML = (fields[op] || []).map(([id, label]) => `
        <label for="${id}">${label}</label>
        <input type="number" id="${id}" step="any" placeholder="Enter ${label.toLowerCase()}">
    `).join("");

    if (op === "correlation" || op === "regression") {
        extraInputs.innerHTML += `
            <label for="dataY">Second dataset (Y values)</label>
            <textarea id="dataY" placeholder="Example: 10, 13, 16, 19, 22"></textarea>
        `;
    }
    formula.textContent = descriptions[op];
}

function getNumber(id) {
    const el = document.getElementById(id);
    if (!el || el.value.trim() === "") throw new Error("Please complete all required numerical fields.");
    const value = Number(el.value);
    if (!Number.isFinite(value)) throw new Error("Enter a valid finite number.");
    return value;
}

function getData(id = "data") {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) throw new Error("Please enter your dataset.");
    const values = el.value.split(",").map(v => v.trim());
    if (values.some(v => v === "" || !Number.isFinite(Number(v)))) {
        throw new Error("Enter valid numbers separated by commas.");
    }
    return values.map(Number);
}

function mean(data) {
    return data.reduce((sum, x) => sum + x, 0) / data.length;
}
function median(data) {
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length, m = Math.floor(n / 2);
    return n % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}
function quantile(data, p) {
    const sorted = [...data].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * p, lower = Math.floor(pos), fraction = pos - lower;
    return sorted[lower + 1] === undefined ? sorted[lower] :
        sorted[lower] + fraction * (sorted[lower + 1] - sorted[lower]);
}
function variance(data, sample = false) {
    if (sample && data.length < 2) throw new Error("Sample variance requires at least two values.");
    const m = mean(data);
    return data.reduce((sum, x) => sum + (x - m) ** 2, 0) / (data.length - (sample ? 1 : 0));
}
function mode(data) {
    const counts = new Map();
    data.forEach(x => counts.set(x, (counts.get(x) || 0) + 1));
    const maxCount = Math.max(...counts.values());
    if (maxCount === 1) return "No mode";
    return [...counts.entries()].filter(([, count]) => count === maxCount).map(([value]) => value).join(", ");
}
function descriptive(data) {
    const sorted = [...data].sort((a, b) => a - b);
    return {
        Count: data.length, Mean: mean(data), Median: median(data), Mode: mode(data),
        Minimum: sorted[0], Maximum: sorted[sorted.length - 1],
        Range: sorted[sorted.length - 1] - sorted[0],
        "Population variance": variance(data),
        "Population standard deviation": Math.sqrt(variance(data)),
        "Sample variance": data.length > 1 ? variance(data, true) : "Requires n ≥ 2",
        "Sample standard deviation": data.length > 1 ? Math.sqrt(variance(data, true)) : "Requires n ≥ 2",
        "First quartile (Q1)": quantile(data, 0.25),
        "Third quartile (Q3)": quantile(data, 0.75)
    };
}
function pairedData() {
    const x = getData("data"), y = getData("dataY");
    if (x.length !== y.length || x.length < 2) throw new Error("Paired datasets must have equal lengths and at least two pairs.");
    return { x, y };
}
function correlation(x, y) {
    const mx = mean(x), my = mean(y);
    const numerator = x.reduce((sum, xi, i) => sum + (xi - mx) * (y[i] - my), 0);
    const dx = x.reduce((sum, xi) => sum + (xi - mx) ** 2, 0);
    const dy = y.reduce((sum, yi) => sum + (yi - my) ** 2, 0);
    if (dx === 0 || dy === 0) throw new Error("Correlation is undefined for a constant dataset.");
    return numerator / Math.sqrt(dx * dy);
}
function regression(x, y) {
    const mx = mean(x), my = mean(y);
    const denominator = x.reduce((sum, xi) => sum + (xi - mx) ** 2, 0);
    if (denominator === 0) throw new Error("Regression is undefined when all X values are equal.");
    const numerator = x.reduce((sum, xi, i) => sum + (xi - mx) * (y[i] - my), 0);
    const slope = numerator / denominator, intercept = my - slope * mx, r = correlation(x, y);
    return { Slope: slope, Intercept: intercept, "Regression equation": `y = ${intercept} + (${slope})x`, "R-squared": r * r, Correlation: r };
}
function logGamma(z) {
    const p = [676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    let x = 0.9999999999998099;
    p.forEach((v, i) => x += v / (z + i + 1));
    const t = z + p.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
function binomialProbability(n, k, p) {
    if (!Number.isInteger(n) || n < 0 || !Number.isInteger(k) || k < 0 || k > n || p < 0 || p > 1) {
        throw new Error("Require integer n ≥ 0, integer 0 ≤ k ≤ n, and 0 ≤ p ≤ 1.");
    }
    if (p === 0) return k === 0 ? 1 : 0;
    if (p === 1) return k === n ? 1 : 0;
    const logCombination = logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
    return Math.exp(logCombination + k * Math.log(p) + (n - k) * Math.log1p(-p));
}
function normalCDF(z) {
    const sign = z < 0 ? -1 : 1, x = Math.abs(z) / Math.sqrt(2), t = 1 / (1 + 0.3275911 * x);
    const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * erf);
}
function betaCF(a, b, x) {
    const MAX = 200, EPS = 3e-14, FPMIN = 1e-300;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAX; m++) {
        const m2 = 2 * m;
        let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
        d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d; h *= d * c;
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
        d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d;
        const delta = d * c;
        h *= delta;
        if (Math.abs(delta - 1) < EPS) break;
    }
    return h;
}
function regularizedBeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x));
    return x < (a + 1) / (a + b + 2) ? bt * betaCF(a, b, x) / a : 1 - bt * betaCF(b, a, 1 - x) / b;
}
function studentTCDF(t, df) {
    if (!(df > 0)) throw new Error("Degrees of freedom must be positive.");
    const ib = regularizedBeta(df / (df + t * t), df / 2, 0.5);
    return t >= 0 ? 1 - ib / 2 : ib / 2;
}
function inverseTCDF(p, df) {
    if (!(p > 0 && p < 1) || !(df > 0)) throw new Error("Invalid probability or degrees of freedom.");
    let low = -100, high = 100;
    for (let i = 0; i < 200; i++) {
        const mid = (low + high) / 2;
        if (studentTCDF(mid, df) < p) low = mid; else high = mid;
    }
    return (low + high) / 2;
}
function solve() {
    try {
        const op = operation.value;
        let answer, explanation = "";
        switch (op) {
            case "descriptive": {
                const data = getData();
                if (!data.length) throw new Error("Dataset cannot be empty.");
                answer = descriptive(data);
                explanation = "Mean = Σx/n. Population variance = Σ(x − μ)²/n. Sample variance = Σ(x − x̄)²/(n − 1).";
                break;
            }
            case "correlation": {
                const { x, y } = pairedData();
                answer = { "Pearson correlation coefficient": correlation(x, y) };
                explanation = "Pearson's r measures the strength and direction of a linear relationship.";
                break;
            }
            case "regression": {
                const { x, y } = pairedData();
                answer = regression(x, y);
                explanation = "Least-squares regression: y = a + bx, where b is the slope and a is the intercept.";
                break;
            }
            case "zscore": {
                const m = getNumber("mean"), sd = getNumber("sd"), x = getNumber("x");
                if (sd <= 0) throw new Error("Standard deviation must be positive.");
                answer = { "Z-score": (x - m) / sd };
                explanation = "z = (x − μ)/σ.";
                break;
            }
            case "binomial": {
                const n = getNumber("n"), k = getNumber("k"), p = getNumber("p");
                answer = { "Exact probability P(X = k)": binomialProbability(n, k, p) };
                explanation = "P(X = k) = C(n,k) pᵏ (1 − p)ⁿ⁻ᵏ.";
                break;
            }
            case "normal": {
                const m = getNumber("mean"), sd = getNumber("sd"), x = getNumber("x");
                if (sd <= 0) throw new Error("Standard deviation must be positive.");
                const z = (x - m) / sd;
                answer = { Z: z, "P(X ≤ x)": normalCDF(z), "P(X > x)": 1 - normalCDF(z) };
                explanation = "Uses the normal CDF to calculate left-tail and right-tail probabilities. Values are numerical approximations.";
                break;
            }
            case "confidence": {
                const data = getData(), level = getNumber("confidence");
                if (data.length < 2) throw new Error("At least two observations are required.");
                if (!(level > 0 && level < 1)) throw new Error("Confidence level must be between 0 and 1.");
                const m = mean(data), se = Math.sqrt(variance(data, true) / data.length);
                const tcrit = inverseTCDF(1 - (1 - level) / 2, data.length - 1);
                answer = { "Sample mean": m, "Standard error": se, "Confidence level": level, "Lower bound": m - tcrit * se, "Upper bound": m + tcrit * se };
                explanation = "Confidence interval = x̄ ± t* × s/√n. Assumes independent observations and an appropriate sampling model.";
                break;
            }
            case "ttest": {
                const data = getData(), mu = getNumber("mu");
                if (data.length < 2) throw new Error("At least two observations are required.");
                const m = mean(data), s = Math.sqrt(variance(data, true));
                if (s === 0) throw new Error("The t-test is undefined when sample standard deviation is zero.");
                const t = (m - mu) / (s / Math.sqrt(data.length)), df = data.length - 1;
                const pValue = Math.min(1, 2 * (1 - studentTCDF(Math.abs(t), df)));
                answer = { "Sample mean": m, "Hypothesized mean": mu, "T statistic": t, "Degrees of freedom": df, "Two-sided p-value": pValue };
                explanation = "t = (x̄ − μ₀)/(s/√n). The p-value is two-sided. Interpret it using your chosen significance level.";
                break;
            }
            default: throw new Error("Unknown statistical operation.");
        }
        result.innerHTML = `<p class="success"><strong>Calculation completed.</strong></p>` +
            Object.entries(answer).map(([key, value]) =>
                `<p><strong>${escapeHTML(key)}:</strong> ${escapeHTML(typeof value === "number" ? Number(value.toPrecision(10)).toString() : String(value))}</p>`
            ).join("");
        formula.textContent = explanation;
    } catch (error) {
        result.innerHTML = `<p class="error">${escapeHTML(error.message)}</p>`;
    }
}
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}
function clearAll() {
    document.getElementById("data").value = "";
    updateFields();
    result.textContent = "Your statistical results will appear here.";
    formula.textContent = descriptions[operation.value];
}
updateFields();
