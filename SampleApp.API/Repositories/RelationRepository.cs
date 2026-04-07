using SampleApp.API.Data;
using SampleApp.API.Entities;
using SampleApp.API.Exceptions;
using SampleApp.API.Interfaces;

namespace SampleApp.API.Repositories;

public class RelationRepository(SampleAppContext db) : IRelationRepository
{
    public bool CreateRelation(Relation relation)
    {
        db.Relations.Add(relation);
        db.SaveChanges();
        return true;
    }

    public bool DeleteRelation(Relation relation)
    {
        db.Relations.Remove(relation);
        db.SaveChanges();
        return true;
    }

    public Relation FindRelation(int followerId, int followedId)
    {
        var relation = db.Relations
            .FirstOrDefault(r => r.FollowerId == followerId && r.FollowedId == followedId);
        return relation ?? throw new NotFoundException($"Подписка не найдена");
    }
}
