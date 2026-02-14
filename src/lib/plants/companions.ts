import { getPlant } from "./catalog";
import { PlantData } from "./types";

export type CompanionType = "good" | "bad" | "neutral";

export interface CompanionCheck {
  type: CompanionType;
  plantA: PlantData;
  plantB: PlantData;
  message: string;
}

export function checkCompanion(plantIdA: string, plantIdB: string): CompanionCheck | null {
  const plantA = getPlant(plantIdA);
  const plantB = getPlant(plantIdB);
  if (!plantA || !plantB) return null;

  if (plantA.companions.good.includes(plantIdB)) {
    return {
      type: "good",
      plantA,
      plantB,
      message: `${plantA.name} en ${plantB.name} zijn goede buren!`,
    };
  }

  if (plantA.companions.bad.includes(plantIdB)) {
    return {
      type: "bad",
      plantA,
      plantB,
      message: `${plantA.name} en ${plantB.name} zijn slechte buren.`,
    };
  }

  return {
    type: "neutral",
    plantA,
    plantB,
    message: `${plantA.name} en ${plantB.name} zijn neutrale buren.`,
  };
}

export function checkAllCompanions(
  plantId: string,
  neighborIds: string[]
): CompanionCheck[] {
  const checks: CompanionCheck[] = [];
  for (const neighborId of neighborIds) {
    if (neighborId === plantId) continue;
    const check = checkCompanion(plantId, neighborId);
    if (check && check.type !== "neutral") {
      checks.push(check);
    }
  }
  return checks;
}
