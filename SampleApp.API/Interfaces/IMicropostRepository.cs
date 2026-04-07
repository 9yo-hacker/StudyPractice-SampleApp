using SampleApp.API.Entities;

namespace SampleApp.API.Interfaces;

public interface IMicropostRepository
{
    Micropost CreateMicropost(Micropost micropost);
    List<Micropost> GetMicroposts();
    Micropost EditMicropost(Micropost micropost, int id);
    Micropost DeleteMicropost(int id);
    Micropost FindMicropostById(int id);
}
