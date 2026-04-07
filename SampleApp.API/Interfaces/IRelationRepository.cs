using SampleApp.API.Entities;

namespace SampleApp.API.Interfaces;

public interface IRelationRepository
{
    bool CreateRelation(Relation relation);
    bool DeleteRelation(Relation relation);
    Relation FindRelation(int followerId, int followedId);
}
