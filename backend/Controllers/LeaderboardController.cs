using HexaAway.Api.Models;
using HexaAway.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HexaAway.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LeaderboardController : ControllerBase
{
    private readonly SupabaseService _supabase;

    private static readonly string[] ValidLeagues = ["bronze", "silver", "gold", "diamond"];

    public LeaderboardController(SupabaseService supabase)
    {
        _supabase = supabase;
    }

    // GET /api/leaderboard?league=bronze
    [HttpGet]
    [ProducesResponseType(typeof(List<LeaderboardEntry>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetLeaderboard([FromQuery] string league = "bronze")
    {
        var normalised = league.Trim().ToLowerInvariant();

        if (!ValidLeagues.Contains(normalised))
            return BadRequest(new { message = $"Invalid league. Valid values: {string.Join(", ", ValidLeagues)}." });

        var entries = await _supabase.GetLeaderboardAsync(normalised);
        return Ok(entries);
    }

    // POST /api/leaderboard/score
    [HttpPost("score")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SubmitScore([FromBody] SubmitScoreRequest req)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Invalid or missing user identity." });

        if (req.Points <= 0)
            return BadRequest(new { message = "Points must be a positive integer." });

        // Resolve the username from the player's profile (fall back to "Player")
        var profile  = await _supabase.GetPlayerProfileAsync(userId);
        var username = profile?.Username ?? "Player";

        await _supabase.SubmitScoreAsync(userId, username, req.Points);

        return Ok(new { message = "Score submitted successfully." });
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;

        var sub = User.FindFirst("sub")?.Value
               ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(sub))
            return false;

        return Guid.TryParse(sub, out userId);
    }
}
