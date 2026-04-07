using Microsoft.EntityFrameworkCore;
using SampleApp.API.Entities;

namespace SampleApp.API.Data;

public class SampleAppContext : DbContext
{
    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<Micropost> Microposts { get; set; }
    public DbSet<Relation> Relations { get; set; }

    public SampleAppContext(DbContextOptions<SampleAppContext> opt) : base(opt) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Login).IsUnique();
            entity.Property(e => e.Login).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.PasswordSalt).IsRequired();
            entity.Property(e => e.Token).IsRequired();

            entity.HasOne(e => e.Role)
                  .WithMany()
                  .HasForeignKey(e => e.RoleId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Relation>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.Followed)
                  .WithMany(u => u.FollowedRelations)
                  .HasForeignKey(e => e.FollowedId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Follower)
                  .WithMany(u => u.FollowerRelations)
                  .HasForeignKey(e => e.FollowerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.FollowerId, e.FollowedId }).IsUnique();
            entity.HasIndex(e => e.FollowerId);
            entity.HasIndex(e => e.FollowedId);

            entity.ToTable(t =>
                t.HasCheckConstraint("CK_Relation_SelfFollow", "\"FollowedId\" != \"FollowerId\""));
        });

        modelBuilder.Entity<Micropost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).IsRequired().HasMaxLength(140);

            entity.HasOne(e => e.User)
                  .WithMany(u => u.Microposts)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
