using HexaAway.Api.Models;
using HexaAway.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HexaAway.Api.Controllers;

[ApiController]
[Route("api/player")]
[Authorize]
public class PlayerController : ControllerBase
{
    private readonly SupabaseService _supabase;

    public PlayerController(SupabaseService supabase)
    {
        _supabase = supabase;
    }

    // GET /api/player/profile
    [HttpGet("profile")]
    [ProducesResponseType(typeof(PlayerProfile), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetProfile()
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Invalid or missing user identity." });

        var profile = await _supabase.GetPlayerProfileAsync(userId);

        // Auto-create profile on first login
        if (profile is null)
            profile = await _supabase.CreatePlayerProfileAsync(userId);

        return Ok(profile);
    }

    // PUT /api/player/profile
    [HttpPut("profile")]
    [ProducesResponseType(typeof(PlayerProfile), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest req)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Invalid or missing user identity." });

        var updated = await _supabase.UpdatePlayerProfileAsync(userId, req);

        if (updated is null)
            return NotFound(new { message = "Player profile not found." });

        return Ok(updated);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /// <summary>
    /// Reads the "sub" claim from the Supabase JWT and parses it as a <see cref="Guid"/>.
    /// Returns <c>false</c> when the claim is absent or not a valid GUID.
    /// </summary>
    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;

        // Supabase stores the user UUID in the standard "sub" claim
        var sub = User.FindFirst("sub")?.Value
               ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(sub))
            return false;

        return Guid.TryParse(sub, out userId);
    }
}
