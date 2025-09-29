import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface WorkerAllocation {
  total: number;
  food: number;
  wood: number;
  gold: number;
  favor: number;
}

export interface ResourceDelta {
  food: number;
  wood: number;
  gold: number;
  favor: number;
}

export interface BuildOrderAction {
  description: string;
  timing?: string | null;
  workers: WorkerAllocation;
  delta?: ResourceDelta;
}

export interface BuildOrderStep {
  name: string; // "Archaic", "Classical", "Advance to Heroic", etc.
  timing?: string | null;
  actions: BuildOrderAction[];
}

export interface OpponentInfo {
  civ: 'Greek' | 'Norse' | 'Egyptian' | 'Atlantean' | 'Chinese' | 'Japanese' | null;
  majorGod: 'Zeus' | 'Poseidon' | 'Hades' | 'Ra' | 'Isis' | 'Set' | 'Odin' | 'Thor' | 'Loki' | 'Freyr' | 'Kronos' | 'Oranos' | 'Gaia' | 'Fu Xi' | 'Nu Wa' | 'Shennong' | null;
  confidence: number;
  evidence: string[];
}

export interface MapInfo {
  name: 'Anatolia' | 'Mediterranean' | 'Islands' | 'Oasis' | 'Savanna' | 'Alfheim' | 'Marsh' | 'Watering Hole' | 'Black Sea' | null;
  type: 'Water' | 'Land' | 'Hybrid' | null;
  confidence: number;
  evidence: string[];
}

export interface BuildOrder {
  godName: string;
  buildOrder: string;
  author?: string | null;
  notes: string[];
  source?: string | null;
  opponent: OpponentInfo;
  map: MapInfo;
  tags: string[];
  steps: BuildOrderStep[];
}

@Injectable({
  providedIn: 'root'
})
export class DodBuildOrdersService {
  private readonly BUILD_ORDERS_URL = 'assets/data/build-orders.json';
  private buildOrdersData: BuildOrder[] | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Load build orders data from JSON file
   */
  private loadBuildOrders(): Observable<BuildOrder[]> {
    if (this.buildOrdersData) {
      return new Observable(observer => {
        observer.next(this.buildOrdersData!);
        observer.complete();
      });
    }

    return this.http.get<BuildOrder[]>(this.BUILD_ORDERS_URL).pipe(
      map(data => {
        this.buildOrdersData = data;
        return data;
      }),
      catchError(error => {
        console.error('Failed to load build orders data:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all available god names
   */
  getAvailableGods(): Observable<string[]> {
    return this.loadBuildOrders().pipe(
      map(data => {
        const uniqueGods = [...new Set(data.map(buildOrder => buildOrder.godName))];
        return uniqueGods.sort();
      })
    );
  }

  /**
   * Get build orders for a specific god
   */
  getBuildOrdersForGod(godName: string): Observable<BuildOrder[]> {
    return this.loadBuildOrders().pipe(
      map(data => {
        return data.filter(buildOrder => 
          buildOrder.godName.toLowerCase() === godName.toLowerCase()
        );
      }),
      catchError(error => {
        console.error(`Failed to get build orders for ${godName}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all build orders data
   */
  getAllBuildOrders(): Observable<BuildOrder[]> {
    return this.loadBuildOrders();
  }

  /**
   * Check if build orders are available for a god
   */
  isGodAvailable(godName: string): Observable<boolean> {
    return this.getAvailableGods().pipe(
      map(gods => gods.some(god => god.toLowerCase() === godName.toLowerCase()))
    );
  }

  /**
   * Get build orders filtered by tags
   */
  getBuildOrdersByTags(tags: string[]): Observable<BuildOrder[]> {
    return this.loadBuildOrders().pipe(
      map(data => {
        return data.filter(buildOrder => 
          tags.some(tag => buildOrder.tags.includes(tag))
        );
      })
    );
  }

  /**
   * Get build orders filtered by opponent civilization
   */
  getBuildOrdersByOpponentCiv(civ: string): Observable<BuildOrder[]> {
    return this.loadBuildOrders().pipe(
      map(data => {
        return data.filter(buildOrder => 
          buildOrder.opponent.civ === civ
        );
      })
    );
  }

  /**
   * Get build orders filtered by map type
   */
  getBuildOrdersByMapType(mapType: 'Water' | 'Land' | 'Hybrid'): Observable<BuildOrder[]> {
    return this.loadBuildOrders().pipe(
      map(data => {
        return data.filter(buildOrder => 
          buildOrder.map.type === mapType
        );
      })
    );
  }

  /**
   * Search build orders by text in name, notes, or actions
   */
  searchBuildOrders(searchText: string): Observable<BuildOrder[]> {
    return this.loadBuildOrders().pipe(
      map(data => {
        const searchLower = searchText.toLowerCase();
        return data.filter(buildOrder => {
          // Search in build order name
          if (buildOrder.buildOrder.toLowerCase().includes(searchLower)) {
            return true;
          }
          
          // Search in notes
          if (buildOrder.notes.some(note => note.toLowerCase().includes(searchLower))) {
            return true;
          }
          
          // Search in action descriptions
          return buildOrder.steps.some(step => 
            step.actions.some(action => 
              action.description.toLowerCase().includes(searchLower)
            )
          );
        });
      })
    );
  }

  /**
   * Get all unique tags from all build orders
   */
  getAllTags(): Observable<string[]> {
    return this.loadBuildOrders().pipe(
      map(data => {
        const allTags = data.flatMap(buildOrder => buildOrder.tags);
        return [...new Set(allTags)].sort();
      })
    );
  }

  /**
   * Get all unique civilizations from opponent data
   */
  getOpponentCivilizations(): Observable<string[]> {
    return this.loadBuildOrders().pipe(
      map(data => {
        const civs = data
          .map(buildOrder => buildOrder.opponent.civ)
          .filter(civ => civ !== null) as string[];
        return [...new Set(civs)].sort();
      })
    );
  }

  /**
   * Get all unique maps from build orders
   */
  getMaps(): Observable<string[]> {
    return this.loadBuildOrders().pipe(
      map(data => {
        const maps = data
          .map(buildOrder => buildOrder.map.name)
          .filter(map => map !== null) as string[];
        return [...new Set(maps)].sort();
      })
    );
  }
}