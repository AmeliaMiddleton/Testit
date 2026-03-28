using HexaAway.Api.Models;
using HexaAway.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HexaAway.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProgressController : ControllerBase
{
    private readonly SupabaseService _supabase;

    // Coins awarded per star earned on completion
    private const int CoinsPerStar = 10;

    public ProgressController(SupabaseService supabase)
    {
        _supabase = supabase;
    }

    // GET /api/progress
    [HttpGet]
    [ProducesResponseType(typeof(List<LevelProgress>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetProgress()
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Invalid or missing user identity." });

        var progress = await _supabase.GetProgressAsync(userId);
        return Ok(progress);
    }

    // POST /api/progress
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SaveProgress([FromBody] SaveProgressRequest req)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Invalid or missing user identity." });

        if (req.LevelId <= 0)
            return BadRequest(new { message = "LevelId must be a positive integer." });

        if (req.Stars < 0 || req.Stars > 3)
            return BadRequest(new { message = "Stars must be between 0 and 3." });

        // Persist the progress
        await _supabase.SaveProgressAsync(userId, req);

        // Award coins for completing the level
        if (req.Completed && req.Stars > 0)
        {
            var coinsEarned = req.Stars * CoinsPerStar;

            // Fetch existing profile so we can add to the current balance
            var profile = await _supabase.GetPlayerProfileAsync(userId);
            if (profile is not null)
            {
                var updateReq = new UpdateProfileRequest
                {
                    Coins = profile.Coins + coinsEarned
                };
                await _supabase.UpdatePlayerProfileAsync(userId, updateReq);
            }
        }

        return Ok(new { message = "Progress saved successfully." });
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
