namespace SampleApp.API.Entities;

public class Micropost : Base
{
    public string Content { get; set; } = string.Empty;
    public User? User { get; set; }
    public int UserId { get; set; }
}
