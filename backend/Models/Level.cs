using System.Text.Json;

namespace HexaAway.Api.Models;

public class Level
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int Difficulty { get; set; }
    public int MaxMoves { get; set; }
    public JsonElement BoardCells { get; set; }
    public JsonElement Tiles { get; set; }
}

public class LevelSummary
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int Difficulty { get; set; }
    public int MaxMoves { get; set; }
}
