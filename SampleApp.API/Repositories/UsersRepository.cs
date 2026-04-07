using SampleApp.API.Data;
using SampleApp.API.Entities;
using SampleApp.API.Interfaces;

namespace SampleApp.API.Repositories;

public class UsersRepository(SampleAppContext db) : IUserRepository
{
    public User CreateUser(User user)
    {
        db.Users.Add(user);
        db.SaveChanges();
        return user;
    }

    public bool DeleteUser(int id)
    {
        var user = FindUserById(id);
        db.Users.Remove(user);
        db.SaveChanges();
        return true;
    }

    public User EditUser(User user, int id)
    {
        FindUserById(id);
        db.Users.Update(user);
        db.SaveChanges();
        return user;
    }

    public User FindUserById(int id)
    {
        var user = db.Users.Find(id);
        return user ?? throw new Exception($"Нет пользователя с id = {id}");
    }

    public List<User> GetUsers()
    {
        return db.Users.ToList();
    }
}
