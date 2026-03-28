using HexaAway.Api.Models;
using HexaAway.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HexaAway.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LevelsController : ControllerBase
{
    private readonly SupabaseService _supabase;

    public LevelsController(SupabaseService supabase)
    {
        _supabase = supabase;
    }

    // GET /api/levels
    [HttpGet]
    [ProducesResponseType(typeof(List<LevelSummary>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLevels()
    {
        var levels = await _supabase.GetLevelsAsync();
        return Ok(levels);
    }

    // GET /api/levels/{id}
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(Level), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLevel(int id)
    {
        var level = await _supabase.GetLevelByIdAsync(id);

        if (level is null)
            return NotFound(new { message = $"Level {id} not found." });

        return Ok(level);
    }
}
