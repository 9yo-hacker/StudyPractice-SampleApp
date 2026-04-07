using SampleApp.API.Entities;
using SampleApp.API.Models;

namespace SampleApp.API.Interfaces;

public interface IMicropostRepository
{
    Micropost CreateMicropost(Micropost micropost);
    List<Micropost> GetMicroposts();
    List<Micropost> GetMicroposts(Option opt);
    Micropost EditMicropost(Micropost micropost, int id);
    Micropost DeleteMicropost(int id);
    Micropost FindMicropostById(int id);
}
