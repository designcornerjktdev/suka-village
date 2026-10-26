import type { NightPrice, Quote, UnitId, UnitRate } from "./types";
import { isWeekendNight, nightsOf } from "./format";

/**
 * The price of a stay: night by night, per unit.
 *
 * A season rate beats the weekend rate, which beats the weekday rate. Keeping
 * every night in the quote (rather than only a total) is what lets the guest
 * and the admin see why a stay costs what it does.
 *
 * IN PRODUCTION THIS RUNS ON THE SERVER. The browser shows a quote; the server
 * computes the amount it charges, from its own rates, and never trusts a total
 * sent by the browser.
 */
export function priceNight(rate: UnitRate, date: string): NightPrice {
  const season = rate.seasons.find((s) => date >= s.from && date < s.to);
  if (season) return { date, rate: season.rate, kind: "season" };
  if (isWeekendNight(date)) return { date, rate: rate.weekend, kind: "weekend" };
  return { date, rate: rate.weekday, kind: "weekday" };
}

export function quote(rates: UnitRate[], checkIn: string, checkOut: string, units: UnitId[]): Quote {
  const nights = nightsOf(checkIn, checkOut);
  const lines = units.map((unit) => {
    const rate = rates.find((r) => r.unit === unit);
    const priced = rate ? nights.map((d) => priceNight(rate, d)) : [];
    return { unit, nights: priced, subtotal: priced.reduce((sum, n) => sum + n.rate, 0) };
  });
  return {
    checkIn,
    checkOut,
    nights: nights.length,
    lines,
    total: lines.reduce((sum, l) => sum + l.subtotal, 0),
    currency: "IDR",
  };
}

/** The cheapest nightly rate a unit can go for, for "from" labels. */
export function fromRate(rate: UnitRate) {
  return Math.min(rate.weekday, rate.weekend, ...rate.seasons.map((s) => s.rate));
}
