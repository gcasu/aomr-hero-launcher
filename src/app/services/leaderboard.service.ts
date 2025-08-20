import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LeaderboardResponse, LeaderboardRequest } from '../interfaces/leaderboard.interface';

@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {
  private readonly API_URL = 'https://api.ageofempires.com/api/agemyth/Leaderboard';

  constructor(private http: HttpClient) { }

  getLeaderboard(request: LeaderboardRequest): Observable<LeaderboardResponse> {
    return this.http.post<LeaderboardResponse>(this.API_URL, request);
  }

  getDefaultRequest(): LeaderboardRequest {
    return {
      consoleMatchType: 15,
      count: 100,
      matchType: "1",
      page: 1,
      region: "7",
      searchPlayer: "",
      sortColumn: "rank",
      sortDirection: "asc"
    };
  }
}
