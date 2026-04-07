namespace SampleApp.API.Entities;

public class User : Base
{
    public string Name { get; set; } = string.Empty;
    public string Login { get; set; } = string.Empty;
    public required byte[] PasswordHash { get; set; }
    public required byte[] PasswordSalt { get; set; }
    public string Token { get; set; } = string.Empty;

    public int RoleId { get; set; } = (int)RoleType.User;
    public Role? Role { get; set; }
    public IEnumerable<Micropost>? Microposts { get; set; }
    public IEnumerable<Relation>? FollowedRelations { get; set; }
    public IEnumerable<Relation>? FollowerRelations { get; set; }
}
