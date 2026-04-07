using Microsoft.EntityFrameworkCore;
using SampleApp.API.Data;
using SampleApp.API.Entities;
using SampleApp.API.Exceptions;
using SampleApp.API.Interfaces;
using SampleApp.API.Models;

namespace SampleApp.API.Repositories;

public class MicropostRepository(SampleAppContext db) : IMicropostRepository
{
    public Micropost CreateMicropost(Micropost micropost)
    {
        db.Microposts.Add(micropost);
        db.SaveChanges();
        return micropost;
    }

    public Micropost DeleteMicropost(int id)
    {
        var micropost = FindMicropostById(id);
        db.Microposts.Remove(micropost);
        db.SaveChanges();
        return micropost;
    }

    public Micropost EditMicropost(Micropost micropost, int id)
    {
        var existing = FindMicropostById(id);
        existing.Content = micropost.Content;
        existing.UpdatedAt = DateTime.UtcNow;
        db.SaveChanges();
        return existing;
    }

    public Micropost FindMicropostById(int id)
    {
        var micropost = db.Microposts.Find(id);
        return micropost ?? throw new NotFoundException($"Нет сообщения с id = {id}");
    }

    public List<Micropost> GetMicroposts()
    {
        return db.Microposts.ToList();
    }

    public List<Micropost> GetMicroposts(Option opt)
    {
        return db.Microposts
            .AsNoTracking()
            .OrderBy(m => m.CreatedAt)
            .Skip((opt.PageNumber - 1) * opt.PageSize)
            .Take(opt.PageSize)
            .ToList();
    }
}
