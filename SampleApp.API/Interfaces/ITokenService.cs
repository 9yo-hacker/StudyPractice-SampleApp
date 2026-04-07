namespace SampleApp.API.Interfaces;

public interface ITokenService
{
    string CreateToken(string userLogin);
}
