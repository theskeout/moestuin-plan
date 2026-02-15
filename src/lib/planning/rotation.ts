import { CropZone } from "@/lib/garden/types";
import { getPlantFamily } from "./families";
import { SeasonArchive, RotationWarning, HistoryEntry } from "./types";
import { getPlant } from "@/lib/plants/catalog";

/**
 * Check of twee zones overlappen qua positie.
 * Simpele AABB-overlap check.
 */
function zonesOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
  tolerance: number = 10
): boolean {
  return (
    ax < bx + bw + tolerance &&
    ax + aw + tolerance > bx &&
    ay < by + bh + tolerance &&
    ay + ah + tolerance > by
  );
}

/**
 * Check of een zone een rotatie-conflict heeft met eerdere seizoenen.
 */
export function checkRotation(
  zone: CropZone,
  archives: SeasonArchive[]
): RotationWarning | null {
  const family = getPlantFamily(zone.plantId);
  if (!family) return null;

  const currentYear = new Date().getFullYear();

  // Check de afgelopen N jaar (gebaseerd op rotationYears)
  for (const archive of archives) {
    const yearsAgo = currentYear - archive.seasonYear;
    if (yearsAgo <= 0 || yearsAgo > family.rotationYears) continue;

    for (const archivedZone of archive.zones) {
      // Check of zelfde positie
      if (!zonesOverlap(
        zone.x, zone.y, zone.widthCm, zone.heightCm,
        archivedZone.x, archivedZone.y, archivedZone.widthCm, archivedZone.heightCm
      )) continue;

      // Check of zelfde familie
      const archivedFamily = getPlantFamily(archivedZone.plantId);
      if (archivedFamily && archivedFamily.id === family.id) {
        const plant = getPlant(zone.plantId);
        return {
          zoneId: zone.id,
          plantId: zone.plantId,
          plantName: plant?.name ?? zone.plantId,
          familyId: family.id,
          familyName: family.name,
          conflictYear: archive.seasonYear,
          conflictPlant: archivedZone.plantName,
          rotationYears: family.rotationYears,
        };
      }
    }
  }

  return null;
}

/**
 * Haal de geschiedenis op voor een positie in de tuin.
 */
export function getPositionHistory(
  x: number,
  y: number,
  w: number,
  h: number,
  archives: SeasonArchive[]
): HistoryEntry[] {
  const history: HistoryEntry[] = [];

  for (const archive of archives) {
    for (const zone of archive.zones) {
      if (zonesOverlap(x, y, w, h, zone.x, zone.y, zone.widthCm, zone.heightCm)) {
        history.push({
          year: archive.seasonYear,
          plantId: zone.plantId,
          plantName: zone.plantName,
          familyId: zone.familyId,
        });
      }
    }
  }

  // Sorteer op jaar (nieuwste eerst)
  return history.sort((a, b) => b.year - a.year);
}

/**
 * Alle rotatie-waarschuwingen voor een tuin.
 */
export function getAllRotationWarnings(
  zones: CropZone[],
  archives: SeasonArchive[]
): RotationWarning[] {
  const warnings: RotationWarning[] = [];
  for (const zone of zones) {
    const warning = checkRotation(zone, archives);
    if (warning) warnings.push(warning);
  }
  return warnings;
}
