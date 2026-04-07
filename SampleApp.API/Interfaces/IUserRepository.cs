using SampleApp.API.Entities;
using SampleApp.API.Models;

namespace SampleApp.API.Interfaces;

public interface IUserRepository
{
    User CreateUser(User user);
    List<User> GetUsers();
    List<User> GetUsers(Option opt);
    User EditUser(User user, int id);
    bool DeleteUser(int id);
    User FindUserById(int id);
    User FindUserByLogin(string login);
    List<User> GetFollowers(int id);
    List<User> GetFolloweds(int id);
}
