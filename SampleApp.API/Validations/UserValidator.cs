using FluentValidation;
using SampleApp.API.DTOs;

namespace SampleApp.API.Validations;

public class UserValidator : AbstractValidator<LoginDto>
{
    public UserValidator()
    {
        RuleFor(u => u.Login)
            .NotEmpty().WithMessage("Login не может быть пустым")
            .Length(2, 50).WithMessage("Login должен быть от 2 до 50 символов")
            .Must(login => char.IsUpper(login[0])).WithMessage("Login должен начинаться с заглавной буквы");
    }
}
