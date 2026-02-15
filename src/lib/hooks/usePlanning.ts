"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Garden, ZoneStatus } from "@/lib/garden/types";
import { getPlant } from "@/lib/plants/catalog";
import { getPlantFamily } from "@/lib/planning/families";
import { getWeeklyTasks, getStatusHints } from "@/lib/planning/calendar";
import { getAllRotationWarnings } from "@/lib/planning/rotation";
import { getPlanningStorage } from "@/lib/storage";
import {
  UserSettings,
  SeasonArchive,
  ArchivedZone,
} from "@/lib/planning/types";
import { getISOWeek } from "@/lib/planning/weeks";
import { generateId } from "@/lib/garden/helpers";

export function usePlanning(
  garden: Garden,
  setGarden: React.Dispatch<React.SetStateAction<Garden>>,
  setHasChanges: (v: boolean) => void
) {
  const [settings, setSettingsState] = useState<UserSettings>({});
  const [archives, setArchives] = useState<SeasonArchive[]>([]);
  const [loading, setLoading] = useState(true);

  // Laad settings en archives bij mount
  useEffect(() => {
    async function load() {
      try {
        const storage = getPlanningStorage();
        const [s, a] = await Promise.all([
          storage.loadUserSettings(),
          storage.loadSeasonArchives(garden.id),
        ]);
        setSettingsState(s);
        setArchives(a);
      } catch {
        // Stil falen — defaults
      }
      setLoading(false);
    }
    load();
  }, [garden.id]);

  // Taken voor huidige week
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentWeek = getISOWeek(now);
  const nextWeek = currentWeek >= 53 ? 1 : currentWeek + 1;

  const currentTasks = useMemo(
    () => getWeeklyTasks(garden, currentWeek, currentYear, settings),
    [garden, currentWeek, currentYear, settings]
  );

  // Taken voor volgende week
  const upcomingTasks = useMemo(
    () => getWeeklyTasks(garden, nextWeek, currentYear, settings),
    [garden, nextWeek, currentYear, settings]
  );

  // Status-transitie suggesties
  const statusHints = useMemo(
    () => getStatusHints(garden, currentWeek, currentYear, settings),
    [garden, currentWeek, currentYear, settings]
  );

  // Rotatie-waarschuwingen
  const rotationWarnings = useMemo(
    () => getAllRotationWarnings(garden.zones, archives),
    [garden.zones, archives]
  );

  // Settings opslaan
  const updateSettings = useCallback(async (newSettings: UserSettings) => {
    setSettingsState(newSettings);
    try {
      const storage = getPlanningStorage();
      await storage.saveUserSettings(newSettings);
    } catch {
      // Stil falen
    }
  }, []);

  // Seizoen archiveren
  const archiveSeason = useCallback(async (year: number) => {
    const zones: ArchivedZone[] = garden.zones.map((zone) => {
      const plant = getPlant(zone.plantId);
      const family = getPlantFamily(zone.plantId);
      return {
        zoneId: zone.id,
        plantId: zone.plantId,
        plantName: plant?.name ?? zone.plantId,
        familyId: family?.id,
        x: zone.x,
        y: zone.y,
        widthCm: zone.widthCm,
        heightCm: zone.heightCm,
      };
    });

    try {
      const storage = getPlanningStorage();
      await storage.saveSeasonArchive(garden.id, year, zones);
      const updated = await storage.loadSeasonArchives(garden.id);
      setArchives(updated);
    } catch {
      // Stil falen
    }
  }, [garden.id, garden.zones]);

  // Seizoen-archief verwijderen
  const deleteArchive = useCallback(async (year: number) => {
    try {
      const storage = getPlanningStorage();
      await storage.deleteSeasonArchive(garden.id, year);
      setArchives((prev) => prev.filter((a) => a.seasonYear !== year));
    } catch {
      // Stil falen
    }
  }, [garden.id]);

  // Taak afvinken (toggle: opnieuw klikken maakt ongedaan)
  const completeTask = useCallback((zoneId: string, taskId: string) => {
    setGarden((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => {
        if (z.id !== zoneId) return z;
        const completed = z.completedTasks ? { ...z.completedTasks } : {} as Record<string, string>;
        if (completed[taskId]) {
          // Toggle: verwijder completion
          delete completed[taskId];
        } else {
          // Markeer als klaar met huidige datum
          completed[taskId] = new Date().toISOString();
          const events = z.events ? [...z.events] : [];
          events.push({
            id: generateId(),
            type: "task-done",
            date: new Date().toISOString(),
            taskId,
          });
          return { ...z, completedTasks: completed, events };
        }
        return { ...z, completedTasks: completed };
      }),
      updatedAt: new Date().toISOString(),
    }));
    setHasChanges(true);
  }, [setGarden, setHasChanges]);

  // Zone status wijzigen
  const updateZoneStatus = useCallback((zoneId: string, status: ZoneStatus) => {
    setGarden((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => {
        if (z.id !== zoneId) return z;
        const events = z.events ? [...z.events] : [];
        const eventType = status === "sown-indoor" || status === "sown-outdoor" ? "sown"
          : status === "transplanted" ? "transplanted"
          : status === "harvesting" || status === "done" ? "harvested"
          : "note";
        events.push({
          id: generateId(),
          type: eventType,
          date: new Date().toISOString(),
        });
        return { ...z, status, season: new Date().getFullYear(), events };
      }),
      updatedAt: new Date().toISOString(),
    }));
    setHasChanges(true);
  }, [setGarden, setHasChanges]);

  return {
    currentTasks,
    upcomingTasks,
    currentWeek,
    statusHints,
    rotationWarnings,
    settings,
    updateSettings,
    archives,
    archiveSeason,
    deleteArchive,
    completeTask,
    updateZoneStatus,
    loading,
  };
}
