// Shared helpers for deciding which positions a quiz may use.
// Used by the quiz settings screens (to count what's available) and by both quizzes
// (to build the question list), so the two always agree.
//
// Rules:
//   - A position type (MCG, Fastimate, NNM, CYM, MM8) selects the positions in the JSON with
//     that METHOD that are flagged IS_COMMON_POSITION, EXCEPT NNM, which has too little data
//     to be that picky and uses every NNM position.
//   - MCG and Fastimate share the same pool of positions: picking either one includes them.
//   - Any combination of types can be selected. `isAll` means every type is selected.

import positions from './epc_positions.json';

const isCommon = (value) => value === "yes" || value === true || value === "true";

// Is this position allowed by the settings?
export function isAllowed(position, settings) {
  let typeSelected;
  switch (position.METHOD) {
    case "MCG":
    case "Fastimate":
      typeSelected = settings.isMCG || settings.isFastimate;
      break;
    case "NNM":
      typeSelected = settings.isNNM;
      break;
    case "CYM":
      typeSelected = settings.isCYM;
      break;
    case "MM8":
      typeSelected = settings.isMM8;
      break;
    default:
      return false; // unknown method
  }
  if (!(settings.isAll || typeSelected)) return false;
  return position.METHOD === "NNM" || isCommon(position.IS_COMMON_POSITION);
}

// Keys (e.g. "A310002") of every position the settings allow
export function getAllowedKeys(settings) {
  return Object.entries(positions)
    .filter(([, position]) => isAllowed(position, settings))
    .map(([key]) => key);
}

// Which estimation method the user is quizzed on for this position.
// Only MCG/Fastimate positions can be quizzed either way; the rest are quizzed as themselves.
export function pickMethod(settings, position) {
  const method = position.METHOD;
  if (method !== "MCG" && method !== "Fastimate") return method;
  if (settings.isFastimate && settings.isMCG) return Math.random() < 0.5 ? "Fastimate" : "MCG";
  if (settings.isFastimate) return "Fastimate";
  return method;
}
