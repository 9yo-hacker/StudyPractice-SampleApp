namespace SampleApp.API.Models;

public class ApiResult<T> where T : class
{
    public required int Count { get; set; }
    public int PageSize { get; set; }
    public int PageNumber { get; set; }

    public int TotalPages => (int)Math.Ceiling(Count / (double)PageSize);
    public bool HasNext => PageNumber < TotalPages;
    public bool HasPrevious => PageNumber > 1;

    public required List<T> Data { get; set; }
}
