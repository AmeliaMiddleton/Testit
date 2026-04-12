using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using HexaAway.Api.Models;

namespace HexaAway.Api.Services;

public class SupabaseService
{
    private readonly HttpClient _http;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public SupabaseService(HttpClient http)
    {
        _http = http;
    }

    // -------------------------------------------------------------------------
    // Levels
    // -------------------------------------------------------------------------

    public async Task<List<LevelSummary>> GetLevelsAsync()
    {
        var response = await _http.GetAsync("levels?select=id,name,difficulty,max_moves&order=id");
        response.EnsureSuccessStatusCode();
        return JsonSerializer.Deserialize<List<LevelSummary>>(
            await response.Content.ReadAsStringAsync(), JsonOpts) ?? [];
    }

    public async Task<Level?> GetLevelByIdAsync(int id)
    {
        var response = await _http.GetAsync(
            $"levels?id=eq.{id}&select=id,name,difficulty,max_moves,board_cells,tiles");
        response.EnsureSuccessStatusCode();
        var levels = JsonSerializer.Deserialize<List<Level>>(
            await response.Content.ReadAsStringAsync(), JsonOpts) ?? [];
        return levels.FirstOrDefault();
    }

    // -------------------------------------------------------------------------
    // Player Profile
    // -------------------------------------------------------------------------

    public async Task<PlayerProfile?> GetPlayerProfileAsync(Guid userId)
    {
        var response = await _http.GetAsync($"player_profiles?user_id=eq.{userId}");
        response.EnsureSuccessStatusCode();
        var profiles = JsonSerializer.Deserialize<List<PlayerProfile>>(
            await response.Content.ReadAsStringAsync(), JsonOpts) ?? [];
        return profiles.FirstOrDefault();
    }

    public async Task<PlayerProfile> CreatePlayerProfileAsync(Guid userId, string username = "Player")
    {
        var body = JsonSerializer.Serialize(
            new { user_id = userId, username, coins = 0, bombs = 3, hammers = 3 }, JsonOpts);

        var request = new HttpRequestMessage(HttpMethod.Post, "player_profiles")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        request.Headers.Add("Prefer", "return=representation");

        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var profiles = JsonSerializer.Deserialize<List<PlayerProfile>>(
            await response.Content.ReadAsStringAsync(), JsonOpts) ?? [];
        return profiles.First();
    }

