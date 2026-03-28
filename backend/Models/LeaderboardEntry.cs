namespace HexaAway.Api.Models;

public class LeaderboardEntry
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string Username { get; set; } = "";
    public string Avatar { get; set; } = "bear";
    public int WeeklyScore { get; set; }
    public int TotalScore { get; set; }
    public string League { get; set; } = "bronze";
    public int Rank { get; set; }
}

public class SubmitScoreRequest
{
    public int Points { get; set; }
}
