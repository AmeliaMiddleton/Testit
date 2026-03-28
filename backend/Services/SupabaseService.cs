using HexaAway.Api.Models;
using Npgsql;
using System.Text.Json;

namespace HexaAway.Api.Services;

public class SupabaseService
{
    private readonly string _connectionString;

    public SupabaseService(IConfiguration configuration)
    {
        _connectionString = configuration["Supabase:ConnectionString"]
            ?? throw new InvalidOperationException("Supabase connection string not configured");
    }

    // -------------------------------------------------------------------------
    // Levels
    // -------------------------------------------------------------------------

    public async Task<List<LevelSummary>> GetLevelsAsync()
    {
        var levels = new List<LevelSummary>();

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string sql = "SELECT id, name, difficulty, max_moves FROM levels ORDER BY id";
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            levels.Add(new LevelSummary
            {
                Id         = reader.GetInt32(0),
                Name       = reader.GetString(1),
                Difficulty = reader.GetInt32(2),
                MaxMoves   = reader.GetInt32(3)
            });
        }

        return levels;
    }

    public async Task<Level?> GetLevelByIdAsync(int id)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string sql = "SELECT id, name, difficulty, max_moves, board_cells, tiles FROM levels WHERE id = @id";
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("id", id);

        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return null;

        var boardCellsJson = reader.GetString(4);
        var tilesJson      = reader.GetString(5);

        return new Level
        {
            Id         = reader.GetInt32(0),
            Name       = reader.GetString(1),
            Difficulty = reader.GetInt32(2),
            MaxMoves   = reader.GetInt32(3),
            BoardCells = JsonDocument.Parse(boardCellsJson).RootElement,
            Tiles      = JsonDocument.Parse(tilesJson).RootElement
        };
    }

    // -------------------------------------------------------------------------
    // Player Profile
    // -------------------------------------------------------------------------

    public async Task<PlayerProfile?> GetPlayerProfileAsync(Guid userId)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string sql =
            "SELECT id, user_id, username, coins, bombs, hammers " +
            "FROM player_profiles WHERE user_id = @userId";

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("userId", userId);

        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return null;

        return new PlayerProfile
        {
            Id       = reader.GetGuid(0),
            UserId   = reader.GetGuid(1),
            Username = reader.GetString(2),
            Coins    = reader.GetInt32(3),
            Bombs    = reader.GetInt32(4),
            Hammers  = reader.GetInt32(5)
        };
    }

    public async Task<PlayerProfile> CreatePlayerProfileAsync(Guid userId)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string sql =
            "INSERT INTO player_profiles (user_id, username, coins, bombs, hammers) " +
            "VALUES (@userId, 'Player', 0, 0, 0) " +
            "RETURNING id, user_id, username, coins, bombs, hammers";

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("userId", userId);

        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        return new PlayerProfile
        {
            Id       = reader.GetGuid(0),
            UserId   = reader.GetGuid(1),
            Username = reader.GetString(2),
            Coins    = reader.GetInt32(3),
            Bombs    = reader.GetInt32(4),
            Hammers  = reader.GetInt32(5)
        };
    }

    public async Task<PlayerProfile?> UpdatePlayerProfileAsync(Guid userId, UpdateProfileRequest req)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        // Build a dynamic SET clause for only the provided fields
        var setClauses = new List<string>();
        var cmd = new NpgsqlCommand();
        cmd.Connection = conn;

        if (req.Username is not null)
        {
            setClauses.Add("username = @username");
            cmd.Parameters.AddWithValue("username", req.Username);
        }
        if (req.Coins.HasValue)
        {
            setClauses.Add("coins = @coins");
            cmd.Parameters.AddWithValue("coins", req.Coins.Value);
        }
        if (req.Bombs.HasValue)
        {
            setClauses.Add("bombs = @bombs");
            cmd.Parameters.AddWithValue("bombs", req.Bombs.Value);
        }
        if (req.Hammers.HasValue)
        {
            setClauses.Add("hammers = @hammers");
            cmd.Parameters.AddWithValue("hammers", req.Hammers.Value);
        }

        if (setClauses.Count == 0)
            return await GetPlayerProfileAsync(userId);

        cmd.CommandText =
            $"UPDATE player_profiles SET {string.Join(", ", setClauses)} " +
            "WHERE user_id = @userId " +
            "RETURNING id, user_id, username, coins, bombs, hammers";

        cmd.Parameters.AddWithValue("userId", userId);

        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return null;

        return new PlayerProfile
        {
            Id       = reader.GetGuid(0),
            UserId   = reader.GetGuid(1),
            Username = reader.GetString(2),
            Coins    = reader.GetInt32(3),
            Bombs    = reader.GetInt32(4),
            Hammers  = reader.GetInt32(5)
        };
    }

    // -------------------------------------------------------------------------
    // Level Progress
    // -------------------------------------------------------------------------

    public async Task<List<LevelProgress>> GetProgressAsync(Guid userId)
    {
        var progress = new List<LevelProgress>();

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string sql =
            "SELECT id, user_id, level_id, completed, stars, best_moves, attempts " +
            "FROM level_progress WHERE user_id = @userId ORDER BY level_id";

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("userId", userId);

        await using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            progress.Add(new LevelProgress
            {
                Id         = reader.GetInt32(0),
                UserId     = reader.GetGuid(1),
                LevelId    = reader.GetInt32(2),
                Completed  = reader.GetBoolean(3),
                Stars      = reader.GetInt32(4),
                BestMoves  = reader.IsDBNull(5) ? null : reader.GetInt32(5),
                Attempts   = reader.GetInt32(6)
            });
        }

        return progress;
    }

    public async Task SaveProgressAsync(Guid userId, SaveProgressRequest req)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        // Upsert: update stars/best_moves only if they are better than existing values
        const string sql = """
            INSERT INTO level_progress (user_id, level_id, completed, stars, best_moves, attempts)
            VALUES (@userId, @levelId, @completed, @stars, @movesUsed, 1)
            ON CONFLICT (user_id, level_id) DO UPDATE SET
                completed  = level_progress.completed OR EXCLUDED.completed,
                stars      = GREATEST(level_progress.stars, EXCLUDED.stars),
                best_moves = CASE
                                 WHEN level_progress.best_moves IS NULL THEN EXCLUDED.best_moves
                                 ELSE LEAST(level_progress.best_moves, EXCLUDED.best_moves)
                             END,
                attempts   = level_progress.attempts + 1
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("userId",    userId);
        cmd.Parameters.AddWithValue("levelId",   req.LevelId);
        cmd.Parameters.AddWithValue("completed", req.Completed);
        cmd.Parameters.AddWithValue("stars",     req.Stars);
        cmd.Parameters.AddWithValue("movesUsed", req.MovesUsed);

        await cmd.ExecuteNonQueryAsync();
    }

    // -------------------------------------------------------------------------
    // Leaderboard
    // -------------------------------------------------------------------------

    public async Task<List<LeaderboardEntry>> GetLeaderboardAsync(string league)
    {
        var entries = new List<LeaderboardEntry>();

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string sql = """
            SELECT id, user_id, username, avatar, weekly_score, total_score, league,
                   RANK() OVER (ORDER BY weekly_score DESC) AS rank
            FROM leaderboard
            WHERE league = @league
            ORDER BY weekly_score DESC
            LIMIT 100
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("league", league);

        await using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            entries.Add(new LeaderboardEntry
            {
                Id          = reader.GetInt32(0),
                UserId      = reader.GetGuid(1),
                Username    = reader.GetString(2),
                Avatar      = reader.GetString(3),
                WeeklyScore = reader.GetInt32(4),
                TotalScore  = reader.GetInt32(5),
                League      = reader.GetString(6),
                Rank        = (int)reader.GetInt64(7)
            });
        }

        return entries;
    }

    public async Task SubmitScoreAsync(Guid userId, string username, int points)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        // Upsert leaderboard row, incrementing both weekly and total score
        const string sql = """
            INSERT INTO leaderboard (user_id, username, avatar, weekly_score, total_score, league)
            VALUES (@userId, @username, 'bear', @points, @points, 'bronze')
            ON CONFLICT (user_id) DO UPDATE SET
                username     = EXCLUDED.username,
                weekly_score = leaderboard.weekly_score + EXCLUDED.weekly_score,
                total_score  = leaderboard.total_score  + EXCLUDED.total_score
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("userId",   userId);
        cmd.Parameters.AddWithValue("username", username);
        cmd.Parameters.AddWithValue("points",   points);

        await cmd.ExecuteNonQueryAsync();
    }
}