    public async Task<PlayerProfile?> UpdatePlayerProfileAsync(Guid userId, UpdateProfileRequest req)
    {
        // Build update payload using only provided fields (snake_case keys required)
        var fields = new Dictionary<string, object>();
        if (req.Username is not null) fields["username"] = req.Username;
        if (req.Coins.HasValue)      fields["coins"]    = req.Coins.Value;
        if (req.Bombs.HasValue)      fields["bombs"]    = req.Bombs.Value;
        if (req.Hammers.HasValue)    fields["hammers"]  = req.Hammers.Value;

        if (fields.Count == 0)
            return await GetPlayerProfileAsync(userId);

        var request = new HttpRequestMessage(HttpMethod.Patch, $"player_profiles?user_id=eq.{userId}")
        {
            Content = new StringContent(JsonSerializer.Serialize(fields), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("Prefer", "return=representation");

        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var profiles = JsonSerializer.Deserialize<List<PlayerProfile>>(
            await response.Content.ReadAsStringAsync(), JsonOpts) ?? [];
        return profiles.FirstOrDefault();
    }

    // -------------------------------------------------------------------------
    // Level Progress
    // -------------------------------------------------------------------------

    public async Task<List<LevelProgress>> GetProgressAsync(Guid userId)
    {
        var response = await _http.GetAsync($"level_progress?user_id=eq.{userId}&order=level_id");
        response.EnsureSuccessStatusCode();
        return JsonSerializer.Deserialize<List<LevelProgress>>(
            await response.Content.ReadAsStringAsync(), JsonOpts) ?? [];
    }

    public async Task SaveProgressAsync(Guid userId, SaveProgressRequest req)
    {
        // Fetch existing record so we can apply GREATEST/LEAST logic in C#
        var getResp = await _http.GetAsync(
            $"level_progress?user_id=eq.{userId}&level_id=eq.{req.LevelId}");
        getResp.EnsureSuccessStatusCode();
        var existing = JsonSerializer.Deserialize<List<LevelProgress>>(
            await getResp.Content.ReadAsStringAsync(), JsonOpts) ?? [];

        if (existing.Count == 0)
        {
            var body = JsonSerializer.Serialize(new
            {
                user_id   = userId,
                level_id  = req.LevelId,
                completed = req.Completed,
                stars     = req.Stars,
                best_moves = req.MovesUsed,
                attempts  = 1
            }, JsonOpts);
            (await _http.PostAsync("level_progress",
                new StringContent(body, Encoding.UTF8, "application/json"))).EnsureSuccessStatusCode();
        }
        else
        {
            var ex = existing[0];
            var body = JsonSerializer.Serialize(new
            {
                completed  = ex.Completed || req.Completed,
                stars      = Math.Max(ex.Stars, req.Stars),
                best_moves = ex.BestMoves.HasValue
                    ? Math.Min(ex.BestMoves.Value, req.MovesUsed)
                    : req.MovesUsed,
                attempts   = ex.Attempts + 1
            }, JsonOpts);
            (await _http.PatchAsync(
                $"level_progress?user_id=eq.{userId}&level_id=eq.{req.LevelId}",
                new StringContent(body, Encoding.UTF8, "application/json"))).EnsureSuccessStatusCode();
        }
    }

    // -------------------------------------------------------------------------
    // Leaderboard
    // -------------------------------------------------------------------------

    public async Task<List<LeaderboardEntry>> GetLeaderboardAsync(string league)
    {
        var response = await _http.GetAsync(
            $"leaderboard?league=eq.{Uri.EscapeDataString(league)}&order=weekly_score.desc&limit=100");
        response.EnsureSuccessStatusCode();
        var entries = JsonSerializer.Deserialize<List<LeaderboardEntry>>(
            await response.Content.ReadAsStringAsync(), JsonOpts) ?? [];

        // Compute RANK() OVER behavior: ties share same rank, next rank skips
        int rank = 1;
        for (int i = 0; i < entries.Count; i++)
        {
            if (i > 0 && entries[i].WeeklyScore < entries[i - 1].WeeklyScore)
                rank = i + 1;
            entries[i].Rank = rank;
        }

        return entries;
    }

    public async Task SubmitScoreAsync(Guid userId, string username, int points)
    {
        var getResp = await _http.GetAsync($"leaderboard?user_id=eq.{userId}");
        getResp.EnsureSuccessStatusCode();
        var existing = JsonSerializer.Deserialize<List<LeaderboardEntry>>(
            await getResp.Content.ReadAsStringAsync(), JsonOpts) ?? [];

        if (existing.Count == 0)
        {
            var body = JsonSerializer.Serialize(new
            {
                user_id      = userId,
                username,
                avatar       = "bear",
                weekly_score = points,
                total_score  = points,
                league       = "bronze"
            }, JsonOpts);
            (await _http.PostAsync("leaderboard",
                new StringContent(body, Encoding.UTF8, "application/json"))).EnsureSuccessStatusCode();
        }
        else
        {
            var ex = existing[0];
            var body = JsonSerializer.Serialize(new
            {
                username,
                weekly_score = ex.WeeklyScore + points,
                total_score  = ex.TotalScore  + points
            }, JsonOpts);
            (await _http.PatchAsync($"leaderboard?user_id=eq.{userId}",
                new StringContent(body, Encoding.UTF8, "application/json"))).EnsureSuccessStatusCode();
        }
    }
}
