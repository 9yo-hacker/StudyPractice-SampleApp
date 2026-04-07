using SampleApp.API.Data;
using SampleApp.API.Entities;
using SampleApp.API.Exceptions;
using SampleApp.API.Interfaces;

namespace SampleApp.API.Repositories;

public class UsersRepository(SampleAppContext db, ILogger<UsersRepository> logger) : IUserRepository
{
    public User CreateUser(User user)
    {
        db.Users.Add(user);
        db.SaveChanges();
        logger.LogInformation($"Пользователь {user.Login} создан");
        return user;
    }

    public bool DeleteUser(int id)
    {
        var user = FindUserById(id);
        db.Users.Remove(user);
        db.SaveChanges();
        logger.LogInformation($"Пользователь с id={id} удалён");
        return true;
    }

    public User EditUser(User user, int id)
    {
        FindUserById(id);
        db.Users.Update(user);
        db.SaveChanges();
        logger.LogInformation($"Пользователь с id={id} обновлён");
        return user;
    }

    public User FindUserById(int id)
    {
        var user = db.Users.Find(id);
        return user ?? throw new NotFoundException($"Нет пользователя с id = {id}");
    }

    public User FindUserByLogin(string login)
    {
        var user = db.Users.FirstOrDefault(u => u.Login == login);
        return user ?? throw new NotFoundException($"Нет пользователя с login = {login}");
    }

    public List<User> GetUsers()
    {
        return db.Users.ToList();
    }
}
