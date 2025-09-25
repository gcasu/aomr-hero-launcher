import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  LeaderboardResponse, 
  LeaderboardRequest, 
  MatchListResponse, 
  MatchListRequest 
} from '../interfaces/leaderboard.interface';

@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {
  private readonly LEADERBOARD_API_URL = 'https://api.ageofempires.com/api/agemyth/Leaderboard';
  private readonly MATCH_LIST_API_URL = 'https://api.ageofempires.com/api/GameStats/AgeMyth/GetMatchList';

  constructor(private http: HttpClient) { }

  getLeaderboard(request: LeaderboardRequest): Observable<LeaderboardResponse> {
    return this.http.post<LeaderboardResponse>(this.LEADERBOARD_API_URL, request);
  }

  getMatchList(request: MatchListRequest): Observable<MatchListResponse> {
    return this.http.post<MatchListResponse>(this.MATCH_LIST_API_URL, request);
  }

  getDefaultLeaderboardRequest(): LeaderboardRequest {
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

  getDefaultMatchListRequest(gamertag: string, profileId: number): MatchListRequest {
    return {
      gamertag: gamertag,
      playerNumber: 0,
      game: "ageMyth",
      profileId: profileId,
      sortColumn: "dateTime",
      sortDirection: "desc",
      page: 1,
      recordCount: 10,
      matchType: "1"
    };
  }
}
