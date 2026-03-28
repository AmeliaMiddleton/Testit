namespace HexaAway.Api.Models;

public class LevelProgress
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public int LevelId { get; set; }
    public bool Completed { get; set; }
    public int Stars { get; set; }
    public int? BestMoves { get; set; }
    public int Attempts { get; set; }
}

public class SaveProgressRequest
{
    public int LevelId { get; set; }
    public bool Completed { get; set; }
    public int Stars { get; set; }
    public int MovesUsed { get; set; }
}
