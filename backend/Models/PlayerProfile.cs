namespace HexaAway.Api.Models;

public class PlayerProfile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Username { get; set; } = "Player";
    public int Coins { get; set; }
    public int Bombs { get; set; }
    public int Hammers { get; set; }
}

public class UpdateProfileRequest
{
    public string? Username { get; set; }
    public int? Coins { get; set; }
    public int? Bombs { get; set; }
    public int? Hammers { get; set; }
}
