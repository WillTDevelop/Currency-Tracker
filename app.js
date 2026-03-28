const config = window.CURRENCY_CONFIG || {};

const amountInput = document.getElementById("amountInput");
const fromCurrency = document.getElementById("fromCurrency");
const toCurrency = document.getElementById("toCurrency");
const converterForm = document.getElementById("converterForm");
const conversionResult = document.getElementById("conversionResult");
const currentRate = document.getElementById("currentRate");
const lastUpdated = document.getElementById("lastUpdated");
const statusMessage = document.getElementById("statusMessage");
const swapButton = document.getElementById("swapButton");

const currencyOptions = [
  ["AUD", "Australian Dollar"],
  ["CAD", "Canadian Dollar"],
  ["CHF", "Swiss Franc"],
  ["CNY", "Chinese Yuan"],
  ["CZK", "Czech Koruna"],
  ["DKK", "Danish Krone"],
  ["EUR", "Euro"],
  ["GBP", "British Pound"],
  ["HKD", "Hong Kong Dollar"],
  ["HUF", "Hungarian Forint"],
  ["IDR", "Indonesian Rupiah"],
  ["ILS", "Israeli New Shekel"],
  ["INR", "Indian Rupee"],
  ["ISK", "Icelandic Krona"],
  ["JPY", "Japanese Yen"],
  ["KRW", "South Korean Won"],
  ["MXN", "Mexican Peso"],
  ["MYR", "Malaysian Ringgit"],
  ["NOK", "Norwegian Krone"],
  ["NZD", "New Zealand Dollar"],
  ["PHP", "Philippine Peso"],
  ["PLN", "Polish Zloty"],
  ["RON", "Romanian Leu"],
  ["SEK", "Swedish Krona"],
  ["SGD", "Singapore Dollar"],
  ["THB", "Thai Baht"],
  ["TRY", "Turkish Lira"],
  ["USD", "US Dollar"],
  ["ZAR", "South African Rand"],
];

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "#b42318" : "";
}

function buildCurrencySelects() {
  const markup = currencyOptions
    .map(([code, name]) => `<option value="${code}">${code} · ${name}</option>`)
    .join("");

  fromCurrency.innerHTML = markup;
  toCurrency.innerHTML = markup;
  fromCurrency.value = "USD";
  toCurrency.value = "EUR";
}

function formatMoney(amount, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Unknown";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function fetchFromFrankfurter(base, target, amount) {
  const url = new URL("https://api.frankfurter.dev/v1/latest");
  url.searchParams.set("base", base);
  url.searchParams.set("symbols", target);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || !data.rates || typeof data.rates[target] !== "number") {
    throw new Error("Unable to load rate from Frankfurter.");
  }

  const rate = data.rates[target];

  return {
    rate,
    convertedAmount: amount * rate,
    updatedAt: data.date,
  };
}

async function fetchFromExchangeRateApi(base, target, amount) {
  if (!config.exchangeRateApiKey) {
    throw new Error("Missing ExchangeRate-API key in config.js.");
  }

  const url = `https://v6.exchangerate-api.com/v6/${config.exchangeRateApiKey}/pair/${base}/${target}/${amount}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.result !== "success") {
    throw new Error(data["error-type"] || "Unable to load rate from ExchangeRate-API.");
  }

  return {
    rate: data.conversion_rate,
    convertedAmount: data.conversion_result,
    updatedAt: data.time_last_update_utc,
  };
}

async function fetchConversion(base, target, amount) {
  if ((config.provider || "").toLowerCase() === "exchangerate-api") {
    return fetchFromExchangeRateApi(base, target, amount);
  }

  return fetchFromFrankfurter(base, target, amount);
}

async function updateConversion() {
  const amount = Number(amountInput.value);
  const base = fromCurrency.value;
  const target = toCurrency.value;

  if (!amount || amount <= 0) {
    setStatus("Enter an amount greater than 0.", true);
    return;
  }

  setStatus("Fetching the latest rate...");

  try {
    const data = await fetchConversion(base, target, amount);
    conversionResult.textContent = formatMoney(data.convertedAmount, target);
    currentRate.textContent = `1 ${base} = ${data.rate.toFixed(4)} ${target}`;
    lastUpdated.textContent = formatDate(data.updatedAt);
    setStatus("Live rate loaded successfully.");
  } catch (error) {
    conversionResult.textContent = "--";
    currentRate.textContent = "--";
    lastUpdated.textContent = "Unavailable";
    setStatus(error.message || "Something went wrong while loading rates.", true);
  }
}

swapButton.addEventListener("click", () => {
  const oldFrom = fromCurrency.value;
  fromCurrency.value = toCurrency.value;
  toCurrency.value = oldFrom;
  updateConversion();
});

fromCurrency.addEventListener("change", updateConversion);
toCurrency.addEventListener("change", updateConversion);

converterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateConversion();
});

buildCurrencySelects();
updateConversion();
